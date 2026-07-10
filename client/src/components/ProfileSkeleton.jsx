function ProfileSkeleton({ theme = 'dark' }) {
  const isLight = theme === 'light';
  return (
    <div>
      <div className={`mb-6 h-20 max-w-xl animate-pulse rounded-3xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />
      <div className="grid gap-5 lg:grid-cols-[1.05fr_1.35fr_0.8fr]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`h-[520px] animate-pulse rounded-3xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`} />
        ))}
      </div>
    </div>
  );
}

export default ProfileSkeleton;
