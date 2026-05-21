import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  Wrench, 
  ShoppingCart, 
  Calendar,
  User,
  Smartphone,
  ChevronDown,
  TrendingUp,
  Award
} from 'lucide-react';
import { api } from '../lib/api';
import { ServiceTicket, Transaction, UserProfile } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, ResponsiveContainer, YAxis, Tooltip as RechartsTooltip } from 'recharts';

export default function DetailedReports() {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'transactions' | 'technicians' | 'claims'>('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const statusConfig: Record<string, { label: string, color: string }> = {
    waiting: { label: 'Menunggu', color: 'bg-slate-100 text-slate-600' },
    checking: { label: 'Pengecekan', color: 'bg-blue-100 text-blue-600' },
    on_progress: { label: 'Pengerjaan', color: 'bg-indigo-100 text-indigo-600' },
    pending_sparepart: { label: 'Suku Cadang', color: 'bg-orange-100 text-orange-600' },
    finished: { label: 'Siap', color: 'bg-green-100 text-green-600' },
    delivered: { label: 'Diserahkan', color: 'bg-slate-700 text-white' },
    cancel: { label: 'Dibatalkan', color: 'bg-red-100 text-red-600' },
  };

  const ticketStatusLabels: Record<string, string> = {
    all: 'Semua Status',
    ...Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.label]))
  };

  const transactionTypeLabels: Record<string, string> = {
    all: 'Semua Tipe',
    sale: 'Penjualan',
    service: 'Servis',
    expense: 'Pengeluaran'
  };

  const fetchData = async () => {
    try {
      const [ticketData, txData, userData] = await Promise.all([
        api.tickets.list(),
        api.transactions.list(),
        api.users.list()
      ]);
      setTickets(ticketData);
      setTransactions(txData);
      setUsers(userData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isClaim = (t: ServiceTicket) => !!(t.isWarrantyClaim || t.originalTicketId || t.problem?.startsWith('[RETUR/GARANSI]'));

  const filteredTickets = tickets.filter(t => {
    const query = (searchTerm || '').toLowerCase();
    const matchesSearch = (t.customerName || '').toLowerCase().includes(query) || 
                         (t.id || '').toLowerCase().includes(query) ||
                         (t.deviceModel || '').toLowerCase().includes(query);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    
    const ticketDate = new Date(t.createdAt);
    const matchesDate = (!dateRange.start || ticketDate >= new Date(dateRange.start)) &&
                        (!dateRange.end || ticketDate <= new Date(dateRange.end + 'T23:59:59'));
                        
    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredTransactions = transactions.filter(t => {
    const query = (searchTerm || '').toLowerCase();
    const matchesSearch = (t.description || '').toLowerCase().includes(query) || 
                          (t.id || '').toLowerCase().includes(query);
    const matchesType = filterStatus === 'all' || t.type === filterStatus;
    
    const txDate = new Date(t.createdAt);
    const matchesDate = (!dateRange.start || txDate >= new Date(dateRange.start)) &&
                        (!dateRange.end || txDate <= new Date(dateRange.end + 'T23:59:59'));

    return matchesSearch && matchesType && matchesDate;
  });

  const techPerformance = filteredTickets.reduce((acc: any, t) => {
    // Include delivered, finished, and cancelled for KPI tracking
    // AND include all warranty claims regardless of status so they show up immediately
    const ticketIsClaim = isClaim(t);
    if (['delivered', 'finished', 'cancel'].includes(t.status) || ticketIsClaim) {
      const techName = t.technicianName || 'Tanpa Nama';
      
      // Get role from users list if available
      const techUser = users.find(u => u.displayName === techName || u.id === t.technicianId);
      const role = techUser?.role || 'technician';

      if (roleFilter !== 'all' && role !== roleFilter) return acc;

      if (!acc[techName]) {
        acc[techName] = { 
          count: 0, 
          completedCount: 0,
          cancelledCount: 0,
          claimCount: 0,
          revenue: 0, 
          tickets: [],
          role: role,
          weeklyStats: [
            { name: 'W1', jobs: 0 },
            { name: 'W2', jobs: 0 },
            { name: 'W3', jobs: 0 },
            { name: 'W4', jobs: 0 }
          ]
        };
      }
      acc[techName].count += 1;
      if (t.status === 'cancel') {
        acc[techName].cancelledCount += 1;
      } else if (['delivered', 'finished'].includes(t.status)) {
        acc[techName].completedCount += 1;
        acc[techName].revenue += (t.finalCost || 0);
      }
      
      if (ticketIsClaim) {
        acc[techName].claimCount += 1;
      }
      acc[techName].tickets.push(t);

      // Weekly calculation
      const now = new Date();
      const ticketDate = new Date(t.createdAt);
      const diffDays = Math.floor((now.getTime() - ticketDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(3, Math.floor(diffDays / 7));
      const statIndex = 3 - weekIndex; // W4 is current, W1 is 3 weeks ago
      if (statIndex >= 0) {
        acc[techName].weeklyStats[statIndex].jobs += 1;
      }
    }
    return acc;
  }, {});

  const exportToCSV = () => {
    let data = [];
    let headers = [];
    let filename = "";

      if (activeTab === 'services') {
        headers = ['ID Tiket', 'Pelanggan', 'Device', 'Status', 'Teknisi', 'Estimasi', 'Jasa', 'Suku Cadang', 'Final', 'Tanggal'];
        data = filteredTickets.map(t => {
          const partsUsedArray = Array.isArray(t.partsUsed) 
            ? t.partsUsed 
            : (typeof t.partsUsed === 'string' ? JSON.parse(t.partsUsed || '[]') : []);
          const partsSum = partsUsedArray.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
          const labor = Math.max(0, (t.finalCost || 0) - partsSum);
          
          return [
            t.id, t.customerName, t.deviceModel, ticketStatusLabels[t.status] || t.status, t.technicianName, 
            t.estimatedCost, labor, partsSum, t.finalCost, new Date(t.createdAt).toLocaleDateString()
          ];
        });
        filename = "laporan_servis.csv";
      } else if (activeTab === 'transactions') {
        headers = ['ID Transaksi', 'Deskripsi', 'Tipe', 'Metode', 'Total', 'Tanggal'];
        data = filteredTransactions.map(t => [
          t.id, t.description, transactionTypeLabels[t.type] || t.type, t.paymentMethod, t.totalAmount, new Date(t.createdAt).toLocaleDateString()
        ]);
        filename = "laporan_transaksi.csv";
      } else if (activeTab === 'claims') {
        headers = ['ID Klaim', 'ID Tiket Asal', 'Pelanggan', 'Device', 'Teknisi', 'Masalah', 'Status', 'Tanggal Klaim'];
        data = tickets.filter(t => isClaim(t)).map(t => [
          t.id, t.originalTicketId, t.customerName, t.deviceModel, t.technicianName, t.problem, t.status, new Date(t.createdAt).toLocaleDateString()
        ]);
        filename = "laporan_klaim_garansi.csv";
      } else {
        headers = ['Teknisi', 'Jumlah Servis', 'Selesai', 'Batal', 'Retur (Garansi)', 'Total Pendapatan', 'Estimasi Bonus (10%)'];
        data = Object.entries(techPerformance).map(([name, d]: [string, any]) => [
          name, d.count, d.completedCount, d.cancelledCount, d.claimCount, d.revenue, d.revenue * 0.1
        ]);
        filename = "laporan_performa_teknisi.csv";
      }

    const csvContent = [headers, ...data].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Detail</h1>
          <p className="text-slate-500 font-medium tracking-tight">Data komprehensif operasional dan keuangan</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
        >
          <Download className="w-5 h-5" /> Ekspor Data (.CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Pilih Kategori</h3>
            <div className="space-y-2">
              <button 
                onClick={() => { setActiveTab('services'); setFilterStatus('all'); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                  activeTab === 'services' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Wrench className="w-5 h-5" /> Data Servis
              </button>
              <button 
                onClick={() => { setActiveTab('transactions'); setFilterStatus('all'); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                  activeTab === 'transactions' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <ShoppingCart className="w-5 h-5" /> Data Transaksi
              </button>
              <button 
                onClick={() => { setActiveTab('technicians'); setFilterStatus('all'); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                  activeTab === 'technicians' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <User className="w-5 h-5" /> Performa Teknisi
              </button>
              <button 
                onClick={() => { setActiveTab('claims'); setFilterStatus('all'); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                  activeTab === 'claims' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Award className="w-5 h-5" /> Laporan Klaim
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Rentang Tanggal</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mulai</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                </div>
              </div>
              {(dateRange.start || dateRange.end) && (
                <button 
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="w-full py-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Reset Tanggal
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Filter Spesifik</h3>
            <div className="space-y-4">
              {activeTab === 'technicians' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peran Teknisi</label>
                  <select 
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Peran</option>
                    <option value="admin">Admin</option>
                    <option value="technician">Teknisi Umum</option>
                    <option value="senior">Senior Teknisi</option>
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Status / Tipe</h3>
                {activeTab === 'services' || activeTab === 'claims' ? (
                  Object.keys(ticketStatusLabels).map(s => (
                    <button 
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        filterStatus === s ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <span>{ticketStatusLabels[s]}</span>
                      {filterStatus === s && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))
                ) : activeTab === 'transactions' ? (
                  Object.keys(transactionTypeLabels).map(s => (
                    <button 
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        filterStatus === s ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <span>{transactionTypeLabels[s]}</span>
                      {filterStatus === s && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 font-medium italic px-4 py-2">
                    Gunakan filter peran di atas untuk teknisi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari data..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'services' ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tiket & Pelanggan</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Device</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Detail Biaya</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Biaya</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {filteredTickets.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">{t.customerName}</p>
                            {isClaim(t) && (
                              <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm italic tracking-tighter">RETUR</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{t.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-700">{t.deviceModel}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">By: {t.technicianName || '-'}</p>
                        </td>
                        <td className="px-6 py-4 min-w-[140px]">
                          {(() => {
                            const partsUsedArray = Array.isArray(t.partsUsed) 
                              ? t.partsUsed 
                              : (typeof t.partsUsed === 'string' ? JSON.parse(t.partsUsed || '[]') : []);
                            const partsSum = partsUsedArray.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
                            const labor = Math.max(0, (t.finalCost || 0) - partsSum);
                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-slate-400 font-bold uppercase">Jasa:</span>
                                  <span className="text-slate-600 font-black">{formatCurrency(labor)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-slate-400 font-bold uppercase">Parts:</span>
                                  <span className="text-slate-600 font-black">{formatCurrency(partsSum)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                            statusConfig[t.status]?.color || "bg-slate-100 text-slate-400"
                          )}>
                            {statusConfig[t.status]?.label || t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-black text-slate-900">{formatCurrency(t.finalCost || 0)}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Est: {formatCurrency(t.estimatedCost || 0)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : activeTab === 'transactions' ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Transaksi</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tipe & Metode</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Nominal</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{t.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{t.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                              t.type === 'sale' ? "bg-green-100 text-green-600" : 
                              t.type === 'service' ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                            )}>
                              {transactionTypeLabels[t.type] || t.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{t.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={cn(
                            "text-sm font-black",
                            t.type === 'expense' ? "text-red-500" : "text-slate-900"
                          )}>
                            {t.type === 'expense' ? '-' : ''}{formatCurrency(t.totalAmount || 0)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : activeTab === 'claims' ? (
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Total Klaim Aktif</p>
                      <h4 className="text-2xl font-black text-orange-900">{tickets.filter(t => isClaim(t) && t.status !== 'delivered').length}</h4>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total History Klaim</p>
                      <h4 className="text-2xl font-black text-blue-900">{tickets.filter(t => isClaim(t)).length}</h4>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rasio Kualitas (Claim-Free)</p>
                      <h4 className="text-2xl font-black text-white">
                        {(() => {
                          const totalCompleted = tickets.filter(t => ['delivered', 'finished'].includes(t.status) && !isClaim(t)).length;
                          const totalClaims = tickets.filter(t => isClaim(t)).length;
                          if (totalCompleted === 0) return '100%';
                          const rate = Math.max(0, 100 - (totalClaims / totalCompleted * 100));
                          return rate.toFixed(1) + '%';
                        })()}
                      </h4>
                    </div>
                  </div>

                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Klaim & Tiket Asal</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Device & Pelanggan</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Teknisi Bertanggung Jawab</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {tickets.filter(t => {
                        if (!isClaim(t)) return false;
                        const query = searchTerm.toLowerCase();
                        const matchesSearch = t.customerName?.toLowerCase().includes(query) || 
                                            t.deviceModel?.toLowerCase().includes(query) || 
                                            t.id?.toLowerCase().includes(query);
                        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
                        return matchesSearch && matchesStatus;
                      }).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900">#{t.id.slice(-6).toUpperCase()}</p>
                            <p className="text-[10px] text-orange-600 font-bold uppercase">Asal: #{t.originalTicketId?.slice(-6).toUpperCase()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900">{t.deviceModel}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.customerName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                {t.technicianName?.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-slate-700">{t.technicianName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              statusConfig[t.status]?.color || "bg-slate-100 text-slate-400"
                            )}>
                              {statusConfig[t.status]?.label || t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Teknisi</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Produktifitas 4 Minggu</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Jumlah Servis</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Retur (Garansi)</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Total Pendapatan</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Estimasi Bonus (10%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {Object.entries(techPerformance).map(([name, data]: [string, any]) => (
                      <tr key={name} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                              {name.charAt(0)}
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">{name}</p>
                                {(() => {
                                  const totalDone = data.completedCount;
                                  const claims = data.claimCount;
                                  const sqi = totalDone === 0 ? 100 : Math.max(0, 100 - (claims / totalDone * 100));
                                  return (
                                    <span className={cn(
                                      "text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm",
                                      sqi >= 90 ? "bg-green-600 text-white" :
                                      sqi >= 70 ? "bg-orange-500 text-white" : "bg-red-600 text-white"
                                    )}>
                                      SQI: {sqi.toFixed(0)}%
                                    </span>
                                  );
                                })()}
                              </div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{data.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 min-w-[150px]">
                          <div className="h-10 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data.weeklyStats}>
                                <Bar 
                                  dataKey="jobs" 
                                  fill="#3b82f6" 
                                  radius={[2, 2, 0, 0]} 
                                  barSize={12} 
                                />
                                <RechartsTooltip 
                                  cursor={{fill: 'transparent'}}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-xl font-black">
                                          {payload[0].value} jobs
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black text-xs">
                              Total: {data.count}
                            </span>
                            <div className="flex gap-2 text-[8px] font-bold uppercase tracking-tighter">
                              <span className="text-green-600">Selesai: {data.completedCount}</span>
                              <span className="text-red-500">Batal: {data.cancelledCount}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-lg font-black text-xs shadow-sm",
                            data.claimCount > 0 ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-slate-50 text-slate-400"
                          )}>
                            {data.claimCount} x
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">
                          {formatCurrency(data.revenue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-lg">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-xs font-black">
                              {formatCurrency(data.revenue * 0.1)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {((activeTab === 'services' && filteredTickets.length === 0) || (activeTab === 'transactions' && filteredTransactions.length === 0)) && (
                <div className="py-20 text-center text-slate-400 italic">
                  Tidak ada data yang ditemukan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
