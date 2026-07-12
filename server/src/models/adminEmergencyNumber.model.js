import mongoose from 'mongoose';

const adminEmergencyNumberSchema = new mongoose.Schema(
  {
    service: { type: String, required: true, trim: true, index: true },
    number: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    country: { type: String, default: 'IN', uppercase: true, trim: true, index: true },
    state: { type: String, default: 'All States', trim: true },
    city: { type: String, default: 'All Cities', trim: true },
    enabled: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 50 },
    description: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

adminEmergencyNumberSchema.index({ country: 1, category: 1, number: 1 }, { unique: true });

const AdminEmergencyNumber = mongoose.model('AdminEmergencyNumber', adminEmergencyNumberSchema);
export default AdminEmergencyNumber;
