const supportedChannels = ['sms', 'email', 'push'];

export const buildEmergencyContactNotifications = ({ user, contacts, googleMapLink, timestamp = new Date() }) => {
  const dateTime = timestamp.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
  const userName = user?.name || 'Raksha24x7 user';
  const message = `🚨 SOS Alert from ${userName}\n\nEmergency status: Active\nLocation: ${googleMapLink}\nTime: ${dateTime}\n\nPlease contact them immediately.`;

  return (contacts || []).map((contact) => ({
    contactId: contact._id,
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phone,
    email: contact.email || '',
    channels: supportedChannels.map((channel) => ({
      channel,
      provider: 'pending',
      status: channel === 'email' && !contact.email ? 'skipped' : 'queued',
      reason: channel === 'email' && !contact.email ? 'Contact email unavailable' : '',
      payload: {
        userName,
        emergencyMessage: message,
        locationLink: googleMapLink,
        dateTime,
        emergencyStatus: 'Active'
      }
    }))
  }));
};

export const summarizeNotificationPlan = (contactNotifications = []) => {
  const summary = { contacts: contactNotifications.length, queued: 0, skipped: 0, channels: supportedChannels };
  contactNotifications.forEach((contact) => {
    contact.channels.forEach((channel) => {
      if (channel.status === 'queued') summary.queued += 1;
      if (channel.status === 'skipped') summary.skipped += 1;
    });
  });
  return summary;
};
