import { useState } from 'react';
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  Plus, 
  Search, 
  Settings, 
  Smartphone,
  Server,
  Zap
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export default function Assets() {
  const [assets, setAssets] = useState([
    { id: '1', name: 'Microscope Digital 4K', category: 'Testing Equipment', status: 'Active', value: 12000000, serial: 'MS-402-A' },
    { id: '2', name: 'BGA Reballing Station', category: 'Soldering', status: 'Active', value: 25000000, serial: 'BGA-X9-99' },
    { id: '3', name: 'MacBook Pro M2 (Service Admin)', category: 'Computing', status: 'Maintenance', value: 32000000, serial: 'AAPL-MBP-2023' },
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Enterprise Assets</h1>
          <p className="text-slate-500 mt-1">Lifecycle tracking for internal tools and equipment.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          Register Asset
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AssetMiniStat label="Net Capex" value={formatCurrency(assets.reduce((s, a) => s + a.value, 0))} icon={Zap} color="text-yellow-600 bg-yellow-50" />
        <AssetMiniStat label="Fixed Assets" value={assets.length} icon={Server} color="text-blue-600 bg-blue-50" />
        <AssetMiniStat label="Active Units" value={assets.filter(a => a.status === 'Active').length} icon={Cpu} color="text-green-600 bg-green-50" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input placeholder="Filter fixed assets..." className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-8 py-5">Asset Descriptor</th>
                <th className="px-8 py-5">Classification</th>
                <th className="px-8 py-5">Value</th>
                <th className="px-8 py-5">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-2xl text-slate-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{asset.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">{asset.serial}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-slate-500">{asset.category}</span>
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-900">{formatCurrency(asset.value)}</td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-1 rounded-full",
                      asset.status === 'Active' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AssetMiniStat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={cn("p-4 rounded-2xl", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
      </div>
    </div>
  );
}
