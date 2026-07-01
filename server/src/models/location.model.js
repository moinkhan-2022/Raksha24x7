import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, default: null, min: 0 },
    googleMapLink: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    trackingMode: {
      type: String,
      enum: ['current', 'live'],
      default: 'current'
    }
  },
  { timestamps: true }
);

locationSchema.index({ userId: 1, timestamp: -1 });

const Location = mongoose.model('Location', locationSchema);
export default Location;
