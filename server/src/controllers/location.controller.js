import mongoose from 'mongoose';
import Location from '../models/location.model.js';
import { logUserActivity } from '../config/logger.js';

const coordinatesAreValid = (latitude, longitude) => (
  Number.isFinite(latitude)
  && Number.isFinite(longitude)
  && latitude >= -90
  && latitude <= 90
  && longitude >= -180
  && longitude <= 180
);

const isNumericInput = (value) => (
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
  && Number.isFinite(Number(value))
);

export const saveLocation = async (req, res) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracy = req.body.accuracy === undefined || req.body.accuracy === null
      ? null
      : Number(req.body.accuracy);
    const trackingMode = req.body.trackingMode || 'current';
    const timestamp = req.body.timestamp ? new Date(req.body.timestamp) : new Date();

    if (req.body.latitude === undefined || req.body.latitude === null
      || req.body.longitude === undefined || req.body.longitude === null) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    if (!isNumericInput(req.body.latitude) || !isNumericInput(req.body.longitude)
      || !coordinatesAreValid(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    if (accuracy !== null && (!isNumericInput(req.body.accuracy) || accuracy < 0)) {
      return res.status(400).json({ success: false, message: 'Accuracy must be a positive number' });
    }

    if (!['current', 'live'].includes(trackingMode)) {
      return res.status(400).json({ success: false, message: 'Invalid tracking mode' });
    }

    if (Number.isNaN(timestamp.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid timestamp' });
    }

    const location = await Location.create({
      userId: req.user._id,
      latitude,
      longitude,
      accuracy,
      googleMapLink: `https://maps.google.com/?q=${latitude},${longitude}`,
      timestamp,
      trackingMode
    });
    logUserActivity(trackingMode === 'live' ? 'Live location updated' : 'Location saved', { requestId: req.requestId, userId: req.user._id, trackingMode });

    return res.status(201).json({ success: true, message: 'Location saved', location });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to save location' });
  }
};

export const getLatestLocation = async (req, res) => {
  try {
    const location = await Location.findOne({ userId: req.user._id }).sort({ timestamp: -1, createdAt: -1 });
    return res.status(200).json({ success: true, location });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch latest location' });
  }
};

export const getLocationHistory = async (req, res) => {
  try {
    const locations = await Location.find({ userId: req.user._id }).sort({ timestamp: -1, createdAt: -1 });
    return res.status(200).json({ success: true, locations });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch location history' });
  }
};

export const deleteLocationHistoryItem = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid location ID' });
    }

    const location = await Location.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location history item not found' });
    }

    return res.status(200).json({ success: true, message: 'Location history item deleted' });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to delete location history item' });
  }
};

export const deleteLocationHistory = async (req, res) => {
  try {
    const result = await Location.deleteMany({ userId: req.user._id });
    return res.status(200).json({
      success: true,
      message: 'Location history deleted',
      deletedCount: result.deletedCount
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to delete location history' });
  }
};
