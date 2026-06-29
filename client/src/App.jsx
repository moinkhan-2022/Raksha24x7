function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <section className="max-w-2xl w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Raksha 24x7</h1>
        <p className="mt-3 text-slate-300">
          Module 1 is ready: React + Vite + Tailwind frontend and Express + MongoDB backend.
        </p>
        <div className="mt-6 text-sm text-slate-400">
          API health endpoint: <code className="text-emerald-400">/api/health</code>
        </div>
      </section>
    </main>
  );
}

export default App;
