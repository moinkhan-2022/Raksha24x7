import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

const stats = [
  { value: 10000, suffix: '+', label: 'Protected Users' },
  { value: 25000, suffix: '+', label: 'Emergency Alerts' },
  { value: 98, suffix: '%', label: 'Success Rate' },
  { value: 24, suffix: '×7', label: 'Availability' },
  { value: 12, suffix: '+', label: 'Safety Features' }
];

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, margin: '-60px' });
  const count = useMotionValue(0);
  const display = useTransform(count, (latest) => Math.round(latest).toLocaleString());
  useEffect(() => {
    if (!visible) return undefined;
    const controls = animate(count, value, { duration: 1.5, ease: 'easeOut' });
    return controls.stop;
  }, [count, value, visible]);
  return <span ref={ref}><motion.span>{display}</motion.span>{suffix}</span>;
}

function LandingStats() {
  return (
    <section className="px-4 py-10 md:px-6" aria-label="Raksha24x7 statistics">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:grid-cols-3 lg:grid-cols-5 md:p-6">
        {stats.map((stat) => <div key={stat.label} className="rounded-2xl bg-slate-950/35 p-4 text-center"><p className="text-2xl font-extrabold text-white md:text-3xl"><Counter value={stat.value} suffix={stat.suffix} /></p><p className="mt-1 text-xs text-slate-400">{stat.label}</p></div>)}
      </div>
    </section>
  );
}

export default LandingStats;
