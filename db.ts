// import Database from "better-sqlite3";
// import mysql from 'mysql2/promise'
import pg from 'pg'
import dotenv from 'dotenv'

const { Pool } = pg

// Load .env.local (has higher priority for local settings), then fall back to .env
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const dbType = process.env.DB_TYPE || 'sqlite' // "sqlite" | "mysql" | "postgres" | "postgresql" | "supabase"
const isMySQL = dbType === 'mysql'
const isPostgres = dbType === 'postgres' || dbType === 'postgresql' || dbType === 'supabase'

let sqliteDb: any = null
let pool: any = null
let pgPool: any = null

if (isPostgres) {
  console.log('Initializing Supabase/PostgreSQL database connection...')
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (connectionString) {
    pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  } else {
    pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'postgres',
      port: Number(process.env.DB_PORT || 5432),
      ssl: { rejectUnauthorized: false },
    })
  }
}
// else if (isMySQL) {
//   console.log('Initializing MySQL database connection...')
//   pool = mysql.createPool({
//     host: process.env.DB_HOST || 'localhost',
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASSWORD || '',
//     database: process.env.DB_NAME || 'service_db',
//     port: Number(process.env.DB_PORT || 3306),
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//     multipleStatements: true,
//   })
// } else {
//   console.log('Initializing SQLite database connection (fallback/default)...')
//   sqliteDb = new Database('database.sqlite')
// }

const camelKeysMap: Record<string, string> = {
  displayname: 'displayName',
  isactive: 'isActive',
  createdat: 'createdAt',
  updatedat: 'updatedAt',
  stocklevel: 'stockLevel',
  minstockalert: 'minStockAlert',
  buyprice: 'buyPrice',
  sellprice: 'sellPrice',
  customerid: 'customerId',
  customername: 'customerName',
  devicemodel: 'deviceModel',
  technicianid: 'technicianId',
  technicianname: 'technicianName',
  estimatedcost: 'estimatedCost',
  finalcost: 'finalCost',
  partsused: 'partsUsed',
  conditionphotos: 'conditionPhotos',
  resultphotos: 'resultPhotos',
  warrantyexpiry: 'warrantyExpiry',
  warrantyduration: 'warrantyDuration',
  iswarrantyclaim: 'isWarrantyClaim',
  originalticketid: 'originalTicketId',
  repairhistory: 'repairHistory',
  totalamount: 'totalAmount',
  paymentmethod: 'paymentMethod',
  ticketid: 'ticketId',
}

function normalizeRow(row: any): any {
  if (!row || typeof row !== 'object') return row
  const newRow: any = {}
  for (const key of Object.keys(row)) {
    const canonicalKey = camelKeysMap[key.toLowerCase()] || key
    newRow[canonicalKey] = row[key]
  }
  return newRow
}

function normalizeRows(rows: any): any {
  if (!isPostgres) return rows
  if (!rows) return rows
  if (Array.isArray(rows)) {
    return rows.map(normalizeRow)
  }
  return normalizeRow(rows)
}

function translateSql(sql: string): string {
  if (!isPostgres) return sql
  let index = 1
  let translated = sql.replace(/\?/g, () => `$${index++}`)
  translated = translated.replace(/\bDATETIME\b/gi, 'TIMESTAMP')
  return translated
}

export const db = {
  isMySQL,
  isPostgres,

  async exec(statement: string): Promise<void> {
    if (isPostgres) {
      const client = await pgPool.connect()
      try {
        await client.query(translateSql(statement))
      } finally {
        client.release()
      }
    } else if (isMySQL) {
      const connection = await pool.getConnection()
      try {
        await connection.query(statement)
      } finally {
        connection.release()
      }
    } else {
      sqliteDb.exec(statement)
    }
  },

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (isPostgres) {
      const result = await pgPool.query(translateSql(sql), params)
      return normalizeRows(result.rows) as T[]
    } else if (isMySQL) {
      const [rows] = await pool.execute(sql, params)
      return rows as T[]
    } else {
      return sqliteDb.prepare(sql).all(...params) as T[]
    }
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    if (isPostgres) {
      const result = await pgPool.query(translateSql(sql), params)
      const rows = normalizeRows(result.rows)
      return rows.length > 0 ? (rows[0] as T) : null
    } else if (isMySQL) {
      const [rows] = await pool.execute(sql, params)
      const arr = rows as T[]
      return arr.length > 0 ? arr[0] : null
    } else {
      return (sqliteDb.prepare(sql).get(...params) as T) || null
    }
  },

  async run(sql: string, params: any[] = []): Promise<{ lastInsertId?: any; affectedRows?: number }> {
    if (isPostgres) {
      const result = await pgPool.query(translateSql(sql), params)
      return {
        affectedRows: result.rowCount || 0,
      }
    } else if (isMySQL) {
      const [result] = await pool.execute(sql, params)
      const res = result as any
      return {
        lastInsertId: res.insertId,
        affectedRows: res.affectedRows,
      }
    } else {
      const info = sqliteDb.prepare(sql).run(...params)
      return {
        lastInsertId: info.lastInsertRowid,
        affectedRows: info.changes,
      }
    }
  },

  async transaction<T>(fn: (dbRef: any) => Promise<T>): Promise<T> {
    if (isPostgres) {
      const client = await pgPool.connect()
      try {
        await client.query('BEGIN')
        const scopedDb = {
          async query(sql: string, params: any[] = []) {
            const result = await client.query(translateSql(sql), params)
            return normalizeRows(result.rows)
          },
          async get(sql: string, params: any[] = []) {
            const result = await client.query(translateSql(sql), params)
            const rows = normalizeRows(result.rows)
            return rows.length > 0 ? rows[0] : null
          },
          async run(sql: string, params: any[] = []) {
            const result = await client.query(translateSql(sql), params)
            return { affectedRows: result.rowCount || 0 }
          },
        }
        const result = await fn(scopedDb)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } else if (isMySQL) {
      const connection = await pool.getConnection()
      try {
        await connection.beginTransaction()
        const scopedDb = {
          async query(sql: string, params: any[] = []) {
            const [rows] = await connection.execute(sql, params)
            return rows
          },
          async get(sql: string, params: any[] = []) {
            const [rows] = await connection.execute(sql, params)
            const arr = rows as any[]
            return arr.length > 0 ? arr[0] : null
          },
          async run(sql: string, params: any[] = []) {
            const [result] = await connection.execute(sql, params)
            const res = result as any
            return { lastInsertId: res.insertId, affectedRows: res.affectedRows }
          },
        }
        const result = await fn(scopedDb)
        await connection.commit()
        return result
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } else {
      let result: T
      sqliteDb.prepare('BEGIN').run()
      try {
        const scopedDb = {
          async query(sql: string, params: any[] = []) {
            return sqliteDb.prepare(sql).all(...params)
          },
          async get(sql: string, params: any[] = []) {
            return sqliteDb.prepare(sql).get(...params)
          },
          async run(sql: string, params: any[] = []) {
            const info = sqliteDb.prepare(sql).run(...params)
            return { lastInsertId: info.lastInsertRowid, affectedRows: info.changes }
          },
        }
        result = await fn(scopedDb)
        sqliteDb.prepare('COMMIT').run()
        return result
      } catch (error) {
        try {
          sqliteDb.prepare('ROLLBACK').run()
        } catch (_) {}
        throw error
      }
    }
  },
}
