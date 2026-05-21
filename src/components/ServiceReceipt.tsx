import React, { useRef } from 'react';
import { Printer, X, Download } from 'lucide-react';
import { ServiceTicket, UserProfile } from '../types';
import { formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';

interface ServiceReceiptProps {
  ticket: ServiceTicket;
  paymentMethod: string;
  totals: {
    subtotal: number;
    tax: number;
    discountAmount: number;
    total: number;
  };
  onClose: () => void;
}

export default function ServiceReceipt({ ticket, paymentMethod, totals, onClose }: ServiceReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowUrl = window.location.href;
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Struk Servis - ${ticket.id}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                @page { margin: 0; }
                body { padding: 40px; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-slate-400" />
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Pratinjau Struk</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50">
          {/* Printable Area */}
          <div ref={printRef} className="bg-white shadow-sm mx-auto p-8 rounded-lg max-w-md w-full border border-slate-200">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">SERVICE CENTER</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Solusi Perbaikan Gadget Terpercaya</p>
              <div className="mt-4 border-b-2 border-dashed border-slate-200 pb-4">
                <p className="text-[10px] text-slate-400 font-medium">Jl. Raya Tekno No. 123, Indonesia</p>
                <p className="text-[10px] text-slate-400 font-medium">CS: +62 812 3456 7890</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tiket #</p>
                  <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{ticket.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tanggal</p>
                  <p className="text-[10px] font-bold text-slate-900">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pelanggan</p>
                    <p className="text-[11px] font-black text-slate-900 truncate">{ticket.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Unit</p>
                    <p className="text-[11px] font-black text-slate-900 truncate">{ticket.deviceModel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">Rincian Pekerjaan</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-600">Jasa Servis & Perbaikan</span>
                  <span className="font-black text-slate-900">{formatCurrency(totals.subtotal)}</span>
                </div>
                {/* Simplified list check */}
                {Array.isArray(ticket.partsUsed) && ticket.partsUsed.map((part: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] pl-4 text-slate-500 italic">
                    <span>- {part.name} (x{part.quantity})</span>
                    <span>included</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                <span className="font-bold text-slate-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-500 uppercase tracking-widest">Diskon</span>
                  <span className="font-bold text-red-500">-{formatCurrency(totals.discountAmount)}</span>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-500 uppercase tracking-widest">PPN (11%)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totals.tax)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tighter">Total Bayar</span>
                <span className="text-xl font-black text-blue-600 italic tracking-tighter">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div className="mt-8 text-center pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-600 mb-1 italic">Metode Pembayaran: <span className="uppercase">{paymentMethod}</span></p>
              <div className="mt-4 flex flex-col items-center gap-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Terima kasih atas kepercayaan Anda</p>
                <div className="w-12 h-1 bg-slate-900 rounded-full mt-2" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            Tutup
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak Sekarang
          </button>
        </div>
      </motion.div>
    </div>
  );
}
