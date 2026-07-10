import { Activity, Database, Gauge, Server } from 'lucide-react';

function PerformanceDashboard({ metrics, progress, categoryStatus }) {
  if (!import.meta.env.DEV) return null;
  const loaded = Object.values(categoryStatus).filter((value) => value === 'loaded').length;
  return (
    <details className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs text-slate-300">
      <summary className="cursor-pointer font-semibold text-cyan-200">Developer Performance Dashboard</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Server} label="Current server" value={String(metrics.server || 'Selecting...').replace('https://', '').split('/')[0]} />
        <Metric icon={Gauge} label="Load / progress" value={`${metrics.averageLoadTime || 0} ms · ${progress}%`} />
        <Metric icon={Database} label="Cache" value={`${metrics.hits || 0} hits · ${metrics.hitRate || 0}%`} />
        <Metric icon={Activity} label="Requests" value={`${metrics.activeRequests || 0} active · ${metrics.cancelled || 0} cancelled`} />
      </div>
      <p className="mt-2 text-slate-500">{loaded} categories loaded · {metrics.size || 0} memory entries · fastest {metrics.fastestCategory || 'N/A'} · slowest {metrics.slowestCategory || 'N/A'}</p>
    </details>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-slate-950/45 p-2"><p className="flex items-center gap-1 text-slate-500"><Icon className="h-3 w-3" />{label}</p><p className="mt-1 truncate text-slate-200">{value}</p></div>;
}

export default PerformanceDashboard;
