import { useState } from 'react';
import Navbar from '../components/Navbar';
import ProfileCard from '../components/ProfileCard';
import Toast from '../components/Toast';
import profileService from '../services/profileService';
import { useAuth } from '../context/AuthContext';

function SettingsPage() {
  const { logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [toast, setToast] = useState('');

  const changePassword = async () => {
    try {
      await profileService.changePassword(form);
      setToast('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { setToast(e.response?.data?.message || 'Password change failed'); }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete account?')) return;
    await profileService.deleteAccount();
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <Toast message={toast} type={toast.includes('success') ? 'success' : 'error'} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">
        <ProfileCard title="Account Settings">
          <div className="space-y-3">
            <input className="w-full rounded-lg bg-slate-800 p-3" type="password" placeholder="Current Password" value={form.currentPassword} onChange={(e)=>setForm({...form,currentPassword:e.target.value})} />
            <input className="w-full rounded-lg bg-slate-800 p-3" type="password" placeholder="New Password" value={form.newPassword} onChange={(e)=>setForm({...form,newPassword:e.target.value})} />
            <input className="w-full rounded-lg bg-slate-800 p-3" type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={(e)=>setForm({...form,confirmPassword:e.target.value})} />
            <div className="flex flex-wrap gap-2">
              <button onClick={changePassword} className="rounded bg-amber-600 px-4 py-2">Change Password</button>
              <button onClick={logout} className="rounded bg-red-600 px-4 py-2">Logout</button>
              <button onClick={deleteAccount} className="rounded border border-red-500/40 bg-red-500/10 px-4 py-2">Delete Account</button>
            </div>
          </div>
        </ProfileCard>
      </main>
    </div>
  );
}

export default SettingsPage;
