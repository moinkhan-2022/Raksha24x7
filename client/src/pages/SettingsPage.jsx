import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, BookOpen, Bug, Camera, ChevronRight, ContactRound, Eye, EyeOff,
  FileText, HardDrive, HelpCircle, Info, Languages, Lightbulb, LockKeyhole,
  LogOut, Mail, MapPin, Mic, Monitor, Pencil, Plus, RefreshCw, RotateCcw,
  Scale, Search, ShieldCheck, Trash2, UserRound, Vibrate, Volume2, X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import profileService from '../services/profileService';
import contactService from '../services/contactService';
import { readNotificationPreferences, writeNotificationPreferences } from '../services/notificationService';
import { notificationApi } from '../services/api';

const SETTINGS = [
  { id: 'profile', title: 'Profile', subtitle: 'Manage your personal information.', icon: UserRound, route: '/settings/profile', keywords: ['account', 'name', 'email', 'phone', 'personal'] },
  { id: 'security', title: 'Security', subtitle: 'Password and account security.', icon: LockKeyhole, route: '/settings/security', keywords: ['pass', 'password', 'login', 'secure'] },
  { id: 'notifications', title: 'Notifications', subtitle: 'SOS alerts and notifications.', icon: Bell, route: '/settings/notifications', keywords: ['alert', 'sos', 'push', 'sound'] },
  { id: 'language', title: 'Language', subtitle: 'Language and region.', icon: Languages, route: '/settings/language', keywords: ['lang', 'region', 'locale', 'translate'] },
  { id: 'privacy', title: 'Privacy & Permissions', subtitle: 'Privacy and device permissions.', icon: ShieldCheck, route: '/settings/privacy', keywords: ['permission', 'permissions', 'location', 'privacy', 'device', 'gps'] },
  { id: 'support', title: 'Help & Support', subtitle: 'FAQs and contact support.', icon: HelpCircle, route: '/settings/support', keywords: ['help', 'faq', 'contact', 'support'] },
  { id: 'about', title: 'About', subtitle: 'Version and application information.', icon: Info, route: '/settings/about', keywords: ['info', 'version', 'application', 'app'] }
];

const emptyContact = { name: '', relationship: '', phone: '' };
const phoneRegex = /^\d{10}$/;
const bloodGroups = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SETTINGS_PREFS_KEY = 'raksha_settings_preferences';
const THEME_KEY = 'raksha_theme';
const defaultNotificationPrefs = {
  enabled: true,
  general: true,
  sosAlerts: true,
  sos: true,
  nearby: true,
  emergencyNumbers: true,
  appUpdates: true,
  emergencyUpdates: true,
  sound: true,
  vibration: true,
  desktop: false,
  emergencyContactNotifications: true,
  pushNotifications: true,
  safetyReminders: true,
  nearbyServiceAlerts: true,
  securityEmails: true,
  welcomeEmails: true,
  passwordEmails: true,
  verificationEmails: true,
  marketingEmails: false,
  notificationSound: 'Default',
  notificationPreview: 'Show Full Content'
};
const defaultLanguagePrefs = {
  language: 'English',
  region: 'India',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12 Hour',
  firstDayOfWeek: 'Sunday'
};
const defaultSettingsPrefs = {
  notifications: defaultNotificationPrefs,
  language: defaultLanguagePrefs
};
const languages = ['English', 'Hindi', 'Arabic', 'Tamil', 'Malayalam', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu'];
const regions = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'UAE', 'Saudi Arabia', 'Others'];

const getSectionId = (pathname) => pathname.replace(/^\/settings\/?/, '').split('/')[0];
const showError = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const readSettingsPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_PREFS_KEY));
    return {
      notifications: { ...defaultNotificationPrefs, ...readNotificationPreferences(), ...(saved?.notifications || {}) },
      language: { ...defaultLanguagePrefs, ...(saved?.language || {}) }
    };
  } catch {
    return { ...defaultSettingsPrefs, notifications: { ...defaultNotificationPrefs, ...readNotificationPreferences() } };
  }
};
const saveSettingsPrefs = (section, value) => {
  const current = readSettingsPrefs();
  const next = { ...current, [section]: value };
  localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(next));
  return next;
};
const applyThemePreference = (theme) => {
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.rakshaTheme = safeTheme;
  document.documentElement.style.colorScheme = safeTheme;
};

function SettingsPage() {
  const { loading, logout, getProfile } = useAuth();
  const { addNotification, toast: notifyToast } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const activeSection = getSectionId(location.pathname);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast({ message: '', type: 'success' }), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const prefs = readSettingsPrefs();
    applyThemePreference(localStorage.getItem(THEME_KEY) || 'dark');
    document.documentElement.lang = languageCode(prefs.language.language);
  }, []);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    notifyToast(message, type);
    if (type === 'success') {
      addNotification({
        title: message,
        message: 'Your settings were updated successfully.',
        category: 'system',
        actionPath: '/settings'
      });
    }
  };
  const activeItem = activeSection ? SETTINGS.find((item) => item.id === activeSection) : null;
  const filteredSettings = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return SETTINGS;
    return SETTINGS.filter((item) => [item.title, item.subtitle, item.id, ...(item.keywords || [])].join(' ').toLowerCase().includes(search));
  }, [query]);

  if (activeSection === 'profile') {
    return (
      <SettingsShell toast={toast}>
        <ProfileSettingsPage notify={notify} refreshAuthProfile={getProfile} />
      </SettingsShell>
    );
  }

  if (activeSection === 'security') {
    return (
      <SettingsShell toast={toast}>
        <SecuritySettingsPage notify={notify} logout={logout} />
      </SettingsShell>
    );
  }

  if (activeSection === 'notifications') {
    return (
      <SettingsShell toast={toast}>
        <NotificationsSettingsPage notify={notify} />
      </SettingsShell>
    );
  }

  if (activeSection === 'language') {
    return (
      <SettingsShell toast={toast}>
        <LanguageSettingsPage notify={notify} />
      </SettingsShell>
    );
  }

  if (activeSection === 'privacy') {
    return (
      <SettingsShell toast={toast}>
        <PrivacySettingsPage notify={notify} />
      </SettingsShell>
    );
  }

  if (activeSection === 'support') {
    return (
      <SettingsShell toast={toast}>
        <HelpSupportPage notify={notify} />
      </SettingsShell>
    );
  }

  if (activeSection === 'about') {
    return (
      <SettingsShell toast={toast}>
        <AboutSettingsPage notify={notify} />
      </SettingsShell>
    );
  }

  if (activeItem) {
    return (
      <SettingsShell toast={toast}>
        <main className="mx-auto w-full max-w-2xl px-4 py-5">
          <Header title={activeItem.title} subtitle={activeItem.subtitle} backTo="/settings" />
          <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-4">
              <IconBubble icon={activeItem.icon} />
              <div>
                <p className="text-sm font-semibold text-white">Coming soon</p>
                <p className="mt-1 text-sm text-slate-400">This settings page will be implemented in a future module.</p>
              </div>
            </div>
          </section>
        </main>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell toast={toast}>
      <main className="mx-auto w-full max-w-2xl px-4 py-5">
        <Header title="Settings" subtitle="Manage your account and app preferences." backTo="/dashboard" />

        <label className="relative mt-5 block">
          <span className="sr-only">Search Settings</span>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Settings"
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-11 text-sm text-white shadow-sm shadow-black/10 outline-none transition placeholder:text-slate-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
          />
          {query ? <IconButton icon={X} label="Clear search" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8" /> : null}
        </label>

        <section className="mt-6" aria-label="Settings list">
          {loading ? <SettingsSkeleton /> : filteredSettings.length ? (
            <div className="space-y-3">
              {filteredSettings.map((item) => <SettingListItem key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900 p-6 text-center text-sm text-slate-400">No settings found.</div>
          )}
        </section>

        <button type="button" onClick={() => setLogoutOpen(true)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
          <LogOut className="h-5 w-5" />
          Logout
        </button>
        <ConfirmDialog open={logoutOpen} title="Logout?" message="Are you sure you want to logout?" confirmText="Logout" onCancel={() => setLogoutOpen(false)} onConfirm={async () => { await logout(); navigate('/login'); }} />
      </main>
    </SettingsShell>
  );
}

function ProfileSettingsPage({ notify, refreshAuthProfile }) {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(profileToForm({}));
  const [initialForm, setInitialForm] = useState(profileToForm({}));
  const [preview, setPreview] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [leaveTarget, setLeaveTarget] = useState(null);
  const [contactDraft, setContactDraft] = useState(emptyContact);
  const [editingContactId, setEditingContactId] = useState('');
  const [contactEdit, setContactEdit] = useState(emptyContact);
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm) || Boolean(pendingPhoto);

  const load = async () => {
    setLoading(true);
    try {
      const [profileResult, contactsResult] = await Promise.all([profileService.getProfile(), contactService.getAll()]);
      const profile = profileResult.data.user;
      const nextForm = profileToForm(profile);
      setUser(profile);
      setForm(nextForm);
      setInitialForm(nextForm);
      setContacts(contactsResult.data.contacts || profile.contacts || []);
      setPreview(profile.profileImage || profile.avatar || '');
      setPendingPhoto(null);
    } catch (error) {
      notify(showError(error, 'Failed to load profile.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const guardedNavigate = (target) => {
    if (dirty) setLeaveTarget(target);
    else navigate(target);
  };

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const pickPhoto = async (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return notify('Only JPG, PNG and WEBP photos are supported.', 'error');
    if (file.size > 5 * 1024 * 1024) return notify('Photo must be 5MB or less.', 'error');
    try {
      const cropped = await cropImageToSquare(file);
      setPendingPhoto(cropped);
      setPreview(URL.createObjectURL(cropped));
    } catch {
      notify('Could not prepare this photo.', 'error');
    }
  };

  const uploadPhoto = async () => {
    if (!pendingPhoto) return;
    setPhotoSaving(true);
    try {
      const { data } = await profileService.uploadPhoto(pendingPhoto);
      setUser(data.user);
      setPreview(data.user.profileImage || data.user.avatar || '');
      setPendingPhoto(null);
      await refreshAuthProfile?.().catch(() => {});
      notify('Profile photo updated.');
    } catch (error) {
      notify(showError(error, 'Photo upload failed.'), 'error');
    } finally {
      setPhotoSaving(false);
    }
  };

  const removePhoto = async () => {
    setPhotoSaving(true);
    try {
      const { data } = await profileService.removePhoto();
      setUser(data.user);
      setPreview('');
      setPendingPhoto(null);
      await refreshAuthProfile?.().catch(() => {});
      notify('Profile photo removed.');
    } catch (error) {
      notify(showError(error, 'Could not remove photo.'), 'error');
    } finally {
      setPhotoSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!form.name.trim()) return notify('Full name is required.', 'error');
    if (!phoneRegex.test(form.phone)) return notify('Enter a valid 10-digit mobile number.', 'error');
    setSaving(true);
    try {
      const { data } = await profileService.updateProfile(form);
      const nextForm = profileToForm(data.user);
      setUser(data.user);
      setForm(nextForm);
      setInitialForm(nextForm);
      if (pendingPhoto) await uploadPhoto();
      await refreshAuthProfile?.().catch(() => {});
      notify('Profile updated successfully.');
    } catch (error) {
      notify(showError(error, 'Profile update failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const validateContact = (contact, id = '') => {
    if (!contact.name.trim() || !contact.relationship.trim()) return 'Name and relationship are required.';
    if (!phoneRegex.test(contact.phone)) return 'Enter a valid 10-digit phone number.';
    if (contacts.some((item) => String(item._id) !== String(id) && item.phone === contact.phone)) return 'Duplicate phone numbers are not allowed.';
    return '';
  };

  const refreshContacts = async () => {
    const { data } = await contactService.getAll();
    setContacts(data.contacts || []);
  };

  const addContact = async () => {
    if (contacts.length >= 5) return notify('Maximum 5 emergency contacts are allowed.', 'error');
    const error = validateContact(contactDraft);
    if (error) return notify(error, 'error');
    try {
      await contactService.create(contactDraft);
      setContactDraft(emptyContact);
      await refreshContacts();
      notify('Emergency contact added.');
    } catch (err) {
      notify(showError(err, 'Could not add contact.'), 'error');
    }
  };

  const updateContact = async (id) => {
    const error = validateContact(contactEdit, id);
    if (error) return notify(error, 'error');
    try {
      await contactService.update(id, contactEdit);
      setEditingContactId('');
      setContactEdit(emptyContact);
      await refreshContacts();
      notify('Emergency contact updated.');
    } catch (err) {
      notify(showError(err, 'Could not update contact.'), 'error');
    }
  };

  const deleteContact = async (id) => {
    if (!window.confirm('Delete this emergency contact?')) return;
    try {
      await contactService.remove(id);
      await refreshContacts();
      notify('Emergency contact deleted.');
    } catch (err) {
      notify(showError(err, 'Could not delete contact.'), 'error');
    }
  };

  if (loading) {
    return <main className="mx-auto w-full max-w-2xl px-4 py-5"><Header title="Profile" subtitle="Manage your personal information." backTo="/settings" /><SettingsSkeleton /></main>;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Header title="Profile" subtitle="Manage your personal information." onBack={() => guardedNavigate('/settings')} />

      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-sm shadow-black/10">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <ProfileAvatar src={preview} name={form.name || user?.name} />
          <div className="flex flex-1 flex-wrap justify-center gap-2 sm:justify-start">
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => pickPhoto(event.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"><Camera className="mr-2 inline h-4 w-4" />Upload Photo</button>
            {pendingPhoto ? <button type="button" onClick={uploadPhoto} disabled={photoSaving} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{photoSaving ? 'Uploading...' : 'Save Photo'}</button> : null}
            {preview ? <button type="button" onClick={removePhoto} disabled={photoSaving} className="rounded-2xl border border-red-400/30 px-4 py-3 text-sm font-semibold text-red-200 disabled:opacity-60">Remove Photo</button> : null}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h2 className="text-base font-semibold text-white">Personal Information</h2>
        <div className="mt-4 grid gap-4">
          <Field label="Full Name" value={form.name} onChange={(value) => update('name', value)} required />
          <Field label="Email Address" value={form.email} readOnly />
          <Field label="Mobile Number" value={form.phone} onChange={(value) => update('phone', value.replace(/\D/g, '').slice(0, 10))} required inputMode="numeric" />
          <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} />
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Gender</span>
            <select value={form.gender} onChange={(event) => update('gender', event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20">
              <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Blood Group</span>
            <select value={form.bloodGroup} onChange={(event) => update('bloodGroup', event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20">
              {bloodGroups.map((group) => <option key={group || 'none'} value={group}>{group || 'Select blood group'}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Emergency Medical Notes</span>
            <textarea value={form.medicalNotes} onChange={(event) => update('medicalNotes', event.target.value.slice(0, 1000))} rows={4} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20" placeholder="Allergies, conditions, medicines..." />
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold text-white">Emergency Contacts</h2><p className="mt-1 text-xs text-slate-500">{contacts.length}/5 contacts saved</p></div>
        </div>
        <div className="mt-4 space-y-3">
          {contacts.length ? contacts.map((contact) => (
            <div key={contact._id} className="rounded-2xl bg-slate-950 p-4">
              {editingContactId === contact._id ? (
                <ContactEditor value={contactEdit} onChange={setContactEdit} onSave={() => updateContact(contact._id)} onCancel={() => setEditingContactId('')} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold text-white">{contact.name}</p><p className="mt-1 text-sm text-slate-400">{contact.relationship}</p><p className="mt-1 text-sm text-slate-300">{contact.phone}</p></div>
                  <div className="flex gap-1">
                    <IconButton icon={Pencil} label="Edit contact" onClick={() => { setEditingContactId(contact._id); setContactEdit({ name: contact.name, relationship: contact.relationship, phone: contact.phone }); }} />
                    <IconButton icon={Trash2} label="Delete contact" onClick={() => deleteContact(contact._id)} />
                  </div>
                </div>
              )}
            </div>
          )) : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No emergency contacts added yet.</p>}
          {contacts.length < 5 ? <ContactEditor value={contactDraft} onChange={setContactDraft} onSave={addContact} saveLabel="Add Contact" /> : null}
        </div>
      </section>

      <button type="button" onClick={saveProfile} disabled={saving} className="mt-5 w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>

      <ConfirmDialog open={Boolean(leaveTarget)} title="You have unsaved changes." message="Discard changes?" confirmText="Discard" onCancel={() => setLeaveTarget(null)} onConfirm={() => navigate(leaveTarget)} />
    </main>
  );
}

function SecuritySettingsPage({ notify, logout }) {
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ confirm: '', password: '' });
  const [deleting, setDeleting] = useState(false);
  const strength = passwordStrength(passwords.newPassword);

  const update = (key, value) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const validatePassword = () => {
    const next = {};
    if (!passwords.currentPassword) next.currentPassword = 'Current password is required.';
    if (!passwords.newPassword) next.newPassword = 'New password is required.';
    else if (passwordStrength(passwords.newPassword).score < 5) next.newPassword = 'Use 8+ chars with upper, lower, number and special character.';
    if (passwords.currentPassword && passwords.currentPassword === passwords.newPassword) next.newPassword = 'New password cannot reuse current password.';
    if (passwords.newPassword !== passwords.confirmPassword) next.confirmPassword = 'Passwords must match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const changePassword = async () => {
    if (!validatePassword()) return;
    setSaving(true);
    try {
      await profileService.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notify('Password changed successfully.');
    } catch (error) {
      notify(showError(error, 'Password change failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteForm.confirm !== 'DELETE' || !deleteForm.password) return;
    setDeleting(true);
    try {
      await profileService.deleteAccount({ password: deleteForm.password });
      await logout();
      navigate('/login');
    } catch (error) {
      notify(showError(error, 'Account deletion failed.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Header title="Security" subtitle="Protect your Raksha24x7 account." backTo="/settings" />

      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h2 className="text-base font-semibold text-white">Change Password</h2>
        <div className="mt-4 space-y-4">
          <PasswordField label="Current Password" value={passwords.currentPassword} show={show.currentPassword} error={errors.currentPassword} onToggle={() => setShow((value) => ({ ...value, currentPassword: !value.currentPassword }))} onChange={(value) => update('currentPassword', value)} />
          <PasswordField label="New Password" value={passwords.newPassword} show={show.newPassword} error={errors.newPassword} onToggle={() => setShow((value) => ({ ...value, newPassword: !value.newPassword }))} onChange={(value) => update('newPassword', value)} />
          <StrengthIndicator strength={strength} />
          <PasswordField label="Confirm Password" value={passwords.confirmPassword} show={show.confirmPassword} error={errors.confirmPassword} onToggle={() => setShow((value) => ({ ...value, confirmPassword: !value.confirmPassword }))} onChange={(value) => update('confirmPassword', value)} />
          <button type="button" onClick={changePassword} disabled={saving} className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60">{saving ? 'Updating...' : 'Change Password'}</button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h2 className="text-base font-semibold text-white">Login Sessions</h2>
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-slate-950 p-4">
          <IconBubble icon={Monitor} />
          <div className="min-w-0">
            <p className="font-semibold text-white">{browserName()} · {platformName()}</p>
            <p className="mt-1 text-sm text-emerald-300">Current Device</p>
            <p className="mt-1 text-xs text-slate-500">Login Time: {new Date().toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">Location: Not available</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/5 p-5">
        <h2 className="text-base font-semibold text-red-200">Danger Zone</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">Deleting your account permanently removes:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>Profile</li><li>Emergency Contacts</li><li>Saved Settings</li><li>Favorites</li><li>Activity History</li>
        </ul>
        <p className="mt-3 text-sm font-semibold text-red-200">This action cannot be undone.</p>
        <button type="button" onClick={() => setDeleteOpen(true)} className="mt-4 w-full rounded-2xl border border-red-400/40 bg-red-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-red-500">Delete Account</button>
      </section>

      <DeleteAccountDialog open={deleteOpen} form={deleteForm} setForm={setDeleteForm} loading={deleting} onCancel={() => setDeleteOpen(false)} onConfirm={deleteAccount} />
    </main>
  );
}

function NotificationsSettingsPage({ notify }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const prefs = readSettingsPrefs().notifications || defaultNotificationPrefs;
      setForm({
        ...defaultNotificationPrefs,
        ...prefs,
        enabled: prefs.enabled ?? prefs.pushNotifications ?? true,
        general: prefs.general ?? true,
        sos: prefs.sos ?? prefs.sosAlerts ?? true,
        nearby: prefs.nearby ?? prefs.nearbyServiceAlerts ?? true,
        emergencyNumbers: prefs.emergencyNumbers ?? true,
        appUpdates: prefs.appUpdates ?? true,
        emergencyUpdates: prefs.emergencyUpdates ?? prefs.appUpdates ?? true,
        reminders: prefs.reminders ?? true,
        pushNotifications: prefs.pushNotifications ?? prefs.enabled ?? true,
        localNotifications: prefs.localNotifications ?? true,
        browserNotifications: prefs.browserNotifications ?? prefs.desktop ?? false,
        backgroundNotifications: prefs.backgroundNotifications ?? true,
        securityEmails: prefs.securityEmails ?? true,
        welcomeEmails: prefs.welcomeEmails ?? true,
        passwordEmails: prefs.passwordEmails ?? true,
        verificationEmails: prefs.verificationEmails ?? true,
        marketingEmails: prefs.marketingEmails ?? false,
        sound: prefs.sound ?? prefs.notificationSound !== 'Silent',
        desktop: prefs.desktop ?? false
      });
    } catch (err) {
      setError(showError(err, 'Could not load notification settings.'));
      setForm(defaultNotificationPrefs);
    }
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const next = {
        ...defaultNotificationPrefs,
        ...form,
        pushNotifications: form.enabled,
        general: form.general,
        sos: form.sos,
        nearby: form.nearby,
        nearbyServiceAlerts: form.nearby,
        emergencyNumbers: form.emergencyNumbers,
        appUpdates: form.emergencyUpdates,
        reminders: form.reminders,
        localNotifications: form.localNotifications,
        browserNotifications: form.browserNotifications,
        backgroundNotifications: form.backgroundNotifications,
        securityEmails: form.securityEmails,
        welcomeEmails: form.welcomeEmails,
        passwordEmails: form.passwordEmails,
        verificationEmails: form.verificationEmails,
        marketingEmails: form.marketingEmails,
        nearbyAlerts: form.nearby,
        sosAlerts: form.sos,
        notificationSound: form.sound ? 'Default' : 'Silent',
        desktop: form.desktop || form.browserNotifications
      };
      saveSettingsPrefs('notifications', next);
      writeNotificationPreferences({
        general: next.general,
        sos: next.sos,
        nearby: next.nearby,
        emergencyNumbers: next.emergencyNumbers,
        appUpdates: next.appUpdates,
        reminders: next.reminders,
        pushNotifications: next.pushNotifications,
        localNotifications: next.localNotifications,
        browserNotifications: next.browserNotifications,
        backgroundNotifications: next.backgroundNotifications,
        securityEmails: next.securityEmails,
        welcomeEmails: next.welcomeEmails,
        passwordEmails: next.passwordEmails,
        verificationEmails: next.verificationEmails,
        marketingEmails: next.marketingEmails,
        nearbyAlerts: next.nearbyAlerts,
        sosAlerts: next.sosAlerts,
        emergencyUpdates: next.emergencyUpdates,
        notificationSound: next.notificationSound,
        sound: next.sound,
        vibration: next.vibration,
        desktop: next.desktop
      });
      await notificationApi.updateSettings({
        general: next.general,
        sos: next.sos,
        nearbyServices: next.nearby,
        email: next.securityEmails || next.welcomeEmails || next.passwordEmails || next.verificationEmails || next.marketingEmails,
        push: next.pushNotifications,
        browser: next.browserNotifications,
        reminder: next.reminders,
        securityEmails: next.securityEmails,
        welcomeEmails: next.welcomeEmails,
        passwordEmails: next.passwordEmails,
        verificationEmails: next.verificationEmails,
        marketingEmails: next.marketingEmails
      }).catch(() => undefined);
      setForm(next);
      window.setTimeout(() => {
        setSaving(false);
        notify('Notification settings saved.');
      }, 250);
    } catch (err) {
      setSaving(false);
      setError(showError(err, 'Could not save notification settings.'));
      notify('Could not save notification settings.', 'error');
    }
  };

  if (!form) {
    return <main className="mx-auto w-full max-w-2xl px-4 py-5"><Header title="Notification Settings" subtitle="Manage safety alerts and notification behavior." backTo="/settings" /><SettingsSkeleton /></main>;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Header title="Notification Settings" subtitle="Manage safety alerts and notification behavior." backTo="/settings" />
      {error ? <FriendlyError message={error} /> : null}
      <section className="mt-6 space-y-3" aria-label="Notification settings">
        <ToggleRow title="Enable Notifications" description="Allow Raksha24x7 to send important safety notifications." checked={Boolean(form.enabled)} onChange={(value) => update('enabled', value)} />
        <ToggleRow title="General Notifications" description="Show everyday app messages and reminders." checked={Boolean(form.general)} onChange={(value) => update('general', value)} />
        <ToggleRow title="SOS Alerts" description="Receive alerts when SOS is triggered." checked={Boolean(form.sosAlerts)} onChange={(value) => update('sosAlerts', value)} />
        <ToggleRow title="SOS Notifications" description="Store SOS updates in your notification center." checked={Boolean(form.sos)} onChange={(value) => setForm((current) => ({ ...current, sos: value, sosAlerts: value }))} />
        <ToggleRow title="Nearby Services" description="Show nearby emergency service updates." checked={Boolean(form.nearby)} onChange={(value) => update('nearby', value)} />
        <ToggleRow title="Emergency Numbers" description="Show emergency helpline updates." checked={Boolean(form.emergencyNumbers)} onChange={(value) => update('emergencyNumbers', value)} />
        <ToggleRow title="App Updates" description="Notify when Raksha24x7 has a new app update." checked={Boolean(form.appUpdates)} onChange={(value) => update('appUpdates', value)} />
        <ToggleRow title="Emergency Updates" description="Receive urgent app and emergency updates." checked={Boolean(form.emergencyUpdates)} onChange={(value) => update('emergencyUpdates', value)} />
        <ToggleRow title="Reminder Notifications" description="Show reminders for contacts, permissions and safety settings." checked={Boolean(form.reminders)} onChange={(value) => update('reminders', value)} />
        <ToggleRow title="Push Notifications" description="Register this device for production push notifications." checked={Boolean(form.pushNotifications)} onChange={(value) => setForm((current) => ({ ...current, pushNotifications: value, enabled: value }))} />
        <ToggleRow title="Browser Notifications" description="Show system notifications from this browser." checked={Boolean(form.browserNotifications)} onChange={(value) => setForm((current) => ({ ...current, browserNotifications: value, desktop: value }))} />
        <ToggleRow title="Local Notifications" description="Allow reminders generated on this device." checked={Boolean(form.localNotifications)} onChange={(value) => update('localNotifications', value)} />
        <ToggleRow title="Background Notifications" description="Allow notifications while Raksha24x7 is minimized or installed." checked={Boolean(form.backgroundNotifications)} onChange={(value) => update('backgroundNotifications', value)} />
        <div className="pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email Settings</div>
        <ToggleRow icon={Mail} title="Security Emails" description="Send login and account security alerts." checked={Boolean(form.securityEmails)} onChange={(value) => update('securityEmails', value)} />
        <ToggleRow icon={Mail} title="Welcome Email" description="Send account welcome and onboarding emails." checked={Boolean(form.welcomeEmails)} onChange={(value) => update('welcomeEmails', value)} />
        <ToggleRow icon={Mail} title="Password Emails" description="Send password reset and password changed emails." checked={Boolean(form.passwordEmails)} onChange={(value) => update('passwordEmails', value)} />
        <ToggleRow icon={Mail} title="Verification Emails" description="Send account email verification links." checked={Boolean(form.verificationEmails)} onChange={(value) => update('verificationEmails', value)} />
        <ToggleRow icon={Mail} title="Future Marketing Emails" description="Allow future product and safety newsletter emails." checked={Boolean(form.marketingEmails)} onChange={(value) => update('marketingEmails', value)} />
        <ToggleRow icon={Volume2} title="Sound" description="Play sound for important notifications." checked={Boolean(form.sound)} onChange={(value) => update('sound', value)} />
        <ToggleRow icon={Vibrate} title="Vibration" description="Vibrate for important notifications." checked={Boolean(form.vibration)} onChange={(value) => update('vibration', value)} />
        <ToggleRow title="Desktop Notifications" description="Use browser notifications when permission is allowed." checked={Boolean(form.desktop)} onChange={(value) => update('desktop', value)} />
      </section>
      <div className="mt-5">
        <button type="button" onClick={save} disabled={saving} className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </main>
  );
}

function LanguageSettingsPage({ notify }) {
  const isLight = localStorage.getItem(THEME_KEY) === 'light';
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setForm({ ...defaultLanguagePrefs, ...(readSettingsPrefs().language || {}) });
    } catch (err) {
      setError(showError(err, 'Could not load language settings.'));
      setForm(defaultLanguagePrefs);
    }
  }, []);

  const updateLanguage = (language) => setForm((current) => ({ ...(current || defaultLanguagePrefs), language }));
  const save = () => {
    if (!form) return;
    setSaving(true);
    try {
      const next = { ...defaultLanguagePrefs, ...form };
      saveSettingsPrefs('language', next);
      document.documentElement.lang = languageCode(next.language);
      setForm(next);
      window.setTimeout(() => {
        setSaving(false);
        notify('Language settings saved.');
      }, 250);
    } catch (err) {
      setSaving(false);
      setError(showError(err, 'Could not save language settings.'));
      notify('Could not save language settings.', 'error');
    }
  };

  if (!form) {
    return <main className="mx-auto w-full max-w-2xl px-4 py-5"><Header title="Language Settings" subtitle="Choose your preferred app language." backTo="/settings" /><SettingsSkeleton /></main>;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Header title="Language Settings" subtitle="Choose your preferred app language." backTo="/settings" />
      {error ? <FriendlyError message={error} /> : null}
      <section className={`mt-6 rounded-2xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white shadow-slate-200/60' : 'border-white/10 bg-slate-900 shadow-black/10'}`}>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Current selected language</p>
        <p className={`mt-1 text-xl font-semibold ${isLight ? 'text-slate-950' : 'text-white'}`}>{form.language || defaultLanguagePrefs.language}</p>
      </section>
      <label className={`mt-4 block rounded-2xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white shadow-slate-200/60' : 'border-white/10 bg-slate-900 shadow-black/10'}`}>
        <span className={`block text-sm font-semibold ${isLight ? 'text-slate-950' : 'text-white'}`}>Language</span>
        <select value={form.language || defaultLanguagePrefs.language} onChange={(event) => updateLanguage(event.target.value)} className={`mt-3 h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
          {languages.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </label>
      <div className="mt-5">
        <button type="button" onClick={save} disabled={saving} className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </main>
  );
}

function PrivacySettingsPage({ notify }) {
  const [statuses, setStatuses] = useState({
    geolocation: 'Checking...',
    camera: 'Checking...',
    microphone: 'Checking...',
    notifications: typeof Notification === 'undefined' ? 'Unsupported' : Notification.permission,
    storage: storageAvailable() ? 'Allowed' : 'Unavailable',
    contacts: 'Browser controlled'
  });

  useEffect(() => {
    const permissionNames = ['geolocation', 'camera', 'microphone'];
    permissionNames.forEach((name) => {
      if (!navigator.permissions?.query) {
        setStatuses((current) => ({ ...current, [name]: 'Browser controlled' }));
        return;
      }
      navigator.permissions.query({ name }).then((status) => {
        setStatuses((current) => ({ ...current, [name]: status.state }));
        status.onchange = () => setStatuses((current) => ({ ...current, [name]: status.state }));
      }).catch(() => setStatuses((current) => ({ ...current, [name]: 'Browser controlled' })));
    });
  }, []);

  const openPermissionHelp = (title) => notify(`${title} permission is managed by your browser or device settings.`);
  const items = [
    { id: 'geolocation', icon: MapPin, title: 'Location Permission', description: 'Used for SOS, maps and nearby emergency services.', status: statuses.geolocation },
    { id: 'camera', icon: Camera, title: 'Camera Permission', description: 'Used when uploading profile photos.', status: statuses.camera },
    { id: 'microphone', icon: Mic, title: 'Microphone Permission', description: 'Reserved for future safety voice features.', status: statuses.microphone },
    { id: 'notifications', icon: Bell, title: 'Notification Permission', description: 'Allows SOS and safety notifications.', status: statuses.notifications },
    { id: 'storage', icon: HardDrive, title: 'Storage Permission', description: 'Stores preferences and offline safety data.', status: statuses.storage },
    { id: 'contacts', icon: ContactRound, title: 'Contacts Permission', description: 'Emergency contacts are managed inside Raksha24x7.', status: statuses.contacts }
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Header title="Privacy & Permissions" subtitle="Manage privacy and device permissions." backTo="/settings" />
      <section className="mt-6 space-y-3" aria-label="Privacy and permission settings">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => openPermissionHelp(item.title)} className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 text-left shadow-sm shadow-black/10 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            <IconBubble icon={item.icon} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">{item.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-400">{item.description}</span>
            </span>
            <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold capitalize text-slate-200">{item.status}</span>
          </button>
        ))}
      </section>
    </main>
  );
}

function HelpSupportPage({ notify }) {
  const items = [
    { icon: HelpCircle, title: 'FAQs', description: 'Find answers to common Raksha24x7 questions.' },
    { icon: Mail, title: 'Contact Support', description: 'Reach the support team for account or safety help.' },
    { icon: Bug, title: 'Report a Bug', description: 'Tell us when something does not work correctly.' },
    { icon: Lightbulb, title: 'Suggest a Feature', description: 'Share ideas for future safety features.' },
    { icon: ShieldCheck, title: 'Privacy Policy', description: 'Read how Raksha24x7 handles safety data.' },
    { icon: Scale, title: 'Terms & Conditions', description: 'Review application terms and usage rules.' },
    { icon: BookOpen, title: 'Emergency Usage Guide', description: 'Learn how to use SOS and safety tools quickly.' },
    { icon: Mail, title: 'Support Email', description: 'support@raksha24x7.com' },
    { icon: Info, title: 'Version Information', description: 'Raksha24x7 version 1.0.0' }
  ];
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Header title="Help & Support" subtitle="FAQs and contact support." backTo="/settings" />
      <section className="mt-6 space-y-3" aria-label="Help and support">
        {items.map((item) => <InfoListItem key={item.title} item={item} onClick={() => notify(`${item.title} will open in a future update.`)} />)}
      </section>
    </main>
  );
}

function AboutSettingsPage({ notify }) {
  const aboutItems = [
    { icon: Info, title: 'Application Name', description: 'Raksha24x7' },
    { icon: FileText, title: 'Version', description: '1.0.0' },
    { icon: FileText, title: 'Build Number', description: '2026.07' },
    { icon: UserRound, title: 'Developer', description: 'Raksha24x7 Team' },
    { icon: ShieldCheck, title: 'Copyright', description: `© ${new Date().getFullYear()} Raksha24x7. All rights reserved.` },
    { icon: BookOpen, title: 'Open Source Licenses', description: 'View third-party licenses.' },
    { icon: ShieldCheck, title: 'Privacy Policy', description: 'Read privacy information.' },
    { icon: Scale, title: 'Terms', description: 'Read app terms.' },
    { icon: RefreshCw, title: 'Check for Updates', description: 'Future-ready placeholder.' }
  ];
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Header title="About" subtitle="Version and application information." backTo="/settings" />
      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-sm shadow-black/10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-600 text-2xl font-black text-white">R</div>
        <h2 className="mt-4 text-xl font-bold text-white">Raksha24x7</h2>
        <p className="mt-1 text-sm text-slate-400">Women's safety and emergency assistance app.</p>
      </section>
      <section className="mt-4 space-y-3" aria-label="About Raksha24x7">
        {aboutItems.map((item) => <InfoListItem key={item.title} item={item} onClick={() => notify(`${item.title} is available as a future-ready placeholder.`)} />)}
      </section>
    </main>
  );
}

function SettingsShell({ children, toast }) {
  const isLight = localStorage.getItem(THEME_KEY) === 'light';
  return <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}><Navbar dashboard /><Toast message={toast.message} type={toast.type} />{children}</div>;
}

function Header({ title, subtitle, backTo, onBack }) {
  const isLight = localStorage.getItem(THEME_KEY) === 'light';
  const button = `grid h-11 w-11 shrink-0 place-items-center rounded-2xl border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${isLight ? 'border-slate-200 bg-white text-slate-700 shadow-slate-200/60 hover:bg-slate-100' : 'border-white/10 bg-slate-900 text-slate-200 shadow-black/10 hover:bg-slate-800'}`;
  return (
    <header className="flex items-center gap-4">
      {onBack ? <button type="button" onClick={onBack} aria-label="Go back" className={button}><ChevronRight className="h-5 w-5 rotate-180" /></button> : <Link to={backTo} aria-label="Go back" className={button}><ChevronRight className="h-5 w-5 rotate-180" /></Link>}
      <div className="min-w-0"><h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>{title}</h1><p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{subtitle}</p></div>
    </header>
  );
}

function SettingListItem({ item }) {
  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
      <Link to={item.route} className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-sm shadow-black/10 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        <IconBubble icon={item.icon} />
        <span className="min-w-0 flex-1"><span className="block text-base font-semibold text-white">{item.title}</span><span className="mt-1 block text-sm leading-relaxed text-slate-400">{item.subtitle}</span></span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
      </Link>
    </motion.div>
  );
}

function InfoListItem({ item, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 text-left shadow-sm shadow-black/10 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
      <IconBubble icon={item.icon} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-white">{item.title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-400">{item.description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
    </button>
  );
}

function IconBubble({ icon: Icon }) {
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-red-300"><Icon className="h-5 w-5" /></span>;
}

function Field({ label, value, onChange, readOnly, type = 'text', required, inputMode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}{required ? <span className="text-red-300"> *</span> : null}</span>
      <input type={type} value={value} readOnly={readOnly} inputMode={inputMode} onChange={(event) => onChange?.(event.target.value)} className={`mt-2 h-12 w-full rounded-2xl border border-white/10 px-4 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20 ${readOnly ? 'bg-slate-800 text-slate-400' : 'bg-slate-950'}`} />
    </label>
  );
}

function ContactEditor({ value, onChange, onSave, onCancel, saveLabel = 'Save' }) {
  return (
    <div className="grid gap-2">
      <input aria-label="Contact name" placeholder="Name" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} className="h-11 rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-red-400/60" />
      <input aria-label="Relationship" placeholder="Relationship" value={value.relationship} onChange={(event) => onChange({ ...value, relationship: event.target.value })} className="h-11 rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-red-400/60" />
      <input aria-label="Phone number" placeholder="Phone Number" value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} className="h-11 rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-red-400/60" />
      <div className="flex gap-2">
        <button type="button" onClick={onSave} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"><Plus className="mr-1 inline h-4 w-4" />{saveLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel} className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">Cancel</button> : null}
      </div>
    </div>
  );
}

function PasswordField({ label, value, show, onToggle, onChange, error }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <span className="relative mt-2 block">
        <input type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 pr-12 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20" />
        <IconButton icon={show ? EyeOff : Eye} label={show ? 'Hide password' : 'Show password'} onClick={onToggle} className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2" />
      </span>
      {error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

function StrengthIndicator({ strength }) {
  return <div aria-live="polite" className="rounded-2xl bg-slate-950 p-3 text-sm"><div className="flex justify-between text-slate-400"><span>Password strength</span><span className={strength.color}>{strength.label}</span></div><div className="mt-2 grid grid-cols-5 gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index < strength.score ? strength.bg : 'bg-slate-800'}`} />)}</div></div>;
}

function IconButton({ icon: Icon, label, onClick, className = 'h-9 w-9' }) {
  return <button type="button" aria-label={label} onClick={onClick} className={`grid place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${className}`}><Icon className="h-4 w-4" /></button>;
}

function ToggleRow({ icon: Icon = Bell, title, description, checked, onChange }) {
  const isLight = localStorage.getItem(THEME_KEY) === 'light';
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white shadow-slate-200/60' : 'border-white/10 bg-slate-900 shadow-black/10'}`}>
      <IconBubble icon={Icon} />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${isLight ? 'text-slate-950' : 'text-white'}`}>{title}</p>
        {description ? <p className={`mt-1 text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${checked ? 'bg-red-600' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

function SelectRow({ icon: Icon = Bell, title, value, options, onChange }) {
  const isLight = localStorage.getItem(THEME_KEY) === 'light';
  return (
    <label className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white shadow-slate-200/60' : 'border-white/10 bg-slate-900 shadow-black/10'}`}>
      <IconBubble icon={Icon} />
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${isLight ? 'text-slate-950' : 'text-white'}`}>{title}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 h-11 w-full rounded-2xl border px-3 text-sm outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </span>
    </label>
  );
}

function ActionBar({ saving, onSave, onReset, resetText }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={onSave} disabled={saving} className="rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
      <button type="button" onClick={onReset} className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        <RotateCcw className="mr-2 inline h-4 w-4" />
        {resetText}
      </button>
    </div>
  );
}

function SettingsSkeleton() {
  const isLight = localStorage.getItem(THEME_KEY) === 'light';
  return <div className="mt-6 space-y-3" aria-label="Loading settings">{Array.from({ length: 5 }).map((_, index) => <div key={index} className={`flex animate-pulse items-center gap-4 rounded-2xl p-5 ${isLight ? 'bg-white' : 'bg-slate-900'}`}><div className={`h-11 w-11 rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} /><div className="flex-1 space-y-2"><div className={`h-4 w-1/3 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} /><div className={`h-3 w-2/3 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} /></div></div>)}</div>;
}

function FriendlyError({ message }) {
  return <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{message}</div>;
}

function ConfirmDialog({ open, title, message, confirmText, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl shadow-black/30">
        <h2 className="text-lg font-semibold text-white">{title}</h2><p className="mt-2 text-sm text-slate-400">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">Cancel</button><button type="button" onClick={onConfirm} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">{confirmText}</button></div>
      </motion.div>
    </div>
  );
}

function DeleteAccountDialog({ open, form, setForm, loading, onCancel, onConfirm }) {
  if (!open) return null;
  const disabled = form.confirm !== 'DELETE' || !form.password || loading;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-5 shadow-xl">
        <h2 id="delete-title" className="text-lg font-semibold text-red-200">Delete account permanently?</h2>
        <p className="mt-2 text-sm text-slate-400">Type DELETE and confirm your password to continue.</p>
        <input value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} placeholder="Type DELETE" className="mt-4 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none focus:border-red-400" />
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none focus:border-red-400" />
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">Cancel</button><button type="button" disabled={disabled} onClick={() => window.confirm('Final confirmation: delete your account permanently?') && onConfirm()} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Deleting...' : 'Delete Account'}</button></div>
      </motion.div>
    </div>
  );
}

function profileToForm(user) {
  return {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
    gender: user.gender || '',
    bloodGroup: user.bloodGroup || '',
    medicalNotes: user.medicalNotes || ''
  };
}

function passwordStrength(value) {
  const checks = [value.length >= 8, /[A-Z]/.test(value), /[a-z]/.test(value), /\d/.test(value), /[^A-Za-z\d]/.test(value)];
  const score = checks.filter(Boolean).length;
  if (score <= 2) return { score, label: 'Weak', color: 'text-red-300', bg: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'text-amber-300', bg: 'bg-amber-400' };
  return { score, label: 'Strong', color: 'text-emerald-300', bg: 'bg-emerald-400' };
}

function browserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Browser';
}

function platformName() {
  if (navigator.userAgent.includes('Windows')) return 'Windows';
  if (navigator.userAgent.includes('Mac')) return 'macOS';
  if (navigator.userAgent.includes('Android')) return 'Android';
  if (/iPhone|iPad/.test(navigator.userAgent)) return 'iOS';
  return navigator.platform || 'Current device';
}

function languageCode(language) {
  return ({
    English: 'en',
    Hindi: 'hi',
    Arabic: 'ar',
    Tamil: 'ta',
    Malayalam: 'ml',
    Telugu: 'te',
    Kannada: 'kn',
    Bengali: 'bn',
    Marathi: 'mr',
    Gujarati: 'gu',
    Punjabi: 'pa',
    Urdu: 'ur'
  })[language] || 'en';
}

function storageAvailable() {
  try {
    const key = '__raksha_storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

async function cropImageToSquare(file) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
  const size = Math.min(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 512, 512);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob) reject(new Error('Crop failed'));
    else resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
  }, 'image/webp', 0.9));
}

export default SettingsPage;
