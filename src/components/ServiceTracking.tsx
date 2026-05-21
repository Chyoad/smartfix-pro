import { useState, useEffect, FormEvent, MouseEvent } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  PlusCircle,
  Smartphone,
  Sparkles,
  Wrench,
  Trash2
} from 'lucide-react';
import { api } from '../lib/api';
import { ServiceTicket, UserProfile } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import AIDiagnosis from './AIDiagnosis';
import TicketDetail from './TicketDetail';

const statusConfig = {
  waiting: { label: 'Menunggu', color: 'bg-slate-100 text-slate-600', icon: Clock },
  checking: { label: 'Pengecekan', color: 'bg-blue-100 text-blue-600', icon: Search },
  on_progress: { label: 'Pengerjaan', color: 'bg-indigo-100 text-indigo-600', icon: Wrench },
  pending_sparepart: { label: 'Suku Cadang', color: 'bg-orange-100 text-orange-600', icon: AlertCircle },
  finished: { label: 'Siap', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
  delivered: { label: 'Diserahkan', color: 'bg-slate-700 text-white', icon: CheckCircle2 },
  cancel: { label: 'Dibatalkan', color: 'bg-red-100 text-red-600', icon: AlertCircle },
};

export default function ServiceTracking({ profile }: { profile: UserProfile | null }) {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAIDiagnosis, setShowAIDiagnosis] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newTicket, setNewTicket] = useState({
    customerName: '',
    deviceModel: '',
    imei: '',
    problem: '',
    technicianId: '',
    technicianName: '',
    estimatedCost: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsData, usersData] = await Promise.all([
        api.tickets.list(),
        api.users.list()
      ]);
      setTickets(ticketsData);
      setTechnicians(usersData.filter((u: any) => u.role === 'technician'));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const tech = technicians.find(t => t.uid === newTicket.technicianId);
      await api.tickets.create({
        ...newTicket,
        technicianName: tech?.displayName || '',
        status: 'waiting',
      });
      setShowNewModal(false);
      setNewTicket({ customerName: '', deviceModel: '', imei: '', problem: '', technicianId: '', technicianName: '' });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      const historyEntry = {
        date: new Date().toISOString(),
        status: status,
        note: `Status diubah ke ${statusConfig[status as keyof typeof statusConfig]?.label || status}`,
        technicianName: profile?.displayName || 'Sistem'
      };

      await api.tickets.update(ticketId, { 
        status,
        repairHistory: [...(ticket.repairHistory || []), historyEntry]
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTicket = async (e: MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (!window.confirm('Apakah Anda yakin ingin menghapus tiket ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await api.tickets.delete(ticketId);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (t.customerName || '').toLowerCase().includes(query) ||
      (t.deviceModel || '').toLowerCase().includes(query) ||
      (t.imei || '').toLowerCase().includes(query) ||
      (t.id || '').toLowerCase().includes(query);
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pusat Servis</h1>
          <p className="text-slate-500 mt-1">Kelola siklus perbaikan dan kontrol kualitas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAIDiagnosis(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Diagnosa AI
          </button>
          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Check-in Perangkat
          </button>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari IMEI, Pelanggan, atau Perangkat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'waiting', label: 'Menunggu' },
            { id: 'on_progress', label: 'Proses' },
            { id: 'finished', label: 'Selesai' }
          ].map((filter) => (
            <button 
              key={filter.id} 
              onClick={() => setStatusFilter(filter.id)}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                filter.id === statusFilter ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-[11px] text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">Tiket</th>
                <th className="px-6 py-4">Pelanggan & Perangkat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Teknisi</th>
                <th className="px-6 py-4">Biaya</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada tiket servis aktif. Mulai dengan mendaftarkan perangkat.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
                  return (
                    <tr 
                      key={ticket.id} 
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-blue-600 tracking-tighter">#{ticket.id.slice(-6).toUpperCase()}</span>
                          <span className="text-[10px] text-slate-400 mt-1">
                             {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                            <Smartphone className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{ticket.customerName}</p>
                            <p className="text-xs text-slate-500">{ticket.deviceModel} • {ticket.imei}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase",
                          statusInfo.color
                        )}>
                          <statusInfo.icon className="w-3 h-3" />
                          {statusInfo.label}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-600">
                        {ticket.technicianName ? (
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold">
                                {ticket.technicianName[0]}
                             </div>
                             {ticket.technicianName}
                           </div>
                        ) : <span className="text-slate-400 italic font-normal">Belum Ditugaskan</span>}
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-900">
                        {formatCurrency(ticket.finalCost || ticket.estimatedCost || 0)}
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateStatus(ticket.id, 'checking'); }}
                              title="Set to Checking"
                              className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteTicket(e, ticket.id)}
                              title="Delete Ticket"
                              className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Check-in Perangkat</h2>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Pelanggan</label>
                    <input 
                      required
                      value={newTicket.customerName || ''}
                      onChange={e => setNewTicket({...newTicket, customerName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Model Perangkat</label>
                    <input 
                      required
                      value={newTicket.deviceModel || ''}
                      onChange={e => setNewTicket({...newTicket, deviceModel: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nomor IMEI / SN</label>
                    <input 
                      required
                      value={newTicket.imei || ''}
                      onChange={e => setNewTicket({...newTicket, imei: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tugaskan Teknisi (Opsional)</label>
                    <select 
                      value={newTicket.technicianId || ''}
                      onChange={e => setNewTicket({...newTicket, technicianId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Belum Ditugaskan</option>
                      {technicians.map(tech => (
                        <option key={tech.uid} value={tech.uid}>{tech.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estimasi Biaya</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input 
                        type="number"
                        value={newTicket.estimatedCost ?? 0}
                        onChange={e => setNewTicket({...newTicket, estimatedCost: Number(e.target.value)})}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Deskripsi Masalah</label>
                  <textarea 
                    required
                    rows={4}
                    value={newTicket.problem || ''}
                    onChange={e => setNewTicket({...newTicket, problem: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 font-bold bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Konfirmasi Check-in
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Diagnosis Modal */}
      <AnimatePresence>
        {showAIDiagnosis && (
          <AIDiagnosis onClose={() => setShowAIDiagnosis(false)} />
        )}
      </AnimatePresence>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <TicketDetail 
            ticket={selectedTicket} 
            onClose={() => {
              setSelectedTicket(null);
              fetchData();
            }} 
            onUpdate={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
