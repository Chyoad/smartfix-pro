import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Wrench, 
  Smartphone,
  Mail,
  Activity,
  MoreVertical,
  Search,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    displayName: '',
    email: '',
    role: 'technician',
    isActive: true
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.users.list();
      setEmployees(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const query = searchTerm.toLowerCase();
    return (emp.displayName || '').toLowerCase().includes(query) ||
           (emp.email || '').toLowerCase().includes(query) ||
           (emp.role || '').toLowerCase().includes(query);
  });

  const handleAddEmployee = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.users.create({
        ...newEmployee,
      });
      setShowAddModal(false);
      setNewEmployee({ displayName: '', email: '', role: 'technician', isActive: true });
      fetchEmployees();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sumber Daya Manusia</h1>
          <p className="text-slate-500 mt-1">Kelola akses enterprise dan pantau performa teknisi.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Karyawan
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EmployeeStat card title="Staf Aktif" value={employees.filter(e => e.isActive).length} icon={Users} color="bg-blue-50 text-blue-600" />
        <EmployeeStat card title="Total Teknisi" value={employees.filter(e => e.role === 'technician').length} icon={Wrench} color="bg-indigo-50 text-indigo-600" />
        <EmployeeStat card title="Admin Sistem" value={employees.filter(e => e.role === 'admin').length} icon={Shield} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  placeholder="Cari personil..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-8 py-5">Personil</th>
                <th className="px-8 py-5">Peran Keamanan</th>
                <th className="px-8 py-5">Status Aktif</th>
                <th className="px-8 py-5">Produktivitas</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.uid} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500">
                        {emp.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{emp.displayName}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {emp.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border",
                      emp.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-100" :
                      emp.role === 'technician' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      "bg-slate-50 text-slate-700 border-slate-100"
                    )}>
                      {emp.role === 'admin' ? 'Administrator' : emp.role === 'technician' ? 'Teknisi' : emp.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {emp.isActive ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                        <CheckCircle className="w-4 h-4" /> Aktif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <XCircle className="w-4 h-4" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                       </div>
                       <span className="text-xs font-bold text-slate-600">85%</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm">
                    Tidak ada profil personil terdeteksi dalam basis data regional.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Tambah Karyawan Baru</h2>
                <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nama Lengkap</label>
                  <input required value={newEmployee.displayName || ''} onChange={e => setNewEmployee({...newEmployee, displayName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="cth., Alex Johnson" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input required type="email" value={newEmployee.email || ''} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="alex@service.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Peran / Role</label>
                  <select value={newEmployee.role || 'technician'} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                     <option value="technician">Teknisi</option>
                     <option value="admin">Admin</option>
                     <option value="cashier">Kasir</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 mt-4 transition-all active:scale-95">
                  Daftarkan Personil
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmployeeStat({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
      </div>
      <div className={cn("p-4 rounded-2xl", color)}>
        <Icon className="w-8 h-8" />
      </div>
    </div>
  );
}
