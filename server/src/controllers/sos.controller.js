import Sos from '../models/sos.model.js';
import User from '../models/user.model.js';

export const sendSos = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const user = await User.findById(req.user._id).select('contacts');
    const contacts = (user?.contacts || []).map((c) => `${c.name} (${c.phone})`);
    if (!contacts.length) {
      return res.status(400).json({ success: false, message: 'No emergency contacts found. Please add at least one contact.' });
    }

    const googleMapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = `🚨 EMERGENCY ALERT 🚨\n\nI need immediate help.\n\nMy current location:\n${googleMapLink}\n\nPlease contact me immediately.\n\nSent from Raksha24x7.`;

    const sos = await Sos.create({
      userId: req.user._id,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      googleMapLink,
      message,
      contacts,
      status: 'sent'
    });

    return res.status(201).json({ success: true, message: 'SOS alert sent', sos });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to send SOS' });
  }
};

export const getSosHistory = async (req, res) => {
  try {
    const items = await Sos.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, items });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch SOS history' });
  }
};

export const getLatestSos = async (req, res) => {
  try {
    const item = await Sos.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const total = await Sos.countDocuments({ userId: req.user._id });
    return res.status(200).json({ success: true, item, total });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch latest SOS' });
  }
};

export const deleteSosHistoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Sos.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ success: false, message: 'SOS history item not found' });
    return res.status(200).json({ success: true, message: 'SOS history item deleted' });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to delete SOS history item' });
  }
};
