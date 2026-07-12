import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import { appConfig } from '../config/appConfig.js';
import logger, { logError } from '../config/logger.js';

const backupState = {
  status: 'idle',
  lastBackup: null,
  lastVerification: null,
  lastError: null,
  restoreStatus: 'not_started',
  activeJob: null,
  nextScheduledBackup: null,
  schedulerStarted: false
};

const safeName = (value = '') => String(value).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const now = () => new Date();
const backupRoot = () => path.resolve(process.cwd(), appConfig.backup.directory);
const shouldCompress = () => Boolean(appConfig.backup.compression);

const ensureBackupRoot = async () => {
  const root = backupRoot();
  await fsp.mkdir(root, { recursive: true, mode: 0o700 });
  return root;
};

const createWritable = async (filePath) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const fileStream = fs.createWriteStream(filePath, { mode: 0o600 });
  if (!shouldCompress()) return { stream: fileStream, done: new Promise((resolve, reject) => fileStream.on('finish', resolve).on('error', reject)) };
  const gzip = zlib.createGzip({ level: 6 });
  const done = pipeline(gzip, fileStream);
  return { stream: gzip, done };
};

const writeChunk = (stream, chunk) => new Promise((resolve, reject) => {
  if (stream.write(chunk)) return resolve();
  stream.once('drain', resolve);
  stream.once('error', reject);
});

const closeWritable = async (stream, done) => {
  stream.end();
  await done;
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const flattenedKeys = (doc) => Object.keys(doc || {}).filter((key) => !key.startsWith('__')).slice(0, 100);

const exportCollectionJson = async ({ collection, outputDir }) => {
  const fileName = `${safeName(collection.collectionName)}.json${shouldCompress() ? '.gz' : ''}`;
  const filePath = path.join(outputDir, fileName);
  const { stream, done } = await createWritable(filePath);
  const cursor = collection.find({}).batchSize(500);
  let count = 0;
  let first = true;

  await writeChunk(stream, '[');
  for await (const doc of cursor) {
    if (appConfig.backup.maxCollectionExport > 0 && count >= appConfig.backup.maxCollectionExport) break;
    await writeChunk(stream, `${first ? '' : ','}\n${JSON.stringify(doc)}`);
    first = false;
    count += 1;
  }
  await writeChunk(stream, '\n]');
  await closeWritable(stream, done);
  const stats = await fsp.stat(filePath);
  return { collection: collection.collectionName, format: 'json', fileName, size: stats.size, count };
};

const exportCollectionCsv = async ({ collection, outputDir }) => {
  const fileName = `${safeName(collection.collectionName)}.csv${shouldCompress() ? '.gz' : ''}`;
  const filePath = path.join(outputDir, fileName);
  const { stream, done } = await createWritable(filePath);
  const cursor = collection.find({}).batchSize(500);
  let count = 0;
  let headers = [];

  for await (const doc of cursor) {
    if (appConfig.backup.maxCollectionExport > 0 && count >= appConfig.backup.maxCollectionExport) break;
    const plain = JSON.parse(JSON.stringify(doc));
    if (!headers.length) {
      headers = flattenedKeys(plain);
      await writeChunk(stream, `${headers.map(csvEscape).join(',')}\n`);
    }
    await writeChunk(stream, `${headers.map((key) => csvEscape(plain[key])).join(',')}\n`);
    count += 1;
  }
  await closeWritable(stream, done);
  const stats = await fsp.stat(filePath);
  return { collection: collection.collectionName, format: 'csv', fileName, size: stats.size, count };
};

export const getBackupConfigSummary = () => ({
  enabled: appConfig.backup.enabled,
  provider: appConfig.backup.provider,
  schedule: appConfig.backup.schedule,
  compression: appConfig.backup.compression,
  encryption: appConfig.backup.encryption ? 'configured' : 'disabled',
  retentionDays: appConfig.backup.retentionDays,
  retention: {
    daily: appConfig.backup.dailyKeep,
    weekly: appConfig.backup.weeklyKeep,
    monthly: appConfig.backup.monthlyKeep
  },
  directoryConfigured: Boolean(appConfig.backup.directory)
});

export const listBackupManifests = async () => {
  const root = await ensureBackupRoot();
  const entries = await fsp.readdir(root, { withFileTypes: true }).catch(() => []);
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(root, entry.name, 'manifest.json');
    try {
      const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
      manifests.push({ ...manifest, directoryName: entry.name });
    } catch {
      // Ignore incomplete or manually edited folders.
    }
  }
  return manifests.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
};

export const getBackupStatus = async () => {
  const manifests = await listBackupManifests();
  const last = manifests[0] || backupState.lastBackup;
  return {
    status: backupState.status,
    lastBackupTime: last?.completedAt || last?.startedAt || null,
    backupStatus: last?.status || backupState.status,
    backupSize: last?.totalSize || 0,
    backupType: last?.type || null,
    nextScheduledBackup: backupState.nextScheduledBackup,
    restoreStatus: backupState.restoreStatus,
    lastVerification: backupState.lastVerification,
    lastError: backupState.lastError,
    config: getBackupConfigSummary()
  };
};

const manifestPathFor = (directoryName) => path.join(backupRoot(), directoryName, 'manifest.json');

export const verifyBackup = async (directoryName) => {
  const manifestPath = manifestPathFor(directoryName);
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  const directory = path.dirname(manifestPath);
  const results = [];

  for (const file of manifest.files || []) {
    const filePath = path.join(directory, file.fileName);
    const stats = await fsp.stat(filePath);
    if (!stats.size) throw new Error(`Backup file is empty: ${file.fileName}`);

    if (file.fileName.endsWith('.gz')) {
      let readableBytes = 0;
      await pipeline(
        fs.createReadStream(filePath),
        zlib.createGunzip(),
        new Writable({
          write(chunk, encoding, callback) {
            readableBytes += chunk.length;
            callback();
          }
        })
      );
      if (!readableBytes) throw new Error(`Compressed backup is unreadable: ${file.fileName}`);
    }

    results.push({ fileName: file.fileName, size: stats.size, verified: true });
  }

  const verified = {
    backupId: manifest.backupId,
    directoryName,
    verifiedAt: now().toISOString(),
    filesVerified: results.length,
    totalSize: results.reduce((sum, item) => sum + item.size, 0),
    status: 'verified'
  };
  backupState.lastVerification = verified;
  logger.info('Backup verification completed', verified);
  return verified;
};

export const cleanupExpiredBackups = async () => {
  const manifests = await listBackupManifests();
  const cutoff = Date.now() - appConfig.backup.retentionDays * 24 * 60 * 60 * 1000;
  const keepByType = new Map([
    ['daily', appConfig.backup.dailyKeep],
    ['weekly', appConfig.backup.weeklyKeep],
    ['monthly', appConfig.backup.monthlyKeep]
  ]);
  const typeCounts = new Map();
  const removed = [];

  for (const manifest of manifests) {
    const type = manifest.type || 'manual';
    const created = new Date(manifest.startedAt || 0).getTime();
    const count = typeCounts.get(type) || 0;
    typeCounts.set(type, count + 1);
    const keepLimit = keepByType.get(type) || Number.POSITIVE_INFINITY;
    const expiredByAge = created && created < cutoff;
    const expiredByCount = count >= keepLimit;
    if (!expiredByAge && !expiredByCount) continue;

    const target = path.join(backupRoot(), manifest.directoryName);
    await fsp.rm(target, { recursive: true, force: true });
    removed.push(manifest.directoryName);
  }

  if (removed.length) logger.info('Expired backups removed', { removedCount: removed.length });
  return { removedCount: removed.length, removed };
};

export const createDatabaseBackup = async ({ type = 'manual', format = 'json', requestedBy = null } = {}) => {
  if (backupState.activeJob) return backupState.activeJob;

  backupState.activeJob = (async () => {
    const startedAt = now();
    const backupId = `${timestamp()}-${safeName(type)}`;
    const outputDir = path.join(await ensureBackupRoot(), backupId);
    const manifest = {
      backupId,
      type,
      format,
      provider: appConfig.backup.provider,
      compression: appConfig.backup.compression,
      encryption: appConfig.backup.encryption ? 'configured' : 'disabled',
      status: 'running',
      requestedBy,
      startedAt: startedAt.toISOString(),
      completedAt: null,
      durationMs: null,
      files: [],
      totalSize: 0,
      collections: []
    };

    try {
      backupState.status = 'running';
      backupState.lastError = null;
      logger.info('Backup started', { backupId, type, format, provider: appConfig.backup.provider });
      await fsp.mkdir(outputDir, { recursive: true, mode: 0o700 });

      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const item of collections) {
        const collection = mongoose.connection.db.collection(item.name);
        const exported = format === 'csv'
          ? await exportCollectionCsv({ collection, outputDir })
          : await exportCollectionJson({ collection, outputDir });
        manifest.files.push(exported);
        manifest.collections.push(item.name);
        manifest.totalSize += exported.size;
      }

      manifest.status = 'completed';
      manifest.completedAt = now().toISOString();
      manifest.durationMs = Date.now() - startedAt.getTime();
      await fsp.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });

      const verification = await verifyBackup(backupId);
      await cleanupExpiredBackups();
      backupState.status = 'completed';
      backupState.lastBackup = manifest;
      logger.info('Backup completed', { backupId, durationMs: manifest.durationMs, totalSize: manifest.totalSize, files: manifest.files.length });
      return { manifest, verification };
    } catch (error) {
      manifest.status = 'failed';
      manifest.completedAt = now().toISOString();
      manifest.durationMs = Date.now() - startedAt.getTime();
      manifest.error = error.message;
      await fsp.mkdir(outputDir, { recursive: true }).catch(() => undefined);
      await fsp.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2)).catch(() => undefined);
      backupState.status = 'failed';
      backupState.lastError = { message: error.message, at: now().toISOString() };
      logError(error, { scope: 'database_backup', backupId, type, format });
      throw error;
    } finally {
      backupState.activeJob = null;
    }
  })();

  return backupState.activeJob;
};

const scheduleToMs = (schedule) => {
  if (schedule === 'daily') return 24 * 60 * 60 * 1000;
  if (schedule === 'weekly') return 7 * 24 * 60 * 60 * 1000;
  if (schedule === 'monthly') return 30 * 24 * 60 * 60 * 1000;
  return 0;
};

export const startBackupScheduler = () => {
  if (!appConfig.backup.enabled || appConfig.backup.schedule === 'disabled' || backupState.schedulerStarted) return backupState;
  const interval = scheduleToMs(appConfig.backup.schedule);
  if (!interval) return backupState;
  backupState.schedulerStarted = true;
  backupState.nextScheduledBackup = new Date(Date.now() + interval).toISOString();
  setInterval(async () => {
    backupState.nextScheduledBackup = new Date(Date.now() + interval).toISOString();
    try {
      await createDatabaseBackup({ type: appConfig.backup.schedule, format: 'json', requestedBy: 'scheduler' });
    } catch (error) {
      logError(error, { scope: 'scheduled_backup' });
    }
  }, interval).unref();
  logger.info('Backup scheduler started', { schedule: appConfig.backup.schedule, nextScheduledBackup: backupState.nextScheduledBackup });
  return backupState;
};
