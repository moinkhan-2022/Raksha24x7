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
  const typeValues = String(query.type || query.category || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (typeValues.length === 1) filter.type = typeValues[0];
  if (typeValues.length > 1) filter.type = { $in: typeValues };
  const priorityValues = String(query.priority || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (priorityValues.length === 1) filter.priority = priorityValues[0];
  if (priorityValues.length > 1) filter.priority = { $in: priorityValues };
  if (query.channel) filter.channel = query.channel;
  if (query.status) filter.status = query.status;
  if (query.read === 'true') filter.readAt = { $ne: null };
  if (query.read === 'false') filter.readAt = null;
  let from = toDate(query.from);
  let to = toDate(query.to);
  const now = new Date();
  if (query.datePreset === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = now;
  }
  if (query.datePreset === 'yesterday') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    from = start;
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (query.datePreset === '7d') from = new Date(Date.now() - 7 * 86_400_000);
  if (query.datePreset === '30d') from = new Date(Date.now() - 30 * 86_400_000);
  if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (query.search) {
    const search = String(query.search).trim();
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } },
      { priority: { $regex: search, $options: 'i' } }
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
  const sort = query.sort || 'newest';
  if (sort === 'oldest') return { createdAt: 1 };
  if (sort === 'priority') return { priorityRank: -1, createdAt: -1 };
  if (sort === 'unread') return { readAt: 1, createdAt: -1 };
  if (sort === 'alphabetical') return { title: 1, createdAt: -1 };
  if (sort === 'category') return { type: 1, createdAt: -1 };
  return { createdAt: -1 };
};

export const createDeduplicationKey = ({ userId, title, message, type }) => crypto
  .createHash('sha256')
  .update([userId, title, message, type].join('|').toLowerCase())
  .digest('hex');
