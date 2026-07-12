import {
  cleanupExpiredBackups,
  createDatabaseBackup,
  getBackupStatus,
  listBackupManifests,
  verifyBackup
} from '../services/backup.service.js';
import { writeAdminAuditLog } from '../services/adminAuth.service.js';

export const getAdminBackupStatus = async (req, res) => {
  const status = await getBackupStatus();
  return res.status(200).json({ success: true, status });
};

export const listAdminBackups = async (req, res) => {
  const backups = await listBackupManifests();
  return res.status(200).json({ success: true, backups });
};

export const createAdminBackup = async (req, res) => {
  try {
    const type = req.body?.type || 'manual';
    const format = req.body?.format === 'csv' ? 'csv' : 'json';
    const result = await createDatabaseBackup({
      type,
      format,
      requestedBy: req.admin?._id ? String(req.admin._id) : 'admin'
    });
    await writeAdminAuditLog({
      req,
      adminId: req.admin?._id,
      action: 'backup_created',
      message: 'Admin created a database backup.',
      metadata: { backupId: result.manifest.backupId, type, format, totalSize: result.manifest.totalSize }
    });
    return res.status(201).json({ success: true, backup: result.manifest, verification: result.verification });
  } catch (error) {
    await writeAdminAuditLog({
      req,
      adminId: req.admin?._id,
      action: 'backup_failed',
      status: 'failed',
      message: 'Admin backup failed.',
      metadata: { reason: error.message }
    });
    return res.status(500).json({ success: false, message: 'Backup failed.' });
  }
};

export const verifyAdminBackup = async (req, res) => {
  try {
    const result = await verifyBackup(req.params.backupId);
    await writeAdminAuditLog({
      req,
      adminId: req.admin?._id,
      action: 'backup_verified',
      message: 'Admin verified a database backup.',
      metadata: { backupId: req.params.backupId, filesVerified: result.filesVerified }
    });
    return res.status(200).json({ success: true, verification: result });
  } catch {
    return res.status(400).json({ success: false, message: 'Backup verification failed.' });
  }
};

export const cleanupAdminBackups = async (req, res) => {
  const result = await cleanupExpiredBackups();
  await writeAdminAuditLog({
    req,
    adminId: req.admin?._id,
    action: 'backup_retention_cleanup',
    message: 'Admin ran backup retention cleanup.',
    metadata: { removedCount: result.removedCount }
  });
  return res.status(200).json({ success: true, result });
};
