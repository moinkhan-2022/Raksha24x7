import { memo } from 'react';
import { SearchX } from 'lucide-react';
import ServiceCard from './ServiceCard';

function ServiceList({
  services,
  loading = false,
  favoriteIds,
  selectedServiceId,
  onToggleFavorite,
  onView,
  onNotify,
  layout = 'list',
  emptyMessage = 'No services match your search.'
}) {
  const gridClass = layout === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3';

  if (loading) {
    return <div className={gridClass}>{Array.from({ length: layout === 'grid' ? 6 : 4 }).map((_, index) => <div key={index} className="h-60 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}</div>;
  }

  if (!services.length) {
    return <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400"><SearchX className="mx-auto h-8 w-8 text-slate-500" /><p className="mt-3">{emptyMessage}</p></div>;
  }

  return (
    <div className={gridClass}>
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          isFavorite={favoriteIds.has(service.placeId)}
          selected={selectedServiceId === service.id}
          onToggleFavorite={onToggleFavorite}
          onView={onView}
          onNotify={onNotify}
        />
      ))}
    </div>
  );
}

export default memo(ServiceList);
