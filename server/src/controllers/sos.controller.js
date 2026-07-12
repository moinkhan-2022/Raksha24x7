import mongoose from 'mongoose';
import Sos from '../models/sos.model.js';
import {
  appendLocationUpdate,
  createEmergencyEvent,
  getTrackingEvent,
  retryEmergencyDeliveries,
  stopEmergencyEvent
} from '../services/emergencyNotification.service.js';
import { logError, logUserActivity } from '../config/logger.js';
import { recordTimedOperation } from '../services/monitoring.service.js';

const publicSos = (sos) => {
  const plain = typeof sos?.toObject === 'function' ? sos.toObject() : sos;
  if (!plain) return null;
  delete plain.trackingTokenHash;
  return plain;
};

const handleError = (res, error, fallback = 'SOS request failed') => {
  const status = error?.statusCode || 500;
  logError(error, { scope: 'sos', statusCode: status });
  return res.status(status).json({ success: false, message: error?.message || fallback });
};

export const startSos = async (req, res) => {
  try {
    const result = await recordTimedOperation('sos.create', () => createEmergencyEvent({ userId: req.user._id, payload: req.body || {} }), { requestId: req.requestId, userId: req.user._id });
    logUserActivity('SOS created', { requestId: req.requestId, userId: req.user._id, sosId: result.sos?._id });
    return res.status(201).json({
      success: true,
      message: 'SOS emergency communication started.',
      sos: publicSos(result.sos),
      trackingToken: result.trackingToken,
      notificationPlan: result.sos.notificationPlan,
      deliverySummary: result.sos.deliverySummary
    });
  } catch (error) {
    return handleError(res, error, 'Failed to start SOS');
  }
};

export const sendSos = startSos;

export const stopSos = async (req, res) => {
  try {
    const sosId = req.body?.sosId || req.params?.id;
    if (!mongoose.Types.ObjectId.isValid(sosId)) return res.status(400).json({ success: false, message: 'Valid SOS ID is required.' });
    const sos = await stopEmergencyEvent({ userId: req.user._id, sosId });
    if (!sos) return res.status(404).json({ success: false, message: 'SOS event not found.' });
    logUserActivity('SOS completed', { requestId: req.requestId, userId: req.user._id, sosId });
    return res.status(200).json({ success: true, message: 'SOS resolved and live tracking stopped.', sos: publicSos(sos) });
  } catch (error) {
    return handleError(res, error, 'Failed to stop SOS');
  }
};

export const shareLocation = async (req, res) => {
  try {
    const sosId = req.body?.sosId || req.params?.id;
    if (!mongoose.Types.ObjectId.isValid(sosId)) return res.status(400).json({ success: false, message: 'Valid SOS ID is required.' });
    const sos = await appendLocationUpdate({ userId: req.user._id, sosId, payload: req.body || {} });
    if (!sos) return res.status(404).json({ success: false, message: 'SOS event not found.' });
    logUserActivity('Live location updated', { requestId: req.requestId, userId: req.user._id, sosId });
    return res.status(200).json({ success: true, message: 'Live location updated.', sos: publicSos(sos) });
  } catch (error) {
    return handleError(res, error, 'Failed to share location');
  }
};

export const retrySos = async (req, res) => {
  try {
    const sosId = req.body?.sosId || req.params?.id;
    if (!mongoose.Types.ObjectId.isValid(sosId)) return res.status(400).json({ success: false, message: 'Valid SOS ID is required.' });
    const sos = await retryEmergencyDeliveries({ userId: req.user._id, sosId });
    if (!sos) return res.status(404).json({ success: false, message: 'SOS event not found.' });
    return res.status(200).json({ success: true, message: 'Failed emergency communications retried.', sos: publicSos(sos), deliverySummary: sos.deliverySummary });
  } catch (error) {
    return handleError(res, error, 'Failed to retry SOS communication');
  }
};

export const getSosHistory = async (req, res) => {
  try {
    const items = await Sos.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, items: items.map(publicSos) });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch SOS history' });
  }
};

export const getLatestSos = async (req, res) => {
  try {
    const item = await Sos.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const total = await Sos.countDocuments({ userId: req.user._id });
    return res.status(200).json({ success: true, item: publicSos(item), total });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch latest SOS' });
  }
};

export const getSosById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Valid SOS ID is required.' });
    const item = await Sos.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'SOS event not found.' });
    return res.status(200).json({ success: true, item: publicSos(item) });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch SOS event' });
  }
};

export const getTrackingByToken = async (req, res) => {
  try {
    const item = await getTrackingEvent({ token: req.params.token });
    if (!item) return res.status(404).json({ success: false, message: 'Tracking link is invalid or expired.' });
    const plain = publicSos(item);
    return res.status(200).json({
      success: true,
      tracking: {
        emergencyId: plain.emergencyId,
        emergencyType: plain.emergencyType,
        status: plain.status,
        user: plain.userId,
        latitude: plain.latitude,
        longitude: plain.longitude,
        accuracy: plain.accuracy,
        address: plain.address,
        googleMapLink: plain.googleMapLink,
        directionsLink: plain.directionsLink,
        locationUpdates: plain.locationUpdates,
        trackingExpiresAt: plain.trackingExpiresAt,
        updatedAt: plain.updatedAt
      }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to load tracking details' });
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
