import mongoose from 'mongoose';
import Sos from '../models/sos.model.js';
import { writeAdminAuditLog } from '../services/adminAuth.service.js';

const dayMs = 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = ['active', 'sending', 'sent'];
const COMPLETED_STATUSES = ['resolved'];
const PENDING_STATUSES = ['preparing', 'sending'];

const rangeWindow = (range = '7d') => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'today') return { $gte: startOfToday, $lte: now };
  if (range === 'yesterday') {
    const start = new Date(startOfToday.getTime() - dayMs);
    return { $gte: start, $lt: startOfToday };
  }
  if (range === '30d') return { $gte: new Date(Date.now() - 30 * dayMs), $lte: now };
  if (range === 'all') return null;
  return { $gte: new Date(Date.now() - 7 * dayMs), $lte: now };
};

const statusQuery = (status) => {
  if (status === 'active') return { $in: ACTIVE_STATUSES };
  if (status === 'completed') return { $in: COMPLETED_STATUSES };
  if (status === 'pending') return { $in: PENDING_STATUSES };
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  return null;
};

const durationText = (start, end = new Date()) => {
  if (!start) return 'N/A';
  const minutes = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const serializeSos = (item) => {
  const user = item.userId || {};
  const latestLocation = item.locationUpdates?.length ? item.locationUpdates[item.locationUpdates.length - 1] : null;
  return {
    id: item._id,
    emergencyId: item.emergencyId,
    user: {
      id: user._id,
      name: user.name || 'Unknown User',
      email: user.email || '',
      phone: user.phone || '',
      avatar: user.profileImage || user.avatar || '',
      contacts: user.contacts || []
    },
    emergencyType: item.emergencyType,
    status: item.status,
    displayStatus: displayStatus(item.status),
    latitude: latestLocation?.latitude ?? item.latitude,
    longitude: latestLocation?.longitude ?? item.longitude,
    accuracy: latestLocation?.accuracy ?? item.accuracy,
    address: item.address || 'Address unavailable',
    googleMapLink: item.googleMapLink,
    directionsLink: item.directionsLink,
    liveTrackingLink: item.liveTrackingLink,
    trackingActive: item.trackingActive,
    trackingExpiresAt: item.trackingExpiresAt,
    latestLocationAt: latestLocation?.timestamp || item.updatedAt,
    contactsCount: item.contactNotifications?.length || item.contacts?.length || user.contacts?.length || 0,
    contactNotifications: item.contactNotifications || [],
    notificationPlan: item.notificationPlan,
    deliverySummary: item.deliverySummary,
    timeline: item.statusTimeline || [],
    locationUpdates: item.locationUpdates || [],
    message: item.message,
    batteryLevel: item.batteryLevel,
    adminReview: item.adminReview || {},
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    resolvedAt: item.resolvedAt,
    duration: durationText(item.createdAt, item.resolvedAt || item.updatedAt || new Date())
  };
};

const displayStatus = (status) => {
  if (ACTIVE_STATUSES.includes(status)) return 'active';
  if (COMPLETED_STATUSES.includes(status)) return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'failed') return 'failed';
  return 'pending';
};

const buildQuery = (params = {}) => {
  const query = {};
  const search = String(params.search || '').trim();
  const range = rangeWindow(params.range || params.dateRange || '7d');
  const status = statusQuery(String(params.status || 'all'));
  if (range) query.createdAt = range;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { emergencyId: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } }
    ];
  }
  return query;
};

const withUserSearch = async (baseQuery, search) => {
  const pipeline = [
    { $match: baseQuery },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $addFields: { userId: '$user' } }
  ];
  const trimmed = String(search || '').trim();
  if (trimmed) {
    pipeline.push({
      $match: {
        $or: [
          { emergencyId: { $regex: trimmed, $options: 'i' } },
          { address: { $regex: trimmed, $options: 'i' } },
          { 'user.name': { $regex: trimmed, $options: 'i' } },
          { 'user.email': { $regex: trimmed, $options: 'i' } },
          { 'user.phone': { $regex: trimmed, $options: 'i' } }
        ]
      }
    });
  }
  return pipeline;
};

export const listAdminSos = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
    const query = buildQuery({ ...req.query, search: '' });
    const pipeline = await withUserSearch(query, req.query.search);
    const [rows, countRows, summary] = await Promise.all([
      Sos.aggregate([...pipeline, { $sort: { createdAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }]),
      Sos.aggregate([...pipeline, { $count: 'total' }]),
      getSosSummary()
    ]);
    const hydrated = await Sos.populate(rows, { path: 'userId', select: 'name email phone avatar profileImage contacts' });
    const total = countRows[0]?.total || 0;
    return res.status(200).json({
      success: true,
      summary,
      sos: hydrated.map(serializeSos),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load SOS monitoring records.' });
  }
};

const getSosSummary = async () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [total, active, completed, cancelled, failed, todayCount, weekly, monthly] = await Promise.all([
    Sos.countDocuments(),
    Sos.countDocuments({ status: { $in: ACTIVE_STATUSES } }),
    Sos.countDocuments({ status: { $in: COMPLETED_STATUSES } }),
    Sos.countDocuments({ status: 'cancelled' }),
    Sos.countDocuments({ status: 'failed' }),
    Sos.countDocuments({ createdAt: { $gte: today } }),
    Sos.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * dayMs) } }),
    Sos.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * dayMs) } })
  ]);
  return { total, active, completed, cancelled, failed, today: todayCount, weekly, monthly };
};

export const getAdminSosByStatus = (status) => async (req, res) => {
  req.query.status = status;
  return listAdminSos(req, res);
};

export const getAdminSosDetails = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Valid SOS ID is required.' });
    const item = await Sos.findById(req.params.id).populate('userId', 'name email phone avatar profileImage contacts gender bloodGroup medicalNotes').lean();
    if (!item) return res.status(404).json({ success: false, message: 'SOS record not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'viewed_sos', message: 'Admin viewed SOS details.', metadata: { sosId: req.params.id } });
    return res.status(200).json({ success: true, sos: serializeSos(item) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load SOS details.' });
  }
};

export const getAdminSosTimeline = async (req, res) => {
  try {
    const item = await Sos.findById(req.params.id).select('statusTimeline contactNotifications deliverySummary createdAt resolvedAt status locationUpdates').lean();
    if (!item) return res.status(404).json({ success: false, message: 'SOS record not found.' });
    const deliveryEvents = (item.contactNotifications || []).flatMap((contact) => (contact.channels || []).map((channel) => ({
      status: channel.status,
      message: `${channel.channel.toUpperCase()} ${channel.status} for ${contact.name || contact.phone || 'contact'}`,
      at: channel.sentAt || channel.deliveredAt || channel.lastAttemptAt || channel.queuedAt
    })));
    const locationEvents = (item.locationUpdates || []).map((location) => ({ status: 'location', message: `Location update: ${location.latitude}, ${location.longitude}`, at: location.timestamp }));
    const timeline = [
      { status: 'created', message: 'SOS Created', at: item.createdAt },
      ...(item.statusTimeline || []),
      ...deliveryEvents,
      ...locationEvents,
      item.resolvedAt ? { status: 'resolved', message: 'SOS Completed', at: item.resolvedAt } : null
    ].filter(Boolean).sort((a, b) => new Date(a.at) - new Date(b.at));
    return res.status(200).json({ success: true, timeline });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load SOS timeline.' });
  }
};

export const getAdminSosTracking = async (req, res) => {
  try {
    const item = await Sos.findById(req.params.id).select('latitude longitude accuracy address googleMapLink liveTrackingLink trackingActive trackingExpiresAt locationUpdates status updatedAt').lean();
    if (!item) return res.status(404).json({ success: false, message: 'SOS record not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'viewed_sos_tracking', message: 'Admin viewed SOS tracking.', metadata: { sosId: req.params.id } });
    const latest = item.locationUpdates?.length ? item.locationUpdates[item.locationUpdates.length - 1] : null;
    return res.status(200).json({
      success: true,
      tracking: {
        latitude: latest?.latitude ?? item.latitude,
        longitude: latest?.longitude ?? item.longitude,
        accuracy: latest?.accuracy ?? item.accuracy,
        address: item.address,
        googleMapLink: item.googleMapLink,
        liveTrackingLink: item.liveTrackingLink,
        trackingActive: item.trackingActive,
        trackingExpiresAt: item.trackingExpiresAt,
        updates: item.locationUpdates || [],
        status: item.status,
        updatedAt: latest?.timestamp || item.updatedAt
      }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load SOS tracking.' });
  }
};

export const markSosReviewed = async (req, res) => {
  try {
    const item = await Sos.findByIdAndUpdate(req.params.id, {
      'adminReview.reviewed': true,
      'adminReview.reviewedAt': new Date(),
      'adminReview.reviewedBy': req.admin._id
    }, { new: true }).populate('userId', 'name email phone avatar profileImage contacts');
    if (!item) return res.status(404).json({ success: false, message: 'SOS record not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'marked_sos_reviewed', message: 'Admin marked SOS reviewed.', metadata: { sosId: req.params.id } });
    return res.status(200).json({ success: true, message: 'SOS marked as reviewed.', sos: serializeSos(item) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not mark SOS reviewed.' });
  }
};

export const updateSosNotes = async (req, res) => {
  try {
    const notes = String(req.body?.notes || '').trim().slice(0, 2000);
    const item = await Sos.findByIdAndUpdate(req.params.id, {
      'adminReview.notes': notes,
      'adminReview.notesUpdatedAt': new Date(),
      'adminReview.notesUpdatedBy': req.admin._id
    }, { new: true }).populate('userId', 'name email phone avatar profileImage contacts');
    if (!item) return res.status(404).json({ success: false, message: 'SOS record not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'added_sos_notes', message: 'Admin updated SOS notes.', metadata: { sosId: req.params.id } });
    return res.status(200).json({ success: true, message: 'SOS notes saved.', sos: serializeSos(item) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not save SOS notes.' });
  }
};

const csvEscape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

export const exportAdminSos = async (req, res) => {
  try {
    const format = String(req.body?.format || 'csv').toLowerCase();
    const query = buildQuery(req.body?.filters || {});
    const items = await Sos.find(query).sort({ createdAt: -1 }).limit(5000).populate('userId', 'name email phone').lean();
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'exported_sos', message: `Admin exported SOS records as ${format}.`, metadata: { count: items.length, format } });
    const headers = ['SOS ID', 'User', 'Email', 'Phone', 'Status', 'Address', 'Latitude', 'Longitude', 'Contacts', 'Created', 'Updated', 'Duration'];
    const rows = items.map((item) => {
      const safe = serializeSos(item);
      return [safe.emergencyId, safe.user.name, safe.user.email, safe.user.phone, safe.displayStatus, safe.address, safe.latitude, safe.longitude, safe.contactsCount, safe.createdAt, safe.updatedAt, safe.duration];
    });
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="raksha-sos-records.pdf"');
      return res.send(Buffer.from(`Raksha24x7 SOS Export\n\n${csv}`));
    }
    res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="raksha-sos-records.${format === 'excel' ? 'xls' : 'csv'}"`);
    return res.send(csv);
  } catch {
    return res.status(500).json({ success: false, message: 'Could not export SOS records.' });
  }
};
