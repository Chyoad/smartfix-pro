import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download,
  Filter,
  FileText,
  CreditCard,
  Banknote,
  QrCode,
  X,
  Wrench,
  ShoppingCart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

export default function Reports() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expense, setExpense] = useState({ description: '', amount: 0, category: 'Utilitas' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txData, ticketData] = await Promise.all([
        api.transactions.list(),
        api.tickets.list()
      ]);
      setTransactions(txData);
      setTickets(ticketData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.transactions.create({
        type: 'expense',
        ...expense,
        totalAmount: -Math.abs(Number(expense.amount)),
      });
      setShowExpenseModal(false);
      setExpense({ description: '', amount: 0, category: 'Utilitas' });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const serviceRevenue = transactions.filter(t => t.type === 'service').reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const retailSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.totalAmount || 0), 0);
  
  const techPerformance = tickets.reduce((acc: any, t) => {
    if (t.status === 'delivered') {
      const techName = t.technicianName || 'Tanpa Nama';
      if (!acc[techName]) acc[techName] = { count: 0, revenue: 0 };
      acc[techName].count += 1;
      acc[techName].revenue += (t.finalCost || 0);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Laporan Keuangan</h1>
          <p className="text-slate-500 mt-1">Buku besar konsolidasi dan analitika performa.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 font-bold rounded-xl border border-red-100 shadow-sm hover:bg-red-50 transition-all"
          >
            <TrendingDown className="w-4 h-4" />
            Tambah Pengeluaran
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">
            <Download className="w-4 h-4" />
            Ekspor Laporan
          </button>
        </div>
      </header>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportCard 
          title="Pendapatan Servis" 
          value={formatCurrency(serviceRevenue)} 
          trend="+18.5%" 
          positive 
          icon={Wrench} 
        />
        <ReportCard 
          title="Penjualan Retail" 
          value={formatCurrency(retailSales)} 
          trend="+9.2%" 
          positive 
          icon={ShoppingCart} 
        />
        <ReportCard 
          title="Total Pengeluaran" 
          value={formatCurrency(expenses)} 
          trend="+12.1%" 
          positive={false} 
          icon={TrendingDown} 
        />
        <ReportCard 
          title="Saldo Bersih" 
          value={formatCurrency(totalRevenue)} 
          trend="+5.4%" 
          positive 
          icon={TrendingUp} 
        />
      </div>

      {/* Revenue Chart and Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Arus Pendapatan</h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                Produk
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                Servis
              </span>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transactions.slice(0, 20).map(t => ({ 
                name: new Date(t.createdAt).toLocaleDateString(), 
                retail: t.type === 'sale' ? t.totalAmount : 0,
                service: t.type === 'service' ? t.totalAmount : 0
              })).reverse()}>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="retail" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Area type="monotone" dataKey="service" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technician Performance */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Performa Teknisi</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Delivered Only</span>
          </div>
          <div className="space-y-6">
            {Object.entries(techPerformance).map(([name, data]: [string, any]) => (
              <div key={name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{data.count} Servis Selesai</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{formatCurrency(data.revenue)}</p>
                  <p className="text-[9px] font-bold text-green-500 uppercase">Gaji/Bonus: {formatCurrency(data.revenue * 0.1)}</p>
                </div>
              </div>
            ))}
            {Object.keys(techPerformance).length === 0 && (
              <div className="py-8 text-center text-slate-400 italic text-sm">
                Belum ada data performa teknisi.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Metode Pembayaran</h3>
          <div className="space-y-6">
            <PaymentMixItem label="Tunai" amount={transactions.filter(t => t.paymentMethod === 'cash').reduce((s,t) => s+t.totalAmount, 0)} percentage={40} icon={Banknote} color="bg-green-50 text-green-600" />
            <PaymentMixItem label="Digital (QRIS)" amount={transactions.filter(t => t.paymentMethod === 'qris').reduce((s,t) => s+t.totalAmount, 0)} percentage={35} icon={QrCode} color="bg-blue-50 text-blue-600" />
            <PaymentMixItem label="Transfer Bank" amount={transactions.filter(t => t.paymentMethod === 'transfer').reduce((s,t) => s+t.totalAmount, 0)} percentage={25} icon={CreditCard} color="bg-indigo-50 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="text-lg font-bold text-slate-800">Buku Besar Transaksi</h3>
           <div className="flex gap-2">
             <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
               <Filter className="w-5 h-5" />
             </button>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-8 py-5">ID TX</th>
                <th className="px-8 py-5">Tanggal</th>
                <th className="px-8 py-5">Kategori</th>
                <th className="px-8 py-5">Pembayaran</th>
                <th className="px-8 py-5 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-5 font-mono text-xs text-blue-600">#{tx.id.slice(-8).toUpperCase()}</td>
                  <td className="px-8 py-5 text-sm text-slate-600">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-1 rounded-md w-fit",
                        tx.type === 'sale' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>{tx.type}</span>
                      {tx.type === 'expense' && <span className="text-xs mt-1 text-slate-500">{tx.description}</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{tx.paymentMethod || 'Manual'}</span>
                  </td>
                  <td className={cn(
                    "px-8 py-5 text-right font-black",
                    tx.type === 'expense' ? "text-red-600" : "text-slate-900"
                  )}>{formatCurrency(tx.totalAmount)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                    Belum ada transaksi tercatat pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowExpenseModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Catat Pengeluaran</h2>
                <button onClick={() => setShowExpenseModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Deskripsi Pengeluaran</label>
                  <input required value={expense.description} onChange={e => setExpense({...expense, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="cth., Listrik Bulanan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Jumlah (Rp)</label>
                    <input required type="number" value={expense.amount} onChange={e => setExpense({...expense, amount: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
                    <select value={expense.category} onChange={e => setExpense({...expense, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                       <option>Utilitas</option>
                       <option>Gaji</option>
                       <option>Sewa</option>
                       <option>Peralatan</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 mt-4">
                  Konfirmasi Pengeluaran
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportCard({ title, value, trend, positive, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1",
          positive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        )}>
          {trend}
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        </div>
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-black text-slate-900 mt-1">{value}</h4>
    </div>
  );
}

function PaymentMixItem({ label, amount, percentage, icon: Icon, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", color)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-black text-slate-900">{formatCurrency(amount)}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color.split(' ')[1].replace('text-', 'bg-'))} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
