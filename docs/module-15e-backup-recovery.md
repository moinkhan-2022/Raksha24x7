# Module 15E – Backup & Recovery

Raksha24x7 now has a production-ready backup and recovery architecture for MongoDB-backed deployments.

## Scope

This module prepares the backend for:

- full database backups
- manual backups
- scheduled backups
- future incremental backups
- local development backups
- MongoDB Atlas snapshot compatibility
- future S3 / Google Cloud Storage / Azure Blob providers
- backup verification
- retention cleanup
- admin dashboard integration
- disaster recovery procedures

No frontend UI changes are required.

## Configuration

Backup configuration is environment-driven:

```env
BACKUP_ENABLED=false
BACKUP_DIRECTORY=server/backups
BACKUP_RETENTION_DAYS=30
BACKUP_KEEP_DAILY=7
BACKUP_KEEP_WEEKLY=4
BACKUP_KEEP_MONTHLY=12
BACKUP_SCHEDULE=daily
BACKUP_PROVIDER=local
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=false
BACKUP_ENCRYPTION_KEY=
BACKUP_MAX_COLLECTION_EXPORT=0
```

Supported providers:

- `local`
- `atlas`
- `s3` future-ready
- `gcs` future-ready
- `azure` future-ready

Supported schedules:

- `disabled`
- `daily`
- `weekly`
- `monthly`

Production recommendation:

- Use MongoDB Atlas automated snapshots as the primary backup.
- Use Raksha24x7 application exports as a secondary operational backup.
- Avoid long-term local backups on ephemeral hosts such as Render/Railway unless mounted persistent storage is configured.

## What gets backed up

The backup service exports every MongoDB collection currently available through the active database connection.

This includes current and future collections such as:

- users
- admins
- SOS records
- emergency contacts embedded in users
- notifications
- notification devices
- email logs
- email queue
- admin audit logs
- settings
- analytics/event collections

## Backup format

Default:

- JSON collection exports
- gzip compression enabled
- one file per collection
- `manifest.json` for integrity and metadata

CSV export is available for admin-triggered operational exports.

BSON/mongodump compatibility is documented for production restore flows, but the application service avoids shelling out to platform-specific binaries.

## Admin backup APIs

All endpoints are JWT-protected by admin authentication:

```http
GET /api/admin/backups/status
GET /api/admin/backups
POST /api/admin/backups
POST /api/admin/backups/:backupId/verify
POST /api/admin/backups/cleanup
```

Manual backup payload:

```json
{
  "type": "manual",
  "format": "json"
}
```

Allowed formats:

- `json`
- `csv`

Allowed types:

- `manual`
- `daily`
- `weekly`
- `monthly`
- `full`
- `incremental`

`incremental` is accepted for future-ready metadata but currently performs a full export.

## Backup verification

Verification checks:

- manifest exists
- exported files exist
- file size is greater than zero
- compressed files can be decompressed and read
- backup metadata is parseable

Verification results are logged and returned through admin APIs.

## Retention policy

Default retention:

- keep last 7 daily backups
- keep last 4 weekly backups
- keep last 12 monthly backups
- remove backups older than 30 days

Retention is configurable using env variables.

## Backup logging

The backend logs:

- backup started
- backup completed
- backup failed
- verification completed
- retention cleanup
- storage provider
- duration
- size
- error messages

Logs never include MongoDB URI, passwords, JWT secrets, SMTP credentials, API keys, Google secrets, or environment variables.

## Restore strategy

### Full restore from MongoDB Atlas snapshot

1. Stop application writes or enable maintenance mode.
2. In MongoDB Atlas, choose the latest verified snapshot.
3. Restore to a new cluster when possible.
4. Validate collections and indexes.
5. Update `MONGODB_URI` to the restored cluster.
6. Restart backend.
7. Verify `/api/health`.
8. Verify authentication, dashboard, SOS, notifications, email, and admin APIs.
9. Monitor logs for errors.

### Full restore from application JSON backup

1. Stop backend writes.
2. Copy backup folder from secure storage.
3. Verify the backup manifest.
4. Decompress collection files.
5. Import collections into a clean MongoDB database using `mongoimport`.
6. Recreate indexes using application startup/model definitions where applicable.
7. Run smoke tests.
8. Restart backend with restored `MONGODB_URI`.

Example:

```bash
mongoimport --uri "$MONGODB_URI" --collection users --file users.json --jsonArray
```

### Collection restore

1. Identify the affected collection.
2. Export current damaged collection for rollback evidence.
3. Restore only the target collection into a temporary database.
4. Compare document counts and sample records.
5. Replace or merge into production using a scripted migration.
6. Validate related application flows.

### Selective restore

Use a temporary database and copy only selected documents after validation. Never import unknown documents directly into production.

## Disaster recovery plan

### Database corruption

1. Stop writes.
2. Capture current logs and database status.
3. Restore latest verified Atlas snapshot to a new cluster.
4. Validate application health.
5. Switch backend `MONGODB_URI`.

### Accidental deletion

1. Identify deleted collection/document scope.
2. Restore latest backup to a temporary database.
3. Selectively reinsert verified records.
4. Audit affected admin/user actions.

### Server crash

1. Deploy the previous stable backend version.
2. Verify environment variables.
3. Verify MongoDB connectivity.
4. Check `/api/health`.

### Credential compromise

1. Rotate JWT, admin JWT, cookie, session, Firebase, SMTP, Google, and MongoDB credentials.
2. Revoke active admin sessions.
3. Force user re-authentication if JWT secrets changed.
4. Review admin audit logs and security logs.

### Deployment rollback

1. Roll back frontend and backend deployments.
2. Keep database unchanged unless migration caused damage.
3. Verify health, auth, admin panel, SOS, notifications, and email.

## Recovery validation checklist

- Backend starts normally.
- `/api/health` returns healthy.
- User login works.
- Admin login works.
- SOS flow works.
- Notifications load.
- Email provider works.
- Dashboard loads.
- Admin audit logs exist.
- Collection counts match expectations.
- Recent backup verification passes.

## Security

- Backup files are stored outside public routes.
- Backup directories are created with restricted permissions.
- Backup files are not committed to Git.
- Admin APIs do not expose backup download URLs.
- Sensitive credentials are never logged.
- Optional encryption is configuration-ready for future cloud storage providers.

## Troubleshooting

### Backup fails with MongoDB disconnected

Check `MONGODB_URI`, Atlas IP allow-list, database user credentials, and `/api/health`.

### Backup directory permission denied

Set `BACKUP_DIRECTORY` to a writable persistent location for your host.

### Backup too large

Use Atlas snapshots for full database backups and set `BACKUP_MAX_COLLECTION_EXPORT` for operational exports.

### Local backups disappear on deploy

Render/Railway filesystems may be ephemeral. Use Atlas snapshots or persistent disks/cloud object storage.
