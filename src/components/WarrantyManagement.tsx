import React, { useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, History, ArrowRight, ClipboardList, AlertTriangle, Calendar, User, Users, Smartphone, Fingerprint, Plus, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { ServiceTicket, UserProfile } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function WarrantyManagement({ profile }: { profile: UserProfile | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundTicket, setFoundTicket] = useState<ServiceTicket | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [claims, setClaims] = useState<ServiceTicket[]>([]);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimReason, setClaimReason] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const tickets = await api.tickets.list();
      // Search by IMEI or Ticket ID or Customer Name
      const matches = tickets.filter((t: any) => 
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.imei.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Sort by date descending (most recent first)
      matches.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setFoundTicket(matches[0] || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const checkWarrantyStatus = (ticket: ServiceTicket) => {
    if (!ticket) return 'none';
    if (ticket.status !== 'delivered') return 'pending';
    if (!ticket.warrantyExpiry) return 'none';
    
    try {
      const expiry = new Date(ticket.warrantyExpiry);
      const now = new Date();
      // Ensure expiry is a valid date
      if (isNaN(expiry.getTime())) return 'none';
      return expiry > now ? 'active' : 'expired';
    } catch (e) {
      return 'none';
    }
  };

  const createWarrantyClaim = async () => {
    if (!foundTicket || !claimReason) return;
    
    try {
      const newTicket = {
        customerName: foundTicket.customerName,
        customerId: foundTicket.customerId,
        deviceModel: foundTicket.deviceModel,
        imei: foundTicket.imei,
        problem: `[RETUR/GARANSI] ${claimReason}`,
        status: 'waiting',
        isWarrantyClaim: true,
        originalTicketId: foundTicket.id,
        technicianId: foundTicket.technicianId,
        technicianName: foundTicket.technicianName,
        estimatedCost: 0, // Warranty claims are usually free initially
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await api.tickets.create(newTicket);
      alert('Klaim garansi berhasil didaftarkan. Ticket Retur telah dibuat.');
      setShowClaimForm(false);
      setFoundTicket(null);
      setSearchQuery('');
      setClaimReason('');
    } catch (error) {
      console.error(error);
      alert('Gagal membuat klaim garansi');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic shadow-sm inline-block px-2 bg-white">Manajemen Garansi & Retur</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1 opacity-70">Verifikasi status garansi dan proses klaim pengembalian</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" /> Cek Status Garansi
            </h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="IMEI / No. Tiket / Nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold placeholder:text-slate-300"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full mt-4 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSearching ? 'Mencari...' : 'PERIKSA SEKARANG'}
            </button>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-24 h-24" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Informasi Garansi</h4>
            <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
              Garansi hanya berlaku untuk pengerjaan & suku cadang yang sama. Pastikan nomor IMEI sesuai dengan database.
            </p>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Sistem Siap Verifikasi</span>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!foundTicket ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-dashed border-slate-200 rounded-3xl h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 p-8 text-center"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Smartphone className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-bold text-sm uppercase tracking-widest">Masukkan IMEI atau Nomor Tiket</p>
                <p className="text-xs font-medium max-w-xs mt-2">Data hasil servis akan muncul di sini setelah Anda melakukan pencarian</p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
              >
                <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                      checkWarrantyStatus(foundTicket) === 'active' ? "bg-green-500 text-white" : 
                      checkWarrantyStatus(foundTicket) === 'pending' ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                    )}>
                      {checkWarrantyStatus(foundTicket) === 'active' ? <ShieldCheck className="w-6 h-6" /> : 
                       checkWarrantyStatus(foundTicket) === 'pending' ? <Clock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 tracking-tight text-lg">{foundTicket.deviceModel}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{foundTicket.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status Garansi</p>
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm inline-block",
                      checkWarrantyStatus(foundTicket) === 'active' ? "bg-green-100 text-green-600 border border-green-200" : 
                      checkWarrantyStatus(foundTicket) === 'pending' ? "bg-blue-100 text-blue-600 border border-blue-200" :
                      "bg-red-100 text-red-600 border border-red-200"
                    )}>
                      {checkWarrantyStatus(foundTicket) === 'active' ? 'AKTIF (BERLAKU)' : 
                       checkWarrantyStatus(foundTicket) === 'pending' ? 'PENDING (BELUM DIAMBIL)' :
                       'EXPIRED (KADALUARSA)'}
                    </span>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <User className="w-3 h-3" /> Informasi Pelanggan
                      </label>
                      <p className="text-sm font-bold text-slate-900 bg-slate-50 p-4 rounded-2xl border border-slate-100">{foundTicket.customerName}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Users className="w-3 h-3" /> Teknisi Terkait
                      </label>
                      <p className="text-sm font-bold text-slate-900 bg-slate-50 p-4 rounded-2xl border border-slate-100">{foundTicket.technicianName || 'Tidak ada data'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Fingerprint className="w-3 h-3" /> Nomor IMEI / Serial Number
                      </label>
                      <p className="text-sm font-black text-slate-900 font-mono bg-slate-50 p-4 rounded-2xl border border-slate-100 tracking-tighter">{foundTicket.imei}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Calendar className="w-3 h-3" /> Tanggal Servis
                      </label>
                      <div className="flex gap-4">
                        <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Penerimaan</p>
                          <p className="text-xs font-bold text-slate-700">{new Date(foundTicket.createdAt).toLocaleDateString('id-ID')}</p>
                        </div>
                        <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Berlaku Sampai</p>
                          <p className="text-xs font-bold text-slate-700">
                            {foundTicket.warrantyExpiry ? new Date(foundTicket.warrantyExpiry).toLocaleDateString('id-ID') : 'Belum Mulai'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <ClipboardList className="w-3 h-3" /> Detail Perbaikan Sebelumnya
                      </label>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic border-b border-slate-200 pb-2">"{foundTicket.problem}"</p>
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase">Suku Cadang Diganti:</p>
                           {foundTicket.partsUsed && foundTicket.partsUsed.length > 0 ? (
                             foundTicket.partsUsed.map((p, i) => (
                               <div key={i} className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                                 <span>{p.name} (x{p.quantity})</span>
                               </div>
                             ))
                           ) : (
                             <p className="text-[10px] font-bold text-slate-400">Hanya Jasa / Tidak ada ganti part</p>
                           )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      {checkWarrantyStatus(foundTicket) === 'active' ? (
                        !showClaimForm ? (
                          <button 
                            onClick={() => setShowClaimForm(true)}
                            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 group"
                          >
                            <AlertTriangle className="w-5 h-5 group-hover:animate-bounce" /> PROSES KLAM RETUR (GARANSI)
                          </button>
                        ) : (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Keluhan Retur / Pengembalian</label>
                              <textarea 
                                value={claimReason}
                                onChange={(e) => setClaimReason(e.target.value)}
                                placeholder="Jelaskan alasan retur secara detail..."
                                className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setShowClaimForm(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={createWarrantyClaim}
                                disabled={!claimReason}
                                className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-50"
                              >
                                BUAT TIKET RETUR
                              </button>
                            </div>
                          </motion.div>
                        )
                      ) : (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                           <p className="text-xs font-bold text-red-600 flex items-center gap-2">
                             <AlertTriangle className="w-4 h-4" /> Garansi sudah berakhir. Klaim retur tidak dapat diajukan secara gratis.
                           </p>
                           <p className="text-[10px] text-red-400 mt-2">Teknisi dapat membuat tiket servis baru jika pelanggan ingin melakukan perbaikan berbayar kembali.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
