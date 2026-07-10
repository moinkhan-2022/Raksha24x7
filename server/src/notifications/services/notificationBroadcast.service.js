import NotificationBroadcast from '../models/notificationBroadcast.model.js';

export const createBroadcastDraft = async ({ actorId, payload = {} }) => NotificationBroadcast.create({
  title: payload.title,
  message: payload.message,
  type: payload.type || 'system',
  priority: payload.priority || 'normal',
  target: payload.target || {},
  scheduledFor: payload.scheduledFor || null,
  status: payload.scheduledFor ? 'scheduled' : 'draft',
  createdBy: actorId,
  metadata: payload.metadata || {}
});

export const cancelBroadcast = async ({ actorId, id }) => NotificationBroadcast.findOneAndUpdate(
  { _id: id, createdBy: actorId, status: { $in: ['draft', 'scheduled'] } },
  { $set: { status: 'cancelled', cancelledAt: new Date() } },
  { new: true }
);
