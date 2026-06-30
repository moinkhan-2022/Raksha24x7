import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import ProfileCard from '../components/ProfileCard';
import ProfileSkeleton from '../components/ProfileSkeleton';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const emptyContact = { name: '', relationship: '', phone: '' };

function ProfilePage() {
  const { user, loading, updateProfile, changePassword, logout } = useAuth();
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState(() => ({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '', avatar: user?.avatar || '',
    gender: user?.gender || 'prefer_not_to_say', dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
    bloodGroup: user?.medicalInfo?.bloodGroup || '', address: user?.address || '', emergencyStatus: user?.emergencyStatus || 'safe',
    allergies: user?.medicalInfo?.allergies || '', medicalConditions: user?.medicalInfo?.medicalConditions || '',
    currentMedications: user?.medicalInfo?.currentMedications || '', organDonor: Boolean(user?.medicalInfo?.organDonor),
    darkMode: user?.settings?.darkMode ?? true, notifications: user?.settings?.notifications ?? true,
    locationPermission: user?.settings?.locationPermission || 'prompt', language: user?.settings?.language || 'en',
    emergencyContacts: user?.emergencyContacts?.length ? user.emergencyContacts : [emptyContact],
    currentPassword: '', newPassword: '', confirmPassword: ''
  }));

  const canAddContact = useMemo(() => form.emergencyContacts.length < 5, [form.emergencyContacts.length]);

  const onSaveProfile = async () => {
    if (!form.name || !/^\d{10}$/.test(form.phone)) return setToast('Please enter valid name and 10-digit phone');
    try {
      setBusy(true);
      await updateProfile({
        name: form.name, phone: form.phone, avatar: form.avatar, gender: form.gender,
        dateOfBirth: form.dateOfBirth || null, address: form.address, emergencyStatus: form.emergencyStatus,
        emergencyContacts: form.emergencyContacts.filter((c) => c.name && c.relationship && /^\d{10}$/.test(c.phone)),
        medicalInfo: { bloodGroup: form.bloodGroup, allergies: form.allergies, medicalConditions: form.medicalConditions, currentMedications: form.currentMedications, organDonor: form.organDonor },
        settings: { darkMode: form.darkMode, notifications: form.notifications, locationPermission: form.locationPermission, language: form.language }
      });
      setToast('Profile updated successfully');
    } catch (e) { setToast(e.response?.data?.message || 'Profile update failed'); } finally { setBusy(false); }
  };

  const onPasswordChange = async () => {
    try {
      setBusy(true);
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword, confirmPassword: form.confirmPassword });
      setForm((s) => ({ ...s, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setToast('Password changed successfully');
    } catch (e) { setToast(e.response?.data?.message || 'Password change failed'); } finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 p-6"><ProfileSkeleton /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <Toast message={toast} type={toast.includes('success') ? 'success' : 'error'} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">User Profile</h1>
          <p className="mt-2 text-slate-300">Manage personal details, emergency contacts, medical info, settings, and security.</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileCard title="Profile Dashboard & Edit">
            <div className="grid gap-3">
              <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Avatar URL" value={form.avatar} onChange={(e)=>setForm({...form,avatar:e.target.value})} />
              <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Full Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
              <input className="rounded-lg bg-slate-900/70 p-3" value={form.email} disabled />
              <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Mobile Number" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} />
              <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Address" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} />
            </div>
          </ProfileCard>

          <ProfileCard title="Medical Information">
            <div className="grid gap-3">
              <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Blood Group" value={form.bloodGroup} onChange={(e)=>setForm({...form,bloodGroup:e.target.value})} />
              <textarea className="rounded-lg bg-slate-900/70 p-3" placeholder="Allergies" value={form.allergies} onChange={(e)=>setForm({...form,allergies:e.target.value})} />
              <textarea className="rounded-lg bg-slate-900/70 p-3" placeholder="Medical Conditions" value={form.medicalConditions} onChange={(e)=>setForm({...form,medicalConditions:e.target.value})} />
              <textarea className="rounded-lg bg-slate-900/70 p-3" placeholder="Current Medications" value={form.currentMedications} onChange={(e)=>setForm({...form,currentMedications:e.target.value})} />
            </div>
          </ProfileCard>

          <ProfileCard title="Emergency Contacts (max 5)">
            <div className="space-y-3">
              {form.emergencyContacts.map((c, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-3">
                  <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Name" value={c.name} onChange={(e)=>setForm({...form,emergencyContacts:form.emergencyContacts.map((x,idx)=>idx===i?{...x,name:e.target.value}:x)})} />
                  <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Relationship" value={c.relationship} onChange={(e)=>setForm({...form,emergencyContacts:form.emergencyContacts.map((x,idx)=>idx===i?{...x,relationship:e.target.value}:x)})} />
                  <div className="flex gap-2">
                    <input className="w-full rounded-lg bg-slate-900/70 p-3" placeholder="Phone" value={c.phone} onChange={(e)=>setForm({...form,emergencyContacts:form.emergencyContacts.map((x,idx)=>idx===i?{...x,phone:e.target.value}:x)})} />
                    <button className="rounded-lg bg-rose-600 px-3" onClick={()=>setForm({...form,emergencyContacts:form.emergencyContacts.filter((_,idx)=>idx!==i)})}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              <button disabled={!canAddContact} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 disabled:opacity-50" onClick={()=>setForm({...form,emergencyContacts:[...form.emergencyContacts,emptyContact]})}><Plus className="h-4 w-4" /> Add Contact</button>
            </div>
          </ProfileCard>

          <ProfileCard title="Settings & Security">
            <div className="space-y-3">
              <label className="flex items-center justify-between"><span>Dark Mode</span><input type="checkbox" checked={form.darkMode} onChange={(e)=>setForm({...form,darkMode:e.target.checked})} /></label>
              <label className="flex items-center justify-between"><span>Notifications</span><input type="checkbox" checked={form.notifications} onChange={(e)=>setForm({...form,notifications:e.target.checked})} /></label>
              <select className="w-full rounded-lg bg-slate-900/70 p-3" value={form.language} onChange={(e)=>setForm({...form,language:e.target.value})}><option value="en">English</option><option value="hi">Hindi</option></select>
              <div className="border-t border-white/10 pt-3">
                <input className="mb-2 w-full rounded-lg bg-slate-900/70 p-3" type={showPw?'text':'password'} placeholder="Current Password" value={form.currentPassword} onChange={(e)=>setForm({...form,currentPassword:e.target.value})} />
                <input className="mb-2 w-full rounded-lg bg-slate-900/70 p-3" type={showPw?'text':'password'} placeholder="New Password" value={form.newPassword} onChange={(e)=>setForm({...form,newPassword:e.target.value})} />
                <div className="flex gap-2">
                  <input className="w-full rounded-lg bg-slate-900/70 p-3" type={showPw?'text':'password'} placeholder="Confirm Password" value={form.confirmPassword} onChange={(e)=>setForm({...form,confirmPassword:e.target.value})} />
                  <button className="rounded-lg bg-slate-700 px-3" onClick={()=>setShowPw(!showPw)}>{showPw?<EyeOff className='h-4 w-4'/>:<Eye className='h-4 w-4'/>}</button>
                </div>
                <button disabled={busy} onClick={onPasswordChange} className="mt-2 rounded-lg bg-amber-600 px-4 py-2">Change Password</button>
              </div>
            </div>
          </ProfileCard>
        </div>

        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={onSaveProfile} className="rounded-xl bg-red-600 px-5 py-3 font-semibold">Save</button>
          <button onClick={()=>window.location.reload()} className="rounded-xl border border-white/20 bg-white/5 px-5 py-3">Cancel</button>
          <button onClick={logout} className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3">Logout</button>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
