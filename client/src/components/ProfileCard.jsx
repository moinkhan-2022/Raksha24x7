function ProfileCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

export default ProfileCard;
