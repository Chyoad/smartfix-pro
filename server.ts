import express from 'express'
import path from 'path'
import cors from 'cors'
import { db } from './db.js'

async function initDatabase() {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255),
        displayName VARCHAR(255),
        role VARCHAR(50),
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        sku VARCHAR(100),
        barcode VARCHAR(100),
        category VARCHAR(100),
        stockLevel INTEGER,
        minStockAlert INTEGER,
        buyPrice INTEGER,
        sellPrice INTEGER,
        warehouse VARCHAR(100),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(255) PRIMARY KEY,
        customerId VARCHAR(255),
        customerName VARCHAR(255),
        deviceModel VARCHAR(255),
        imei VARCHAR(255),
        problem TEXT,
        diagnosis TEXT,
        status VARCHAR(50),
        technicianId VARCHAR(255),
        technicianName VARCHAR(255),
        estimatedCost INTEGER,
        finalCost INTEGER,
        partsUsed TEXT,
        conditionPhotos TEXT,
        resultPhotos TEXT,
        warrantyExpiry VARCHAR(100),
        warrantyDuration INTEGER,
        isWarrantyClaim INTEGER DEFAULT 0,
        originalTicketId VARCHAR(255),
        repairHistory TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50),
        description TEXT,
        amount INTEGER,
        totalAmount INTEGER,
        category VARCHAR(100),
        paymentMethod VARCHAR(50),
        items TEXT,
        ticketId VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch (err) {
    console.warn('Table verification warning (might be already setup or version specific):', err)
  }

  // Column Migrations
  try {
    await db.exec('ALTER TABLE tickets ADD COLUMN repairHistory TEXT')
  } catch (e) {}
  try {
    await db.exec('ALTER TABLE tickets ADD COLUMN warrantyDuration INTEGER')
  } catch (e) {}
  try {
    await db.exec('ALTER TABLE tickets ADD COLUMN isWarrantyClaim INTEGER DEFAULT 0')
  } catch (e) {}
  try {
    await db.exec('ALTER TABLE tickets ADD COLUMN originalTicketId VARCHAR(255)')
  } catch (e) {}

  // Seed default Admin
  try {
    const adminCount = await db.get("SELECT count(*) as count FROM users WHERE role = 'admin'")
    if (!adminCount || adminCount.count === 0) {
      await db.run('INSERT INTO users (uid, email, displayName, role) VALUES (?, ?, ?, ?)', ['admin-root', 'admin@service.com', 'Administrator', 'admin'])
    }
  } catch (err) {
    console.error('Failed to seed admin:', err)
  }
}

export const app = express()

async function startServer() {
  // Setup tables and schema first
  await initDatabase()

  const PORT = 3000

  app.use(cors())
  app.use(express.json())

  // API Routes

  const sanitize = (val: any) => (val === undefined ? null : val)

  // System
  app.post('/api/system/reset', async (req, res) => {
    try {
      await db.exec('DELETE FROM tickets')
      await db.exec('DELETE FROM transactions')
      res.json({ success: true })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  // Users
  app.get('/api/users', async (req, res) => {
    try {
      const users = await db.query('SELECT * FROM users ORDER BY displayName ASC')
      res.json(users)
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/users', async (req, res) => {
    try {
      const { uid, email, displayName, role, isActive } = req.body
      const id = uid || Math.random().toString(36).substr(2, 9)
      await db.run('INSERT INTO users (uid, email, displayName, role, isActive) VALUES (?, ?, ?, ?, ?)', [id, sanitize(email), sanitize(displayName), sanitize(role), isActive ? 1 : 0])
      res.json({ id, ...req.body })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  // Inventory
  app.get('/api/inventory', async (req, res) => {
    try {
      const items = await db.query('SELECT * FROM inventory ORDER BY name ASC')
      res.json(items)
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/inventory', async (req, res) => {
    try {
      const { id, name, sku, barcode, category, stockLevel, minStockAlert, buyPrice, sellPrice, warehouse } = req.body
      const itemId = id || Math.random().toString(36).substr(2, 9)
      await db.run(
        `
        INSERT INTO inventory (id, name, sku, barcode, category, stockLevel, minStockAlert, buyPrice, sellPrice, warehouse)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [itemId, sanitize(name), sanitize(sku), sanitize(barcode), sanitize(category), sanitize(stockLevel), sanitize(minStockAlert), sanitize(buyPrice), sanitize(sellPrice), sanitize(warehouse)],
      )
      res.json({ id: itemId, ...req.body })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.put('/api/inventory/:id', async (req, res) => {
    try {
      const data = req.body
      const id = req.params.id

      const existing = await db.get('SELECT * FROM inventory WHERE id = ?', [id])
      if (!existing) return res.status(404).json({ error: 'Item not found' })

      const updated = { ...existing, ...data }

      await db.run(
        `
        UPDATE inventory SET 
          name = ?, sku = ?, barcode = ?, category = ?, 
          stockLevel = ?, minStockAlert = ?, buyPrice = ?, 
          text = stockLevel, sellPrice = ?, warehouse = ?
        WHERE id = ?
      `.replace('text = stockLevel,', ''),
        [
          // Quick fix/cleanup
          updated.name,
          updated.sku,
          updated.barcode,
          updated.category,
          updated.stockLevel,
          updated.minStockAlert,
          updated.buyPrice,
          updated.sellPrice,
          updated.warehouse,
          id,
        ],
      )
      res.json({ success: true, item: updated })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.delete('/api/inventory/:id', async (req, res) => {
    try {
      const id = req.params.id

      // Check if used in tickets
      const tickets = await db.query('SELECT partsUsed FROM tickets')
      const usedInTickets = tickets.some((t: any) => {
        const parts = JSON.parse(t.partsUsed || '[]')
        return parts.some((p: any) => p.id === id)
      })

      if (usedInTickets) {
        return res.status(400).json({ error: 'Item sedang digunakan dalam tiket servis dan tidak bisa dihapus.' })
      }

      // Check if used in transactions
      const transactions = await db.query('SELECT items FROM transactions')
      const usedInTransactions = transactions.some((tx: any) => {
        const items = JSON.parse(tx.items || '[]')
        return items.some((i: any) => i.id === id)
      })

      if (usedInTransactions) {
        return res.status(400).json({ error: 'Item memiliki riwayat transaksi dan tidak bisa dihapus.' })
      }

      await db.run('DELETE FROM inventory WHERE id = ?', [id])
      res.json({ success: true })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  // Tickets
  app.get('/api/tickets', async (req, res) => {
    try {
      const tickets = await db.query('SELECT * FROM tickets ORDER BY createdAt DESC')
      res.json(
        tickets.map((t: any) => ({
          ...t,
          partsUsed: t.partsUsed ? JSON.parse(t.partsUsed) : [],
          conditionPhotos: t.conditionPhotos ? JSON.parse(t.conditionPhotos) : [],
          resultPhotos: t.resultPhotos ? JSON.parse(t.resultPhotos) : [],
          repairHistory: t.repairHistory ? JSON.parse(t.repairHistory) : [],
        })),
      )
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/tickets', async (req, res) => {
    try {
      const data = req.body
      const id = data.id || 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase()
      await db.run(
        `
        INSERT INTO tickets (id, customerId, customerName, deviceModel, imei, problem, diagnosis, status, technicianId, technicianName, estimatedCost, finalCost, partsUsed, conditionPhotos, resultPhotos, warrantyExpiry, warrantyDuration, isWarrantyClaim, originalTicketId, repairHistory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          sanitize(data.customerId),
          sanitize(data.customerName),
          sanitize(data.deviceModel),
          sanitize(data.imei),
          sanitize(data.problem),
          sanitize(data.diagnosis),
          sanitize(data.status),
          sanitize(data.technicianId),
          sanitize(data.technicianName),
          sanitize(data.estimatedCost),
          sanitize(data.finalCost),
          JSON.stringify(data.partsUsed || []),
          JSON.stringify(data.conditionPhotos || []),
          JSON.stringify(data.resultPhotos || []),
          sanitize(data.warrantyExpiry),
          sanitize(data.warrantyDuration),
          data.isWarrantyClaim ? 1 : 0,
          sanitize(data.originalTicketId),
          JSON.stringify(data.repairHistory || []),
        ],
      )
      res.json({ id, ...data })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.put('/api/tickets/:id', async (req, res) => {
    try {
      const data = req.body
      const id = req.params.id
      const existing = await db.get('SELECT * FROM tickets WHERE id = ?', [id])
      if (!existing) return res.status(404).json({ error: 'Not found' })

      const oldParts = existing.partsUsed ? JSON.parse(existing.partsUsed) : []
      const newParts = data.partsUsed || oldParts

      // Wrap in transaction for atomicity
      const result = await db.transaction(async (scopedDb) => {
        // 1. Reconcile stock
        // Add back old parts used
        for (const part of oldParts) {
          await scopedDb.run('UPDATE inventory SET stockLevel = stockLevel + ? WHERE id = ?', [part.quantity, part.id])
        }
        // Deduct new parts used
        for (const part of newParts) {
          const invItem = await scopedDb.get('SELECT stockLevel FROM inventory WHERE id = ?', [part.id])
          if (invItem) {
            await scopedDb.run('UPDATE inventory SET stockLevel = stockLevel - ? WHERE id = ?', [part.quantity, part.id])
          }
        }

        // 2. Update ticket
        const parsedExisting = {
          ...existing,
          partsUsed: oldParts,
          conditionPhotos: existing.conditionPhotos ? JSON.parse(existing.conditionPhotos) : [],
          resultPhotos: existing.resultPhotos ? JSON.parse(existing.resultPhotos) : [],
          repairHistory: existing.repairHistory ? JSON.parse(existing.repairHistory) : [],
        }

        const updated = { ...parsedExisting, ...data, updatedAt: new Date().toISOString() }
        await scopedDb.run(
          `
          UPDATE tickets SET 
            status = ?, diagnosis = ?, technicianId = ?, technicianName = ?, 
            estimatedCost = ?, finalCost = ?, partsUsed = ?, warrantyExpiry = ?, 
            warrantyDuration = ?, isWarrantyClaim = ?, originalTicketId = ?, 
            updatedAt = ?, resultPhotos = ?, repairHistory = ?
          WHERE id = ?
        `,
          [updated.status, updated.diagnosis, updated.technicianId, updated.technicianName, updated.estimatedCost, updated.finalCost, JSON.stringify(updated.partsUsed || []), updated.warrantyExpiry, updated.warrantyDuration, updated.isWarrantyClaim ? 1 : 0, sanitize(updated.originalTicketId), updated.updatedAt, JSON.stringify(updated.resultPhotos || []), JSON.stringify(updated.repairHistory || []), id],
        )
        return updated
      })

      res.json(result)
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.delete('/api/tickets/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM tickets WHERE id = ?', [req.params.id])
      res.json({ success: true })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  // Transactions
  app.get('/api/transactions', async (req, res) => {
    try {
      const txs = await db.query('SELECT * FROM transactions ORDER BY createdAt DESC')
      res.json(
        txs.map((t: any) => ({
          ...t,
          items: t.items ? JSON.parse(t.items) : [],
        })),
      )
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/checkout', async (req, res) => {
    const { items, totalAmount, paymentMethod, cashierId, tax } = req.body

    try {
      const id = await db.transaction(async (scopedDb) => {
        // 1. Update stocks
        for (const cartItem of items) {
          const product = await scopedDb.get('SELECT stockLevel FROM inventory WHERE id = ?', [cartItem.id])
          if (!product) throw new Error(`${cartItem.name} not found`)
          if (product.stockLevel < cartItem.quantity) throw new Error(`Insufficient stock for ${cartItem.name}`)

          await scopedDb.run('UPDATE inventory SET stockLevel = stockLevel - ? WHERE id = ?', [cartItem.quantity, cartItem.id])
        }

        // 2. Create transaction
        const id = 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase()
        await scopedDb.run(
          `
          INSERT INTO transactions (id, type, totalAmount, paymentMethod, items)
          VALUES (?, 'sale', ?, ?, ?)
        `,
          [id, sanitize(totalAmount), sanitize(paymentMethod), JSON.stringify(items)],
        )

        return id
      })

      res.json({ success: true, id })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  app.post('/api/transactions', async (req, res) => {
    try {
      const data = req.body
      const id = data.id || 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase()
      await db.run(
        `
        INSERT INTO transactions (id, type, description, amount, totalAmount, category, paymentMethod, items, ticketId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [id, sanitize(data.type), sanitize(data.description), sanitize(data.amount), sanitize(data.totalAmount), sanitize(data.category), sanitize(data.paymentMethod), JSON.stringify(data.items || []), sanitize(data.ticketId)],
      )
      res.json({ id, ...data })
    } catch (e: any) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })

  // Vite middleware for development (skip on Vercel)
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      const viteModuleName = 'vite'
      const { createServer: createViteServerFn } = await import(viteModuleName)
      const vite = await createViteServerFn({
        server: { middlewareMode: true },
        appType: 'spa',
      })
      app.use(vite.middlewares)
    } else {
      const distPath = path.join(process.cwd(), 'dist')
      app.use(express.static(distPath))
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'))
      })
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  }
}

startServer()
