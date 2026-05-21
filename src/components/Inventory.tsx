import { useState, useEffect, FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Filter,
  Layers,
  Archive,
  BarChart3,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { InventoryItem } from '../types';

export default function Inventory({ profile }: any) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Suku Cadang',
    stockLevel: 0,
    minStockAlert: 5,
    buyPrice: 0,
    sellPrice: 0,
    warehouse: 'Main Warehouse'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const data = await api.inventory.list();
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        stockLevel: Number(formData.stockLevel),
        minStockAlert: Number(formData.minStockAlert),
        buyPrice: Number(formData.buyPrice),
        sellPrice: Number(formData.sellPrice),
      };

      if (editingItem) {
        await api.inventory.update(editingItem.id, payload);
      } else {
        await api.inventory.create(payload);
      }
      
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        name: '', sku: '', barcode: '', category: 'Suku Cadang',
        stockLevel: 0, minStockAlert: 5, buyPrice: 0, sellPrice: 0,
        warehouse: 'Main Warehouse'
      });
      fetchItems();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan item.');
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || '',
      category: item.category,
      stockLevel: item.stockLevel,
      minStockAlert: item.minStockAlert,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      warehouse: item.warehouse || 'Main Warehouse'
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      try {
        await api.inventory.delete(id);
        fetchItems();
      } catch (error: any) {
        alert('Gagal menghapus: Item ini sedang digunakan atau memiliki riwayat transaksi.');
      }
    }
  };

  const totalValuation = items.reduce((sum, item) => sum + (item.stockLevel * item.sellPrice), 0);
  const lowStockCount = items.filter(i => i.stockLevel <= i.minStockAlert).length;

  const filteredItems = items.filter(item => {
    const query = (searchTerm || '').toLowerCase();
    return (item.name || '').toLowerCase().includes(query) ||
           (item.sku || '').toLowerCase().includes(query) ||
           (item.category || '').toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gudang & Stok</h1>
          <p className="text-slate-500 mt-1">Manajemen inventaris enterprise multi-lokasi.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Stock Opname
          </button>
          <button 
            onClick={() => {
              setEditingItem(null);
              setFormData({
                name: '', sku: '', barcode: '', category: 'Suku Cadang',
                stockLevel: 0, minStockAlert: 5, buyPrice: 0, sellPrice: 0,
                warehouse: 'Main Warehouse'
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah SKU Baru
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Valuasi</p>
             <p className="text-2xl font-bold mt-1 text-slate-900">{formatCurrency(totalValuation)}</p>
           </div>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
             <Layers className="w-6 h-6" />
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Jumlah SKU</p>
             <p className="text-2xl font-bold mt-1 text-slate-900">{items.length} Item</p>
           </div>
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
             <Archive className="w-6 h-6" />
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-red-500">
           <div>
             <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Peringatan Stok Rendah</p>
             <p className="text-2xl font-bold mt-1 text-slate-900">{lowStockCount} Item</p>
           </div>
           <div className="p-3 bg-red-50 text-red-600 rounded-xl">
             <AlertTriangle className="w-6 h-6" />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
              placeholder="Cari item, SKU, atau kategori..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
             />
           </div>
           <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
             <Filter className="w-5 h-5" />
           </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                <th className="px-6 py-4">Detail Item</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Tingkat Stok</th>
                <th className="px-6 py-4">Harga Jual</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold uppercase tracking-wider">{item.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            (item.stockLevel / item.minStockAlert) > 1.5 ? "bg-green-500" : (item.stockLevel <= item.minStockAlert) ? "bg-red-500" : "bg-orange-500"
                          )} 
                          style={{ width: `${Math.min(100, (item.stockLevel / (item.minStockAlert * 2)) * 100)}%` }} 
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        item.stockLevel <= item.minStockAlert ? "text-red-600" : "text-slate-600"
                      )}>{item.stockLevel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">{formatCurrency(item.sellPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.stockLevel <= item.minStockAlert ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Pasok Ulang
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Aman
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                    Tidak ada item yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowModal(false); setEditingItem(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingItem ? 'Edit Item Inventaris' : 'Tambah SKU Baru'}
                </h2>
                <button onClick={() => { setShowModal(false); setEditingItem(null); }}>
                  <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nama Item</label>
                  <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Kode SKU</label>
                  <input required value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Kategori</label>
                  <select value={formData.category || 'Suku Cadang'} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium">
                    <option>Suku Cadang</option>
                    <option>Aksesoris</option>
                    <option>Peralatan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Stok Saat Ini</label>
                  <input type="number" required value={formData.stockLevel ?? 0} onChange={e => setFormData({...formData, stockLevel: e.target.value === '' ? 0 : parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Peringatan Min.</label>
                  <input type="number" required value={formData.minStockAlert ?? 5} onChange={e => setFormData({...formData, minStockAlert: e.target.value === '' ? 0 : parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Harga Beli</label>
                  <input type="number" required value={formData.buyPrice ?? 0} onChange={e => setFormData({...formData, buyPrice: e.target.value === '' ? 0 : parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Harga Jual</label>
                  <input type="number" required value={formData.sellPrice ?? 0} onChange={e => setFormData({...formData, sellPrice: e.target.value === '' ? 0 : parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                </div>
                <div className="md:col-span-2 pt-4">
                  <button type="submit" className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    {editingItem ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingItem ? 'Simpan Perubahan Inventaris' : 'Daftarkan Item ke Gudang'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
