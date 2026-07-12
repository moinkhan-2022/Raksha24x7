import mongoose from 'mongoose';

const adminEmailTemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    variables: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

const AdminEmailTemplate = mongoose.model('AdminEmailTemplate', adminEmailTemplateSchema);
export default AdminEmailTemplate;
