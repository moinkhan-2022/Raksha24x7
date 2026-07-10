import mongoose from 'mongoose';

const sosSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    googleMapLink: { type: String, required: true },
    message: { type: String, required: true },
    contacts: { type: [String], default: [] },
    contactNotifications: {
      type: [
        {
          contactId: { type: mongoose.Schema.Types.ObjectId },
          name: String,
          relationship: String,
          phone: String,
          email: String,
          channels: [
            {
              channel: { type: String, enum: ['sms', 'email', 'push', 'whatsapp'], required: true },
              provider: { type: String, default: 'pending' },
              status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped'], default: 'queued' },
              reason: { type: String, default: '' },
              payload: { type: mongoose.Schema.Types.Mixed, default: {} },
              actionTaken: { type: String, default: '' },
              sentAt: { type: Date, default: null }
            }
          ]
        }
      ],
      default: []
    },
    notificationPlan: {
      contacts: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      channels: { type: [String], default: [] }
    },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' }
  },
  { timestamps: true }
);

const Sos = mongoose.model('Sos', sosSchema);
export default Sos;
