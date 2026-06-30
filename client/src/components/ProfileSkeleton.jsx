function ProfileSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ))}
    </div>
  );
}

export default ProfileSkeleton;
