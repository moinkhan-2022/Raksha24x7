import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import ProfileCard from '../components/ProfileCard';
import ProfileAvatar from '../components/ProfileAvatar';
import EditProfileModal from '../components/EditProfileModal';
import EmergencyContacts from '../components/EmergencyContacts';
import ProfileSkeleton from '../components/ProfileSkeleton';
import Toast from '../components/Toast';
import profileService from '../services/profileService';
import contactService from '../services/contactService';

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [openEdit, setOpenEdit] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    profileService.getProfile().then(({ data }) => {
      setUser(data.user);
      setForm({ name: data.user.name || '', email: data.user.email || '', phone: data.user.phone || '' });
    }).finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    try {
      const { data } = await profileService.updateProfile({ name: form.name, phone: form.phone });
      setUser(data.user); setOpenEdit(false); setToast('Profile updated successfully');
    } catch (e) { setToast(e.response?.data?.message || 'Update failed'); }
  };

  const upload = async (file) => {
    try {
      const { data } = await profileService.uploadPhoto(file);
      setUser(data.user); setToast('Photo updated');
    } catch (e) { setToast(e.response?.data?.message || 'Photo upload failed'); }
  };

  const remove = async () => {
    const { data } = await profileService.removePhoto();
    setUser(data.user); setToast('Photo removed');
  };

  const refreshContacts = async () => {
    const { data } = await contactService.getAll();
    setUser((s) => ({ ...s, contacts: data.contacts }));
  };

  if (loading) return <div className="p-6"><ProfileSkeleton /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <Toast message={toast} type={toast.toLowerCase().includes('success') || toast.toLowerCase().includes('updated') ? 'success' : 'error'} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-3">
          <ProfileCard title="User Profile">
            <div className="space-y-3">
              <ProfileAvatar src={user.profileImage || user.avatar} name={user.name} />
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e)=>e.target.files?.[0] && upload(e.target.files[0])} />
              <button onClick={remove} className="rounded bg-rose-600 px-3 py-2">Remove Image</button>
              <p>{user.name}</p><p>{user.email}</p><p>{user.phone}</p>
              <p>Member Since: {new Date(user.memberSince || user.createdAt).toLocaleDateString()}</p>
              <p>Account Status: {user.accountStatus || 'active'}</p>
              <p>Last Login: {new Date(user.lastLogin || Date.now()).toLocaleString()}</p>
              <button onClick={()=>setOpenEdit(true)} className="rounded bg-red-600 px-3 py-2">Edit Profile</button>
            </div>
          </ProfileCard>
          <ProfileCard title="Emergency Contacts">
            <EmergencyContacts
              contacts={user.contacts || []}
              onAdd={async(payload)=>{await contactService.create(payload); await refreshContacts(); setToast('Contact added');}}
              onUpdate={async(id,payload)=>{await contactService.update(id,payload); await refreshContacts(); setToast('Contact updated');}}
              onDelete={async(id)=>{await contactService.remove(id); await refreshContacts(); setToast('Contact deleted');}}
            />
          </ProfileCard>
          <ProfileCard title="Quick Actions">
            <p className="text-slate-300">Use settings page for password, logout and account deletion.</p>
          </ProfileCard>
        </motion.div>
      </main>
      <EditProfileModal open={openEdit} form={form} setForm={setForm} onSave={saveProfile} onClose={()=>setOpenEdit(false)} loading={false} />
    </div>
  );
}

export default ProfilePage;
