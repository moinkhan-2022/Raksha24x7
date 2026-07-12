import { Link } from 'react-router-dom';

function AdminForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <section className="max-w-md rounded-3xl border border-red-400/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">403 Forbidden</p>
        <h1 className="mt-3 text-2xl font-bold">Admin access denied</h1>
        <p className="mt-2 text-sm text-slate-300">You do not have permission to access this admin area.</p>
        <Link to="/admin/login" className="mt-6 inline-flex rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500">Back to Admin Login</Link>
      </section>
    </main>
  );
}

export default AdminForbiddenPage;
