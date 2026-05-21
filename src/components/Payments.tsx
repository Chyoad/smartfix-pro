import React, { useEffect, useState } from 'react';
import { 
  Search, 
  CreditCard, 
  Wallet, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  User, 
  Smartphone,
  Receipt,
  X,
  Printer
} from 'lucide-react';
import { api } from '../lib/api';
import { ServiceTicket, UserProfile, ServiceStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ServiceReceipt from './ServiceReceipt';

export default function Payments({ profile }: { profile: UserProfile | null }) {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qris'>('cash');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [includeTax, setIncludeTax] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{ ticket: ServiceTicket; totals: any; method: string } | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const calculateTotal = () => {
    if (!selectedTicket) return { subtotal: 0, tax: 0, discountAmount: 0, total: 0 };
    const base = selectedTicket.finalCost || selectedTicket.estimatedCost || 0;
    const discountAmount = discount;
    const subtotalAfterDiscount = Math.max(0, base - discountAmount);
    const tax = includeTax ? Math.round(subtotalAfterDiscount * 0.11) : 0;
    return {
      subtotal: base,
      tax,
      discountAmount,
      total: subtotalAfterDiscount + tax
    };
  };

  const totals = calculateTotal();
  const change = Math.max(0, cashAmount - totals.total);

  const fetchTickets = async () => {
    try {
      const data = await api.tickets.list();
      // Filter only Finished / Siap tickets that are not Cancelled or Delivered
      const readyTickets = data.filter((t: any) => 
        t.status === 'finished'
      );
      setTickets(readyTickets);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!selectedTicket) return;
    setProcessing(true);
    
    try {
      const { total } = totals;
      
      // 1. Create Transaction
      await api.transactions.create({
        type: 'service',
        description: `Pembayaran Servis #${selectedTicket.id} - ${selectedTicket.deviceModel}${includeTax ? ' (Incl. PPN)' : ''}${discount > 0 ? ' (Disc. Applied)' : ''}`,
        totalAmount: total,
        amount: total,
        paymentMethod,
        ticketId: selectedTicket.id,
        category: 'service'
      });

      // 2. Update Ticket Status to Delivered
      const historyEntry = {
        date: new Date().toISOString(),
        status: 'delivered',
        note: `Pembayaran diterima via ${paymentMethod.toUpperCase()}. Unit telah diambil pelanggan.`,
        technicianName: profile?.displayName || 'Sistem'
      };

      const duration = Number(selectedTicket.warrantyDuration || 0);
      const updateData: any = {
        status: 'delivered',
        warrantyDuration: duration, // Ensure it's preserved
        repairHistory: [...(selectedTicket.repairHistory || []), historyEntry]
      };

      if (duration > 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + duration);
        updateData.warrantyExpiry = expiryDate.toISOString();
      } else {
        // Fallback or explicit null
        updateData.warrantyExpiry = null;
      }

      await api.tickets.update(selectedTicket.id, updateData);

      setReceiptData({
        ticket: selectedTicket,
        totals: { ...totals },
        method: paymentMethod
      });

      setSuccess(selectedTicket.id);
      setSelectedTicket(null);
      fetchTickets();
      
      // Removed the 5s auto-hide to allow user to print at their leisure
      // setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error(error);
      alert('Gagal memproses pembayaran');
    } finally {
      setProcessing(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const query = searchTerm.toLowerCase();
    return (t.customerName || '').toLowerCase().includes(query) ||
           (t.id || '').toLowerCase().includes(query) ||
           (t.deviceModel || '').toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pembayaran Servis</h1>
          <p className="text-slate-500 font-medium">Proses pengambilan unit dan pelunasan biaya servis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari Nama Pelanggan, No Tiket, atau Model Device..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Tiket</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Total Biaya</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{ticket.customerName}</p>
                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter mt-0.5">{ticket.id} • {ticket.deviceModel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          "bg-green-100 text-green-600"
                        )}>
                          Siap
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-slate-900">
                        {formatCurrency(ticket.finalCost || ticket.estimatedCost || 0)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => setSelectedTicket(ticket)}
                          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-2 ml-auto"
                        >
                          Bayar <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic">
                        {loading ? 'Memuat data...' : 'Tidak ada tiket yang siap bayar saat ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Processing Panel */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.div 
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border-2 border-blue-600 p-8 shadow-xl shadow-blue-50 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Proses Pembayaran</h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{selectedTicket.id}</p>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pelanggan</p>
                    <p className="font-bold text-slate-900">{selectedTicket.customerName}</p>
                    <p className="text-xs text-slate-500">{selectedTicket.deviceModel}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Tagihan</p>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={includeTax} 
                            onChange={e => setIncludeTax(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          <span className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-slate-700 transition-colors">PPN 11%</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-2">
                       <div className="flex justify-between text-xs font-medium text-slate-500">
                         <span>Biaya Servis</span>
                         <span>{formatCurrency(totals.subtotal)}</span>
                       </div>
                       <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                         <div className="flex items-center gap-2">
                           <span>Diskon</span>
                           <input 
                              type="number"
                              value={discount ?? 0}
                              onChange={e => setDiscount(Number(e.target.value))}
                              placeholder="0"
                              className="w-20 px-2 py-0.5 bg-white border border-slate-200 rounded text-right outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                           />
                         </div>
                         <span className="text-red-500">-{formatCurrency(totals.discountAmount)}</span>
                       </div>
                       {includeTax && (
                         <div className="flex justify-between text-xs font-medium text-slate-500">
                           <span>PPN (11%)</span>
                           <span>{formatCurrency(totals.tax)}</span>
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode Pembayaran</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash', label: 'Tunai', icon: Wallet },
                        { id: 'transfer', label: 'Transfer', icon: CreditCard },
                        { id: 'qris', label: 'QRIS', icon: Smartphone },
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group",
                            paymentMethod === method.id 
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <method.icon className={cn("w-5 h-5", paymentMethod === method.id ? "text-white" : "group-hover:text-slate-600")} />
                          <span className="text-[10px] font-black uppercase">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pembayaran Tunai</p>
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                          <input 
                            type="number"
                            value={cashAmount ?? 0}
                            onChange={e => setCashAmount(Number(e.target.value))}
                            placeholder="Nominal Diterima"
                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-lg"
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-2xl">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kembalian</span>
                          <span className="text-lg font-black text-green-400">{formatCurrency(change)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-500">Total Tagihan</span>
                      <span className="text-xl font-black text-slate-900">
                        {formatCurrency(totals.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={processPayment}
                  disabled={processing}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:translate-y-[-2px] active:translate-y-[0px] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Konfirmasi Pelunasan
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                  <CreditCard className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-500">Pilih tiket di samping untuk memproses pembayaran</p>
              </div>
            )}
          </AnimatePresence>

          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-600 rounded-3xl p-6 text-white text-center shadow-xl shadow-green-100"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black tracking-tight mb-1">Pembayaran Berhasil!</h3>
              <p className="text-green-100 text-xs font-medium mb-4">Transaksi untuk #{success} telah dicatat.</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setShowReceipt(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-600 font-bold text-xs rounded-xl hover:bg-green-50 transition-all shadow-lg"
                >
                  <Printer className="w-4 h-4" /> Cetak Struk
                </button>
                <button 
                  onClick={() => setSuccess(null)}
                  className="text-[10px] font-bold text-green-200 hover:text-white transition-colors uppercase tracking-widest mt-2"
                >
                  Selesai & Tutup
                </button>
              </div>
            </motion.div>
          )}

          {showReceipt && receiptData && (
            <ServiceReceipt 
              ticket={receiptData.ticket}
              totals={receiptData.totals}
              paymentMethod={receiptData.method}
              onClose={() => setShowReceipt(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
