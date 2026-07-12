import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { sendPasswordChangedEmail } from '../utils/email.js';
import { validateStrongPassword } from '../utils/passwordPolicy.js';

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  profileImage: user.profileImage,
  dateOfBirth: user.dateOfBirth,
  gender: user.gender,
  bloodGroup: user.bloodGroup,
  medicalNotes: user.medicalNotes,
  role: user.role,
  accountStatus: user.accountStatus,
  profileCompleted: Boolean(user.profileCompleted),
  authProvider: user.authProvider || 'email',
  emailVerificationStatus: user.emailVerificationStatus,
  isEmailVerified: user.isEmailVerified,
  emailVerifiedAt: user.emailVerifiedAt,
  passwordChangedAt: user.passwordChangedAt,
  lastLogin: user.lastLogin,
  memberSince: user.memberSince,
  contacts: user.contacts || [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const getProfile = async (req, res) => res.status(200).json({ success: true, user: safeUser(req.user) });
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, dateOfBirth, gender, bloodGroup, medicalNotes } = req.body;
    if (!name || !/^\d{10}$/.test(phone || '')) return res.status(400).json({ success: false, message: 'Valid name and 10-digit phone are required' });
    const user = await User.findByIdAndUpdate(req.user._id, {
      name: name.trim(),
      phone,
      dateOfBirth: dateOfBirth || null,
      gender: gender || '',
      bloodGroup: (bloodGroup || '').trim(),
      medicalNotes: (medicalNotes || '').trim()
    }, { new: true, runValidators: true }).select('-password');
    return res.status(200).json({ success: true, message: 'Profile updated', user: safeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const uploadPhoto = async (req, res) => { try { if (!req.file) return res.status(400).json({ success: false, message: 'Photo file is required' }); const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`; const user = await User.findByIdAndUpdate(req.user._id, { profileImage: base64, avatar: base64 }, { new: true }).select('-password'); return res.status(200).json({ success: true, message: 'Profile photo uploaded', user: safeUser(user) }); } catch (e) { return res.status(400).json({ success: false, message: e.message || 'Upload failed' }); } };
export const deletePhoto = async (req, res) => { const user = await User.findByIdAndUpdate(req.user._id, { profileImage: '', avatar: '' }, { new: true }).select('-password'); return res.status(200).json({ success: true, message: 'Profile photo removed', user: safeUser(user) }); };

export const getContacts = async (req, res) => res.status(200).json({ success: true, contacts: req.user.contacts || [] });
const normalized = (v) => String(v || '').trim().toLowerCase();

export const addContact = async (req, res) => {
  const { name, relationship, phone } = req.body;
  if (!name || !relationship || !/^\d{10}$/.test(phone || '')) return res.status(400).json({ success: false, message: 'Valid contact details required' });
  const user = await User.findById(req.user._id);
  if (user.contacts.length >= 5) return res.status(400).json({ success: false, message: 'Maximum 5 contacts allowed' });
  const exists = user.contacts.some((c) => normalized(c.phone) === normalized(phone));
  if (exists) return res.status(409).json({ success: false, message: 'Duplicate contact not allowed' });
  user.contacts.push({ name: name.trim(), relationship: relationship.trim(), phone: phone.trim(), isPrimary: user.contacts.length === 0 });
  await user.save();
  return res.status(201).json({ success: true, contacts: user.contacts });
};

export const updateContact = async (req, res) => {
  const { id } = req.params;
  const { name, relationship, phone } = req.body;
  const user = await User.findById(req.user._id);
  const contact = user.contacts.id(id);
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
  if (!name || !relationship || !/^\d{10}$/.test(phone || '')) return res.status(400).json({ success: false, message: 'Valid contact details required' });
  const duplicate = user.contacts.some((c) => String(c._id) !== String(id) && normalized(c.phone) === normalized(phone));
  if (duplicate) return res.status(409).json({ success: false, message: 'Duplicate contact not allowed' });
  contact.name = name.trim();
  contact.relationship = relationship.trim();
  contact.phone = phone.trim();
  await user.save();
  return res.status(200).json({ success: true, contacts: user.contacts });
};

export const deleteContact = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  const contact = user.contacts.id(id);
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
  const wasPrimary = Boolean(contact.isPrimary);
  contact.deleteOne();
  if (wasPrimary && user.contacts.length > 0) user.contacts[0].isPrimary = true;
  await user.save();
  return res.status(200).json({ success: true, contacts: user.contacts });
};

export const setPrimaryContact = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  const contact = user.contacts.id(id);
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
  user.contacts.forEach((c) => { c.isPrimary = String(c._id) === String(id); });
  await user.save();
  return res.status(200).json({ success: true, contacts: user.contacts });
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const passwordError = validateStrongPassword(newPassword);
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Confirm password mismatch' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const ok = await bcrypt.compare(currentPassword || '', user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Current password incorrect' });

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await sendPasswordChangedEmail({ to: user.email, name: user.name });

    return res.status(200).json({ success: true, message: 'Password updated' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const deleteAccount = async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ success: false, message: 'Password confirmation is required' });
  const user = await User.findById(req.user._id).select('+password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ success: false, message: 'Password confirmation is incorrect' });
  await User.findByIdAndDelete(req.user._id);
  return res.status(200).json({ success: true, message: 'Account deleted' });
};
