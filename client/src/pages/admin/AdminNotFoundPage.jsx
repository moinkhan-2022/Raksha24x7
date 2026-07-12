import { Link } from 'react-router-dom';

function AdminNotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <section className="max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">404</p>
        <h1 className="mt-3 text-2xl font-bold">Admin page not found</h1>
        <p className="mt-2 text-sm text-slate-300">The admin page you are looking for does not exist.</p>
        <Link to="/admin/dashboard" className="mt-6 inline-flex rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500">Go to Admin Home</Link>
      </section>
    </main>
  );
}

export default AdminNotFoundPage;
