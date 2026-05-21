import { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Wallet, 
  Banknote,
  Minus,
  Plus,
  QrCode,
  Tag,
  Receipt,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { InventoryItem, UserProfile } from '../types';

export default function POS({ profile }: { profile: UserProfile | null }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await api.inventory.list();
      setItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1, price: product.sellPrice }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleProcessPayment = async () => {
    if (cart.length === 0 || !profile) return;
    setProcessing(true);
    
    try {
      await api.transactions.checkout({
        items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.sellPrice })),
        totalAmount: total,
        tax: tax,
        paymentMethod: paymentMethod,
        cashierId: profile.uid,
      });
      
      setCart([]);
      setSuccess(true);
      fetchInventory();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = items.filter(p => {
    const query = searchQuery.toLowerCase();
    return (p.name || '').toLowerCase().includes(query) || 
           (p.sku || '').toLowerCase().includes(query);
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 max-w-7xl mx-auto">
      {/* Product Catalog */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Kasir Retail</h1>
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               placeholder="Cari item..." 
               className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm" 
             />
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          {filteredProducts.map(product => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:shadow-lg transition-all group overflow-hidden relative"
            >
              <div className="mb-3 p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                <Tag className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{product.category}</p>
              <h3 className="font-bold text-slate-900 mt-1 line-clamp-1">{product.name}</h3>
              <p className="text-sm font-bold text-blue-600 mt-2">{formatCurrency(product.sellPrice)}</p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
                <span>Stok: {product.stockLevel}</span>
                <Plus className="w-4 h-4 text-slate-200 group-hover:text-blue-500 transition-colors" />
              </div>
            </motion.button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              <p>Produk tidak ditemukan di inventaris.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart / Summary */}
      <div className="w-96 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden self-start sticky top-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">Pesanan Saat Ini</h2>
          </div>
          <button onClick={() => setCart([])} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Keranjang masih kosong</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map(item => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={item.id} 
                  className="flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-blue-600 font-bold">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-all shadow-sm">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-all shadow-sm">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-1 text-slate-300 hover:text-red-500 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'cash', icon: Banknote, label: 'Tunai' },
              { id: 'transfer', icon: Wallet, label: 'Bank' },
              { id: 'qris', icon: QrCode, label: 'QRIS' },
              { id: 'card', icon: CreditCard, label: 'Kartu' },
            ].map(method => (
              <button 
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  paymentMethod === method.id 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-blue-400"
                )}
              >
                <method.icon className={cn("w-5 h-5", paymentMethod === method.id ? "text-white" : "text-slate-400")} />
                <span className="text-[10px] font-bold uppercase">{method.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Pajak (11%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-slate-900 pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0 || processing}
            onClick={handleProcessPayment}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Receipt className="w-5 h-5" />
            )}
            {success ? 'Pembayaran Berhasil' : processing ? 'Memproses...' : 'Proses Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  );
}
