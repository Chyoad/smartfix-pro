import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wrench, 
  Package, 
  Users, 
  Smartphone, 
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { api } from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

const mockData = [
  { name: 'Mon', service: 12, sales: 4500000 },
  { name: 'Tue', service: 15, sales: 5200000 },
  { name: 'Wed', service: 8, sales: 3800000 },
  { name: 'Thu', service: 22, sales: 7100000 },
  { name: 'Fri', service: 18, sales: 6300000 },
  { name: 'Sat', service: 25, sales: 8900000 },
  { name: 'Sun', service: 5, sales: 2100000 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeServices: 0,
    totalSalesToday: 0,
    partsLow: 0,
    productivity: 92
  });

  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topTechnicians, setTopTechnicians] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [services, transactions, inventory] = await Promise.all([
        api.tickets.list(),
        api.transactions.list(),
        api.inventory.list()
      ]);

      // 1. Active Services
      const active = services.filter((d: any) => !['delivered', 'cancel'].includes(d.status)).length;
      
      // 2. Today's Sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = transactions
        .filter((d: any) => new Date(d.createdAt).getTime() >= today.getTime())
        .reduce((sum: number, d: any) => sum + (d.totalAmount || 0), 0);

      // 3. Low Stock
      const low = inventory.filter((d: any) => d.stockLevel <= d.minStockAlert).length;

      setStats({
        activeServices: active,
        totalSalesToday: todaySales,
        partsLow: low,
        productivity: Math.round(services.filter((d: any) => d.status === 'delivered').length / (services.length || 1) * 100)
      });

      setRecentServices(services.slice(0, 5).filter((s:any) => s.status !== 'delivered'));

      // Technician Leaderboard
      const techStats = services.reduce((acc: any, s: any) => {
        if (s.status === 'delivered') {
          const name = s.technicianName || 'Tanpa Nama';
          if (!acc[name]) acc[name] = 0;
          acc[name] += 1;
        }
        return acc;
      }, {});

      const topTechs = Object.entries(techStats)
        .map(([name, jobs]) => ({ name, jobs }))
        .sort((a: any, b: any) => b.jobs - a.jobs)
        .slice(0, 5);
      
      setTopTechnicians(topTechs);

      // Group by day for chart
      const last7Days = transactions.filter((t: any) => {
        const d = new Date(t.createdAt);
        const now = new Date();
        return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      }).reduce((acc: any, t: any) => {
        const day = new Date(t.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
        if (!acc[day]) acc[day] = { service: 0, sales: 0 };
        if (t.type === 'service') acc[day].service += (t.totalAmount || 0);
        else acc[day].sales += (t.totalAmount || 0);
        return acc;
      }, {});

      const data = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        name: day,
        service: last7Days[day]?.service || 0,
        sales: last7Days[day]?.sales || 0
      }));
      setChartData(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan semua data servis dan pembayaran? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        await api.system.reset();
        fetchData();
        alert('Data berhasil dikosongkan.');
      } catch (error) {
        alert('Gagal mengosongkan data.');
      }
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ikhtisar Sistem</h1>
          <p className="text-slate-500 mt-1">Analisis enterprise dan operasional real-time.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-white text-red-600 font-bold rounded-xl border border-red-100 shadow-sm hover:bg-red-50 transition-all flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Reset Data
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">
            Sinkron Data
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Servis Aktif" 
          value={stats.activeServices} 
          trend="+12%" 
          icon={Wrench} 
          color="blue"
        />
        <StatCard 
          title="Pendapatan Hari Ini" 
          value={formatCurrency(stats.totalSalesToday)} 
          trend="+8.4%" 
          icon={TrendingUp} 
          color="green"
        />
        <StatCard 
          title="Stok Menipis" 
          value={stats.partsLow} 
          trend="Kritis" 
          icon={Package} 
          color="orange"
          isAlert
        />
        <StatCard 
          title="Output Tim" 
          value={`${stats.productivity}%`} 
          trend="Stabil" 
          icon={Users} 
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Performa Mingguan</h3>
              <select className="text-sm border-slate-200 rounded-md focus:ring-blue-500">
                <option>7 Hari Terakhir</option>
                <option>30 Hari Terakhir</option>
              </select>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.length ? chartData : mockData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="sales" name="Penjualan Retail" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="service" name="Pendapatan Servis" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Distribusi Perangkat</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'iPhone', value: 45 },
                          { name: 'Samsung', value: 30 },
                          { name: 'Xiaomi', value: 15 },
                          { name: 'Others', value: 10 },
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Papan Peringkat Teknisi</h3>
                <div className="space-y-4">
                   {topTechnicians.map((tech, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">
                           {i + 1}
                         </div>
                         <span className="text-sm font-medium">{tech.name}</span>
                       </div>
                       <div className="text-right">
                         <p className="text-xs font-bold text-blue-600">{tech.jobs} Jobs</p>
                       </div>
                     </div>
                   ))}
                   {topTechnicians.length === 0 && (
                     <div className="py-8 text-center text-slate-400 text-xs italic">
                       Belum ada data performa.
                     </div>
                   )}
                </div>
            </div>
          </div>
        </div>

        {/* Sidebar News/Logs */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Aktivitas Langsung
            </h3>
            <div className="space-y-4">
              {recentServices.map((service) => (
                <div key={service.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold truncate pr-4">{service.customerName || 'Walk-in'}</p>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      service.status === 'finished' ? "bg-green-100 text-green-700" : 
                      service.status === 'waiting' ? "bg-slate-100 text-slate-600" : 
                      service.status === 'checking' ? "bg-blue-100 text-blue-600" :
                      service.status === 'on_progress' ? "bg-indigo-100 text-indigo-700" : 
                      service.status === 'pending_sparepart' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-700"
                    )}>
                      {service.status === 'finished' ? 'Siap' : 
                       service.status === 'waiting' ? 'Menunggu' : 
                       service.status === 'checking' ? 'Pengecekan' :
                       service.status === 'on_progress' ? 'Pengerjaan' : 
                       service.status === 'pending_sparepart' ? 'Suku Cadang' : service.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{service.deviceModel}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {new Date(service.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {recentServices.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada servis aktif.
                </div>
              )}
            </div>
            <button className="w-full mt-4 text-sm font-bold text-blue-600 hover:underline">
              Lihat Semua Aktivitas
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl">
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-white/20 rounded-lg">
                 <AlertCircle className="w-6 h-6" />
               </div>
               <h4 className="font-bold">Status Sistem</h4>
             </div>
             <p className="text-blue-100 text-sm mb-4">Semua node operasional. Pencadangan basis data berhasil pada pukul 04:00 pagi.</p>
             <div className="flex items-center justify-between">
               <span className="text-xs font-medium text-blue-200">Uptime: 99.9%</span>
               <div className="flex gap-1">
                 {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-6 bg-white/30 rounded-full"></div>)}
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color, isAlert }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "text-[10px] px-2 py-1 rounded-full font-black uppercase flex items-center gap-1",
          isAlert ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
        )}>
          {trend}
          {!isAlert && <ArrowUpRight className="w-3 h-3" />}
        </div>
      </div>
      <div>
        <h4 className="text-slate-500 text-sm font-medium">{title}</h4>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
      {/* Decorative pulse if alert */}
      {isAlert && (
        <div className="absolute top-2 right-2 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
      )}
    </motion.div>
  );
}
