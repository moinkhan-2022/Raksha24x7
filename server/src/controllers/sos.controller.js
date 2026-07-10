import Sos from '../models/sos.model.js';
import User from '../models/user.model.js';
import {
  buildEmergencyContactNotifications,
  summarizeNotificationPlan
} from '../services/emergencyNotification.service.js';
import { queuePushDelivery } from '../services/pushProvider.service.js';

export const sendSos = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const user = await User.findById(req.user._id).select('name email phone contacts');
    const contacts = (user?.contacts || []).map((c) => `${c.name} (${c.phone})`);
    if (!contacts.length) {
      return res.status(400).json({ success: false, message: 'No emergency contacts found. Please add at least one contact.' });
    }

    const googleMapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = `🚨 EMERGENCY ALERT 🚨\n\nI need immediate help.\n\nMy current location:\n${googleMapLink}\n\nPlease contact me immediately.\n\nSent from Raksha24x7.`;

    const contactNotifications = buildEmergencyContactNotifications({
      user,
      contacts: user.contacts,
      googleMapLink,
      timestamp: new Date()
    });
    const notificationPlan = summarizeNotificationPlan(contactNotifications);

    const sos = await Sos.create({
      userId: req.user._id,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      googleMapLink,
      message,
      contacts,
      contactNotifications,
      notificationPlan,
      status: 'sent'
    });
    const pushResult = await queuePushDelivery({
      userId: req.user._id,
      payload: {
        notificationId: String(sos._id),
        type: 'sos_activated',
        title: '🚨 SOS Activated',
        message: 'Emergency mode has started. Location is being shared.',
        actionPath: '/dashboard?sos=true',
        priority: 'critical',
        actions: [
          { action: 'open-sos', title: 'View SOS' },
          { action: 'call-emergency', title: 'Call 112' }
        ],
        metadata: { googleMapLink, status: sos.status }
      }
    });

    return res.status(201).json({ success: true, message: 'SOS alert sent', sos, notificationPlan, pushResult });
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
