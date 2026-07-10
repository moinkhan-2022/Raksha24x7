export class NotificationError extends Error {
  constructor(message, statusCode = 400, code = 'NOTIFICATION_ERROR') {
    super(message);
    this.name = 'NotificationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notificationErrors = {
  invalidUser: () => new NotificationError('Invalid user.', 400, 'INVALID_USER'),
  notFound: () => new NotificationError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND'),
  permissionDenied: () => new NotificationError('Permission denied.', 403, 'NOTIFICATION_PERMISSION_DENIED'),
  validation: (message) => new NotificationError(message || 'Notification validation failed.', 400, 'NOTIFICATION_VALIDATION_ERROR'),
  database: () => new NotificationError('Notification database failure.', 500, 'NOTIFICATION_DATABASE_FAILURE'),
  queue: () => new NotificationError('Notification queue failure.', 500, 'NOTIFICATION_QUEUE_FAILURE')
};
