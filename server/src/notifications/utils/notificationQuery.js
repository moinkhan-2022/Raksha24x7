import crypto from 'node:crypto';

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildNotificationQuery = ({ userId, query = {} }) => {
  const filter = { userId };
  if (query.deleted === 'true') filter.deletedAt = { $ne: null };
  else if (query.deleted !== 'all') filter.deletedAt = null;
  if (query.type) filter.type = query.type;
  if (query.priority) filter.priority = query.priority;
  if (query.channel) filter.channel = query.channel;
  if (query.status) filter.status = query.status;
  if (query.read === 'true') filter.readAt = { $ne: null };
  if (query.read === 'false') filter.readAt = null;
  const from = toDate(query.from);
  const to = toDate(query.to);
  if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (query.search) {
    const search = String(query.search).trim();
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } }
    ];
  }
  return filter;
};

export const getPagination = (query = {}) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const getSort = (query = {}) => {
  const order = query.sort === 'oldest' ? 1 : -1;
  return { priorityRank: -1, createdAt: order };
};

export const createDeduplicationKey = ({ userId, title, message, type }) => crypto
  .createHash('sha256')
  .update([userId, title, message, type].join('|').toLowerCase())
  .digest('hex');
