const transports = new Map();

export const registerNotificationTransport = (name, transport) => {
  if (!name || typeof transport !== 'object') return false;
  transports.set(name, transport);
  return true;
};

export const getNotificationTransports = () => Array.from(transports.keys());

export const dispatchRealtimePlaceholder = async () => ({
  queued: false,
  transports: getNotificationTransports(),
  message: 'Real-time transport is prepared but not implemented in Module 13A.'
});
