import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login({ email: form.email, password: form.password });
      setToast('Login successful');
      navigate('/dashboard');
    } catch (err) {
      setToast(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Toast message={toast} type={toast.includes('successful') ? 'success' : 'error'} />
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-indigo-500/30 animate-pulse" />
          <h1 className="text-2xl font-bold">Welcome Back</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <div className="relative">
            <input className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder="Password" type={show ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-3 text-sm text-indigo-300">{show ? 'Hide' : 'Show'}</button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} /> Remember Me</label>
            <button type="button" className="text-indigo-300">Forgot Password</button>
          </div>
          <button className="w-full p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition" disabled={loading}>{loading ? 'Loading...' : 'Login'}</button>
          <button type="button" className="w-full p-3 rounded-lg bg-slate-700">Continue as Guest</button>
        </form>
        <p className="mt-5 text-sm text-center">No account? <Link className="text-indigo-300" to="/register">Register</Link></p>
      </div>
    </div>
  );
}

export default LoginPage;
