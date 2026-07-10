import Notification from '../models/notification.model.js';
import NotificationLog from '../models/notificationLog.model.js';

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

export const getUserNotificationAnalytics = async (userId) => {
  const base = { userId, deletedAt: null };
  const [
    total,
    unread,
    read,
    delivered,
    failed,
    opened,
    byType,
    byPriority,
    logs
  ] = await Promise.all([
    Notification.countDocuments(base),
    Notification.countDocuments({ ...base, readAt: null }),
    Notification.countDocuments({ ...base, readAt: { $ne: null } }),
    Notification.countDocuments({ ...base, status: { $in: ['delivered', 'read'] } }),
    Notification.countDocuments({ ...base, status: 'failed' }),
    NotificationLog.countDocuments({ userId, action: 'open', result: 'success' }),
    Notification.aggregate([
      { $match: base },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Notification.aggregate([
      { $match: base },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    NotificationLog.find({ userId }).sort({ createdAt: -1 }).limit(20).lean()
  ]);

  const readTimes = await Notification.aggregate([
    { $match: { ...base, readAt: { $ne: null } } },
    { $project: { diff: { $subtract: ['$readAt', '$createdAt'] } } },
    { $group: { _id: null, averageMs: { $avg: '$diff' } } }
  ]);

  return {
    total,
    unread,
    read,
    delivered,
    failed,
    opened,
    readRate: percent(read, total),
    deliveryRate: percent(delivered, total),
    openRate: percent(opened, total),
    averageReadTimeMs: Math.round(readTimes[0]?.averageMs || 0),
    byType,
    byPriority,
    recentActivity: logs
  };
};
