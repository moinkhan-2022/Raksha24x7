export const toPublicNotification = (notification) => ({
  id: notification._id,
  notificationId: notification.notificationId,
  userId: notification.userId,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  priority: notification.priority,
  status: notification.status,
  channel: notification.channel,
  metadata: notification.metadata || {},
  readAt: notification.readAt,
  deliveredAt: notification.deliveredAt,
  deletedAt: notification.deletedAt,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt
});
