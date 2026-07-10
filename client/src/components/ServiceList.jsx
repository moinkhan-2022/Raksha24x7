import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { SearchX } from 'lucide-react';
import ServiceCard from './ServiceCard';

function ServiceList({
  services,
  loading = false,
  selectedServiceId,
  onView,
  onNavigate,
  onShare,
  onNotify,
  theme = 'dark',
  layout = 'list',
  emptyMessage = 'No services match your search.'
}) {
  const isLight = theme === 'light';
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef(null);
  const gridClass = layout === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3';
  const visibleServices = useMemo(() => services.slice(0, visibleCount), [services, visibleCount]);

  useEffect(() => { setVisibleCount(50); }, [services]);
  useEffect(() => {
    if (!loadMoreRef.current || visibleCount >= services.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((count) => Math.min(count + 50, services.length));
    }, { rootMargin: '400px' });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [services.length, visibleCount]);

  if (loading && !services.length) {
    return <div className={gridClass}>{Array.from({ length: layout === 'grid' ? 6 : 4 }).map((_, index) => <div key={index} className={`h-60 animate-pulse rounded-2xl border ${isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-white/5'}`} />)}</div>;
  }

  if (!services.length) {
    return <div className={`rounded-2xl border border-dashed p-8 text-center text-sm ${isLight ? 'border-slate-300 text-slate-600' : 'border-white/10 text-slate-400'}`}><SearchX className="mx-auto h-8 w-8 text-slate-500" /><p className="mt-3">{emptyMessage}</p></div>;
  }

  return (
    <div className={gridClass}>
      {visibleServices.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          theme={theme}
          selected={selectedServiceId === service.id}
          onView={onView}
          onNavigate={onNavigate}
          onShare={onShare}
          onNotify={onNotify}
        />
      ))}
      {visibleCount < services.length && <div ref={loadMoreRef} className={`h-8 animate-pulse rounded-xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} aria-label="Loading more services" />}
      {loading && services.length > 0 && <div className={`rounded-xl border p-3 text-center text-xs ${isLight ? 'border-slate-200 bg-slate-50 text-blue-700' : 'border-white/10 bg-white/5 text-blue-200'}`}>Loading more categories...</div>}
    </div>
  );
}

export default memo(ServiceList);
