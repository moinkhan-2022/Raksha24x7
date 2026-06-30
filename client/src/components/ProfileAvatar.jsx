function ProfileAvatar({ src, name }) {
  if (src) return <img src={src} alt={name} className="h-20 w-20 rounded-full object-cover border border-white/20" />;
  return <div className="h-20 w-20 rounded-full bg-red-600/30 border border-white/20 grid place-items-center text-xl font-bold">{(name || 'U').slice(0,1).toUpperCase()}</div>;
}

export default ProfileAvatar;
