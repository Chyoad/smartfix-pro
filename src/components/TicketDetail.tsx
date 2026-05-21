import { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Smartphone, 
  User, 
  Calendar,
  CreditCard,
  ClipboardList,
  Save,
  Receipt,
  UserCheck,
  Trash2,
  Plus,
  Component,
  Search,
  ShoppingCart,
  Printer,
  ShieldCheck,
  ShieldAlert,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceTicket, ServiceStatus, UserProfile, InventoryItem } from '../types';
import { api } from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';

const statusFlow: { [key in ServiceStatus]: { label: string; next?: ServiceStatus[]; color: string; icon: any } } = {
  waiting: { label: 'Menunggu', next: ['checking', 'cancel'], color: 'bg-slate-100 text-slate-600', icon: Clock },
  checking: { label: 'Pengecekan', next: ['on_progress', 'pending_sparepart', 'cancel'], color: 'bg-blue-100 text-blue-600', icon: ClipboardList },
  on_progress: { label: 'Pengerjaan', next: ['finished', 'pending_sparepart'], color: 'bg-indigo-100 text-indigo-600', icon: Wrench },
  pending_sparepart: { label: 'Suku Cadang', next: ['on_progress', 'cancel'], color: 'bg-orange-100 text-orange-600', icon: AlertCircle },
  finished: { label: 'Siap', next: [], color: 'bg-green-100 text-green-600', icon: CheckCircle },
  delivered: { label: 'Diserahkan', color: 'bg-slate-900 text-white', icon: CheckCircle },
  cancel: { label: 'Dibatalkan', color: 'bg-red-100 text-red-600', icon: AlertCircle },
};

export default function TicketDetail({ 
  ticket, 
  onClose, 
  onUpdate 
}: { 
  ticket: ServiceTicket; 
  onClose: () => void; 
  onUpdate?: () => void;
}) {
  const [diagnosis, setDiagnosis] = useState(ticket.diagnosis || '');
  const [cost, setCost] = useState(ticket.estimatedCost || 0);
  const [technicianId, setTechnicianId] = useState(ticket.technicianId || '');
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [partsUsed, setPartsUsed] = useState<any[]>(() => {
    if (Array.isArray(ticket.partsUsed)) return ticket.partsUsed;
    if (typeof ticket.partsUsed === 'string') {
      try { return JSON.parse(ticket.partsUsed); } catch (e) { return []; }
    }
    return [];
  });
  const [repairHistory, setRepairHistory] = useState<any[]>(() => {
    if (Array.isArray(ticket.repairHistory)) return ticket.repairHistory;
    if (typeof ticket.repairHistory === 'string') {
      try { return JSON.parse(ticket.repairHistory); } catch (e) { return []; }
    }
    return [];
  });
  const [laborCost, setLaborCost] = useState(0); 
  const [warrantyDuration, setWarrantyDuration] = useState(ticket.warrantyDuration !== undefined ? ticket.warrantyDuration : 30); // Default 30 days
  const [relatedTickets, setRelatedTickets] = useState<ServiceTicket[]>([]);
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handlePrintQuote = () => {
    setShowPrintPreview(true);
  };

  useEffect(() => {
    fetchTechnicians();
    fetchInventory();
    fetchRelatedTickets();
    
    // Initial labor cost calculation: finalCost - sum(parts)
    const initialParts = Array.isArray(ticket.partsUsed) ? ticket.partsUsed : [];
    const partsSum = initialParts.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
    setLaborCost(Math.max(0, (ticket.finalCost || 0) - partsSum));
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await api.inventory.list();
      setInventory(data);
    } catch (error) {
      console.error(error);
    }
  };

  const finalTotal = laborCost + (Array.isArray(partsUsed) ? partsUsed : []).reduce((sum, p) => sum + (p.price * p.quantity), 0);

  const fetchTechnicians = async () => {
    try {
      const data = await api.users.list();
      setTechnicians(data.filter((u: any) => u.role === 'technician'));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRelatedTickets = async () => {
    try {
      const allTickets = await api.tickets.list();
      // Find tickets where THIS ticket is the original (claims for this ticket)
      // OR this ticket's original ticket (the source of this claim)
      const related = allTickets.filter((t: any) => 
        t.originalTicketId === ticket.id || (ticket.originalTicketId && t.id === ticket.originalTicketId)
      );
      setRelatedTickets(related);
    } catch (error) {
      console.error(error);
    }
  };

  const originalTicket = relatedTickets.find(t => t.id === ticket.originalTicketId);
  const claims = relatedTickets.filter(t => t.originalTicketId === ticket.id);

  const handleUpdate = async (newStatus?: ServiceStatus) => {
    setSaving(true);
    try {
      const tech = technicians.find(t => t.uid === technicianId);
      const historyEntry = {
        date: new Date().toISOString(),
        status: newStatus || ticket.status,
        note: newStatus ? `Status diubah ke ${statusFlow[newStatus].label}` : 'Informasi draf diperbarui',
        technicianName: tech?.displayName || ticket.technicianName || 'Sistem'
      };

      const updateData: any = {
        diagnosis,
        estimatedCost: Number(cost),
        finalCost: finalTotal,
        partsUsed: partsUsed,
        technicianId,
        technicianName: tech?.displayName || '',
        warrantyDuration: Number(warrantyDuration),
        repairHistory: [...repairHistory, historyEntry]
      };

      if (newStatus) {
        updateData.status = newStatus;
        // If moving to delivered, calculate expiry from now
        if (newStatus === 'delivered') {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + Number(warrantyDuration));
          updateData.warrantyExpiry = expiryDate.toISOString();
        }
      }

      const updatedTicket = await api.tickets.update(ticket.id, updateData);
      
      setRepairHistory(updatedTicket.repairHistory || []);
      if (onUpdate) onUpdate();
      
      if (newStatus) onClose();
      else alert('Informasi draf berhasil disimpan.');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus tiket ini?')) return;
    try {
      await api.tickets.delete(ticket.id);
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const statusInfo = statusFlow[ticket.status as ServiceStatus] || statusFlow.waiting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left: Info Side */}
        <div className="w-full md:w-80 bg-slate-50 p-8 border-r border-slate-200">
           <div className="flex items-center gap-3 mb-8">
             <div className="p-3 bg-blue-600 rounded-2xl text-white">
               <Smartphone className="w-6 h-6" />
             </div>
             <div>
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Identitas Tiket</p>
               <h2 className="text-xl font-bold text-slate-900">#{ticket.id.slice(-6).toUpperCase()}</h2>
             </div>
           </div>

           <div className="space-y-6">
              <InfoItem icon={User} label="Nama Pelanggan" value={ticket.customerName || 'Pelanggan Walk-in'} />
              <InfoItem icon={Smartphone} label="Model Perangkat" value={ticket.deviceModel} />
              <InfoItem icon={Receipt} label="Nomor IMEI / SN" value={ticket.imei} />
              <InfoItem icon={Calendar} label="Tanggal Masuk" value={new Date(ticket.createdAt as any).toLocaleDateString()} />
           </div>

           <div className="mt-12 p-4 bg-white border border-slate-200 rounded-2xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Keluhan Awal</p>
              <p className="text-sm text-slate-600 italic">"{ticket.problem}"</p>
           </div>
        </div>

        {/* Right: Actions Side */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className={cn(
              "px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm",
              statusInfo.color
            )}>
              <statusInfo.icon className="w-4 h-4" />
              {statusInfo.label}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrintQuote}
                title="Cetak Penawaran / Estimasi"
                className="p-2 hover:bg-slate-100 rounded-full text-blue-600 transition-colors border border-blue-100 bg-blue-50"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDelete}
                title="Hapus Tiket"
                className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" /> Diagnosa Teknisi
              </label>
              <textarea 
                value={diagnosis || ''}
                onChange={e => setDiagnosis(e.target.value)}
                rows={4}
                placeholder="Identifikasi kegagalan komponen, tanda kerusakan air, dll..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
              />
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5" /> Teknisi yang Bertugas
                </label>
                <select 
                  value={technicianId || ''}
                  onChange={e => setTechnicianId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                >
                  <option value="">Belum Ditugaskan</option>
                  {technicians.map(tech => (
                    <option key={tech.uid} value={tech.uid}>{tech.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Estimasi Total Biaya
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input 
                    type="number"
                    value={cost ?? 0}
                    onChange={e => setCost(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Masa Garansi (Hari)
                </label>
                <select 
                  value={warrantyDuration}
                  onChange={e => setWarrantyDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                >
                  <option value={0}>Tanpa Garansi</option>
                  <option value={7}>1 Minggu (7 Hari)</option>
                  <option value={14}>2 Minggu (14 Hari)</option>
                  <option value={30}>1 Bulan (30 Hari)</option>
                  <option value={60}>2 Bulan (60 Hari)</option>
                  <option value={90}>3 Bulan (90 Hari)</option>
                </select>
              </div>
            </div>

            {/* Bill of Materials & Labor */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5" /> Rincian Biaya Perbaikan
                </label>
                <button 
                  onClick={() => {
                    fetchInventory();
                    setShowInventorySearch(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition-all border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Suku Cadang
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3">Item / Suku Cadang</th>
                      <th className="px-6 py-3">Harga</th>
                      <th className="px-6 py-3">Qty</th>
                      <th className="px-6 py-3 text-right">Subtotal</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Labor Fee Row */}
                    <tr>
                      <td className="px-6 py-4 font-bold text-slate-700">Biaya Jasa Teknisi</td>
                      <td className="px-6 py-4" colSpan={2}>
                        <div className="relative max-w-[150px]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span>
                          <input 
                            type="number"
                            value={laborCost}
                            onChange={(e) => setLaborCost(Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-xs"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">{formatCurrency(laborCost)}</td>
                      <td></td>
                    </tr>

                    {/* Parts Rows */}
                    {partsUsed.map((part, idx) => (
                      <tr key={part.id + idx}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-700">{part.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{part.sku || 'No SKU'}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{formatCurrency(part.price)}</td>
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            value={part.quantity}
                            onChange={(e) => {
                              const newList = [...partsUsed];
                              newList[idx].quantity = Math.max(1, Number(e.target.value));
                              setPartsUsed(newList);
                            }}
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-center font-bold text-xs"
                          />
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">{formatCurrency(part.price * part.quantity)}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setPartsUsed(partsUsed.filter((_, i) => i !== idx))}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {partsUsed.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic text-xs">
                          Belum ada suku cadang yang ditambahkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100/50">
                    <tr className="font-bold text-slate-900">
                      <td colSpan={3} className="px-6 py-4 text-right text-xs uppercase tracking-widest text-slate-500">Biaya Akhir Keseluruhan</td>
                      <td className="px-6 py-4 text-right text-lg text-blue-600">{formatCurrency(finalTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex">
              <button 
                onClick={() => handleUpdate()}
                disabled={saving}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Draf Informasi'}
              </button>
            </div>

            {/* Lifecycle Operations */}
            <div className="pt-8 border-t border-slate-100">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tahapan Perbaikan</p>
               <div className="flex flex-wrap gap-3">
                  {statusInfo.next?.map((nextStatus) => {
                    const nextInfo = statusFlow[nextStatus];
                    return (
                      <button
                        key={nextStatus}
                        onClick={() => handleUpdate(nextStatus)}
                        className={cn(
                          "px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2",
                          nextInfo.color,
                          "hover:shadow-md active:scale-95"
                        )}
                      >
                         <nextInfo.icon className="w-4 h-4" />
                         Setel ke {nextInfo.label}
                      </button>
                    );
                  })}
               </div>
            </div>

            {/* Warranty / Return History */}
            {originalTicket && (
              <div className="pt-8 border-t border-slate-100">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <History className="w-3.5 h-3.5 text-blue-500" /> Referensi Tiket Asal
                </label>
                <div 
                  className="p-4 rounded-2xl border bg-blue-50 border-blue-100 flex items-center justify-between group cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Terdaftar Sejak</span>
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-blue-200 uppercase">
                           {originalTicket.status}
                         </span>
                      </div>
                      <p className="text-sm font-black text-slate-900">#{originalTicket.id.slice(-6).toUpperCase()}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate max-w-[200px]">{originalTicket.problem}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-slate-400">{new Date(originalTicket.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{formatCurrency(originalTicket.finalCost || originalTicket.estimatedCost || 0)}</p>
                  </div>
                </div>
              </div>
            )}

            {claims.length > 0 && (
              <div className="pt-8 border-t border-slate-100">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> Riwayat Klaim Garansi
                </label>
                <div className="space-y-3">
                  {claims.map((rt) => (
                    <div 
                      key={rt.id} 
                      className="p-4 rounded-2xl border bg-orange-50 border-orange-100 flex items-center justify-between group cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center">
                          <History className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Klaim Retur</span>
                             <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-orange-200 uppercase">
                               {rt.status}
                             </span>
                          </div>
                          <p className="text-sm font-black text-slate-900">#{rt.id.slice(-6).toUpperCase()}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate max-w-[200px]">{rt.problem}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium text-slate-400">{new Date(rt.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs font-black text-slate-900 mt-1">{formatCurrency(rt.finalCost || rt.estimatedCost || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repair History Timeline */}
            <div className="pt-8 border-t border-slate-100">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Clock className="w-3.5 h-3.5" /> Riwayat Aktivitas & Perbaikan
              </label>
              
              <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {(repairHistory || []).slice().reverse().map((entry: any, i: number) => {
                  const entryStatus = statusFlow[entry.status as ServiceStatus] || statusFlow.waiting;
                  return (
                    <div key={i} className="relative">
                      <div className={cn(
                        "absolute -left-[27px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm",
                        entryStatus.color.split(' ')[0]
                      )} />
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg", entryStatus.color)}>
                            {entryStatus.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(entry.date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium mb-1">{entry.note}</p>
                        <div className="flex items-center gap-1.text-slate-400">
                          <User className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{entry.technicianName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!ticket.repairHistory || ticket.repairHistory.length === 0) && (
                  <p className="text-sm text-slate-400 italic">Belum ada riwayat aktivitas.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Printable Area (Hidden in UI, visible in Print) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 text-slate-900 overflow-visible h-auto">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">SMARTPHONE SERVICE</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Pusat Perbaikan & Suku Cadang</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-widest">Penawaran Servis</h2>
            <p className="text-sm font-mono font-bold text-blue-600 mt-1">#{ticket.id.toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-10">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 text-left">Detail Pelanggan</h3>
            <div className="space-y-1 text-left">
              <p className="text-lg font-black">{ticket.customerName || 'Pelanggan Umum'}</p>
              <p className="text-sm text-slate-600 font-medium">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 text-right">Detail Perangkat</h3>
            <div className="space-y-1 text-right">
              <p className="text-lg font-black">{ticket.deviceModel}</p>
              <p className="text-sm text-slate-600 font-mono font-bold tracking-tight uppercase">IMEI/SN: {ticket.imei}</p>
            </div>
          </div>
        </div>

        <div className="mb-10 text-left">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Hasil Diagnosa & Masalah</h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-sm font-bold text-slate-500 italic mb-2">" {ticket.problem} "</p>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase mb-2">Diagnosa Teknisi:</p>
              <p className="text-sm font-bold text-slate-800 leading-relaxed">{diagnosis || 'Dalam pengecekan lebih lanjut...'}</p>
            </div>
          </div>
        </div>

        <div className="mb-10 text-left">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-1">Rincian Estimasi Biaya</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest">
                <th className="py-3 text-left">Deskripsi Layanan / Suku Cadang</th>
                <th className="py-3 text-center">Harga</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-4 font-bold text-sm text-left">Jasa Teknisi & Pengecekan</td>
                <td className="py-4 text-center text-sm">{formatCurrency(laborCost)}</td>
                <td className="py-4 text-center text-sm font-bold">1</td>
                <td className="py-4 text-right text-sm font-black">{formatCurrency(laborCost)}</td>
              </tr>
              {partsUsed.map((part, i) => (
                <tr key={i}>
                  <td className="py-4 text-left">
                    <p className="text-sm font-bold">{part.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">{part.sku}</p>
                  </td>
                  <td className="py-4 text-center text-sm">{formatCurrency(part.price)}</td>
                  <td className="py-4 text-center text-sm font-bold">{part.quantity}</td>
                  <td className="py-4 text-right text-sm font-black">{formatCurrency(part.price * part.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-6 text-right text-xs font-black uppercase tracking-widest text-slate-400">Total Estimasi Pembayaran</td>
                <td className="py-6 text-right text-2xl font-black text-slate-900">{formatCurrency(finalTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-20 mt-20">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-16">Persetujuan Pelanggan</p>
            <div className="border-b border-slate-900 w-48 mx-auto"></div>
            <p className="text-xs font-bold mt-2">( ........................................ )</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-16">Teknisi Bertugas</p>
            <div className="border-b border-slate-900 w-48 mx-auto"></div>
            <p className="text-xs font-bold mt-2">( {technicians.find(t => t.uid === technicianId)?.displayName || ticket.technicianName || '........................................'} )</p>
          </div>
        </div>

        <div className="absolute bottom-10 left-10 right-10 text-center border-t border-slate-100 pt-6">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Penawaran ini berlaku selama 7 hari sejak tanggal diterbitkan.</p>
        </div>
      </div>

      <AnimatePresence>
        {showPrintPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPrintPreview(false)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            <motion.div 
              role="dialog"
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white md:rounded-3xl shadow-2xl overflow-y-auto max-h-screen md:max-h-[95vh] flex flex-col no-scrollbar"
            >
              {/* Preview Header / Controls */}
              <div className="sticky top-0 z-10 bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg print:hidden">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Pratinjau Nota Penawaran</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Pastikan data sudah sesuai sebelum dicetak</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Cetak Sekarang
                  </button>
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Document Content */}
              <div className="p-10 bg-white text-slate-900 min-h-full">
                <div className="max-w-2xl mx-auto shadow-sm border border-slate-100 p-12 bg-white rounded-sm">
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                    <div className="text-left">
                      <h1 className="text-3xl font-black tracking-tighter text-slate-900">SMARTPHONE SERVICE</h1>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 text-left">Pusat Perbaikan & Suku Cadang</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold uppercase tracking-widest text-right">Penawaran Servis</h2>
                      <p className="text-sm font-mono font-bold text-blue-600 mt-1 text-right">#{ticket.id.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 mb-10">
                    <div className="text-left">
                      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 text-left">Detail Pelanggan</h3>
                      <div className="space-y-1 text-left">
                        <p className="text-base font-black uppercase">{ticket.customerName || 'Pelanggan Umum'}</p>
                        <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 text-right">Detail Perangkat</h3>
                      <div className="space-y-1 text-right">
                        <p className="text-base font-black uppercase text-right">{ticket.deviceModel}</p>
                        <p className="text-xs text-slate-500 font-mono font-bold tracking-tight uppercase text-right">IMEI/SN: {ticket.imei}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10 text-left">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Hasil Diagnosa & Gejala</h3>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Keluhan:</p>
                      <p className="text-sm font-bold text-slate-700 italic border-l-4 border-slate-300 pl-3 mb-4">"{ticket.problem}"</p>
                      
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Analisa Kerusakan:</p>
                        <p className="text-sm font-bold text-slate-800 leading-relaxed text-left">{diagnosis || 'Tahap Pengecekan Intensif'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10 text-left">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-1 text-left">Rincian Estimasi Biaya</h3>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest">
                          <th className="py-3 text-left">Layanan / Sparepart</th>
                          <th className="py-3 text-center">Harga</th>
                          <th className="py-3 text-center">Qty</th>
                          <th className="py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-4 font-bold text-xs text-left">Jasa Teknisi & Lab Biaya</td>
                          <td className="py-4 text-center text-xs">{formatCurrency(laborCost)}</td>
                          <td className="py-4 text-center text-xs font-bold">1</td>
                          <td className="py-4 text-right text-xs font-black">{formatCurrency(laborCost)}</td>
                        </tr>
                        {partsUsed.map((part, i) => (
                          <tr key={i}>
                            <td className="py-4 text-left">
                              <p className="text-xs font-bold">{part.name}</p>
                              <p className="text-[9px] font-mono text-slate-400 uppercase">{part.sku}</p>
                            </td>
                            <td className="py-4 text-center text-xs">{formatCurrency(part.price)}</td>
                            <td className="py-4 text-center text-xs font-bold">{part.quantity}</td>
                            <td className="py-4 text-right text-xs font-black">{formatCurrency(part.price * part.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total Yang Harus Dibayarkan</td>
                          <td className="py-6 text-right text-xl font-black text-slate-900">{formatCurrency(finalTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-10 mt-16 pb-12">
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-16 text-center">Persetujuan Pelanggan</p>
                      <div className="border-b border-slate-900 w-40 mx-auto"></div>
                      <p className="text-[10px] font-bold mt-2 text-center">( {ticket.customerName || '..........................'} )</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-16 text-center">Teknisi Penanggung Jawab</p>
                      <div className="border-b border-slate-900 w-40 mx-auto"></div>
                      <p className="text-[10px] font-bold mt-2 text-center">( {technicians.find(t => t.uid === technicianId)?.displayName || ticket.technicianName || '..........................'} )</p>
                    </div>
                  </div>

                  <div className="text-center pt-6 border-t border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Penawaran estimasi ini valid selama 7 hari kalender.</p>
                  </div>
                </div>
              </div>

              {/* Mobile Floating Warning */}
              <div className="p-4 bg-orange-50 border-t border-orange-100 flex items-center justify-center gap-2 print:hidden sticky bottom-0">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-[10px] font-bold text-orange-700">Jika tombol cetak tidak merespons di HP, silakan buka aplikasi di <b>Tab Baru</b>.</p>
              </div>
            </motion.div>
          </div>
        )}

        {showInventorySearch && (
          <InventorySearchModal 
            inventory={inventory} 
            onClose={() => setShowInventorySearch(false)}
            onSelect={(item) => {
              const existingIdx = partsUsed.findIndex(p => p.id === item.id);
              if (existingIdx > -1) {
                setPartsUsed(partsUsed.map((p, i) => 
                  i === existingIdx ? { ...p, quantity: p.quantity + 1 } : p
                ));
              } else {
                setPartsUsed([...partsUsed, { 
                  id: item.id, 
                  name: item.name, 
                  price: item.sellPrice, 
                  quantity: 1, 
                  sku: item.sku 
                }]);
              }
              setShowInventorySearch(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InventorySearchModal({ 
  inventory, 
  onClose, 
  onSelect 
}: { 
  inventory: InventoryItem[]; 
  onClose: () => void; 
  onSelect: (item: InventoryItem) => void;
}) {
  const [query, setQuery] = useState('');
  
  const filtered = inventory.filter(item => {
    const q = query.toLowerCase();
    return (item.name || '').toLowerCase().includes(q) || 
           (item.sku || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[60vh]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Pilih Suku Cadang</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari suku cadang..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-all group text-left border border-transparent hover:border-blue-100"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 group-hover:bg-blue-100 rounded-lg text-slate-500 group-hover:text-blue-600 transition-colors">
                  <Component className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{item.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-blue-600 text-sm">{formatCurrency(item.sellPrice)}</p>
                <p className={cn(
                  "text-[10px] font-bold",
                  item.stockLevel > 0 ? "text-green-500" : "text-red-500"
                )}>
                  Stok: {item.stockLevel}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm italic">
              Tidak ada hasil yang ditemukan.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white rounded-xl text-slate-400 border border-slate-100">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
        <p className="text-sm font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
