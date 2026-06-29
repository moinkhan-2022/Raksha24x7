import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setToast('Confirm Password must match Password');

    try {
      setLoading(true);
      await register(form);
      setToast('Registered successfully');
      navigate('/dashboard');
    } catch (err) {
      setToast(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Toast message={toast} type={toast.includes('success') ? 'success' : 'error'} />
      <div className="glass rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          {['name', 'email', 'phone'].map((f) => (
            <input key={f} className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder={f[0].toUpperCase() + f.slice(1)} type={f === 'email' ? 'email' : 'text'} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required />
          ))}
          <input className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
          <button className="w-full p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition" disabled={loading}>{loading ? 'Loading...' : 'Register'}</button>
        </form>
        <p className="mt-5 text-sm text-center">Already have account? <Link className="text-indigo-300" to="/login">Login</Link></p>
      </div>
    </div>
  );
}

export default RegisterPage;
