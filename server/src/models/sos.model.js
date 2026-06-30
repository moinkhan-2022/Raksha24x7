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
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' }
  },
  { timestamps: true }
);

const Sos = mongoose.model('Sos', sosSchema);
export default Sos;
