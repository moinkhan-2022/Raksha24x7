import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password || !form.confirmPassword) return 'All fields are required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email format';
    if (!/^\d{10}$/.test(form.phone)) return 'Phone number must contain exactly 10 digits';
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) return setToast(error);

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
      <Toast message={toast} type={toast.toLowerCase().includes('success') ? 'success' : 'error'} />
      <div className="glass rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          {['name', 'email', 'phone'].map((f) => (
            <input key={f} className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder={f[0].toUpperCase() + f.slice(1)} type={f === 'email' ? 'email' : 'text'} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
          ))}
          <div className="relative">
            <input className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="absolute right-3 top-3 text-slate-300" onClick={() => setShowPassword((s) => !s)}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
          <div className="relative">
            <input className="w-full p-3 rounded-lg bg-slate-900/70 border border-slate-700" placeholder="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            <button type="button" className="absolute right-3 top-3 text-slate-300" onClick={() => setShowConfirmPassword((s) => !s)}>{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
          <button className="w-full p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-60" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
        </form>
        <p className="mt-5 text-sm text-center">Already have account? <Link className="text-indigo-300" to="/login">Login</Link></p>
      </div>
    </div>
  );
}

export default RegisterPage;
