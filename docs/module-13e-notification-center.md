# Module 13E - Notification Center

## Scope

Module 13E completes the user-facing notification system for Raksha24x7. It adds a dedicated Notification Center, server-side history APIs, analytics foundation, bulk management, export, and broadcast-ready backend structure.

## Folder Structure

- `client/src/pages/NotificationCenterPage.jsx` - dedicated notification center UI.
- `client/src/context/NotificationContext.jsx` - quick notification drawer and live badge state.
- `server/src/notifications/models` - notification, log, queue, settings, device token, and broadcast-ready models.
- `server/src/notifications/services` - notification CRUD, analytics, queue, settings, logs, and broadcast-ready services.
- `server/src/notifications/routes/notification.route.js` - protected notification APIs mounted at `/api/notifications`.

## Notification Flow

1. App module creates an in-app notification through `createNotification`.
2. Notification is stored with user ownership, priority, status, channel, metadata and deduplication key.
3. Notification Queue receives queued work for future background processing.
4. Notification Center fetches paginated history with search/filter/sort.
5. Opening a notification marks it as read and logs an `open` action.
6. Analytics aggregates totals, read rate, delivery rate, open rate and average read time.

## APIs

All APIs are JWT protected through `/api/notifications`.

- `GET /` - list notifications with pagination/search/filter/sort.
- `GET /unread-count` - unread badge count.
- `GET /analytics/summary` - user notification analytics.
- `GET /export/history.csv` - CSV export for current query.
- `GET /settings` - notification settings.
- `PATCH /settings` - update settings.
- `POST /` - create notification.
- `PATCH /read` - mark selected notifications read.
- `PATCH /unread` - mark selected notifications unread.
- `PATCH /read-all` - mark all read.
- `PATCH /undo-delete` - restore soft-deleted notifications.
- `PATCH /:id/open` - mark/open one notification.
- `PATCH /:id` - update allowed notification fields.
- `DELETE /bulk` - soft-delete selected notifications.
- `DELETE /all` - soft-delete all user notifications.
- `DELETE /:id` - soft-delete one notification.

## Query Parameters

- `page`, `limit`
- `search`
- `type` / `category`
- `priority`
- `read=true|false`
- `datePreset=today|yesterday|7d|30d`
- `sort=newest|oldest|priority|unread|alphabetical|category`
- `deleted=true|all`

## Security

- All user history APIs are scoped by authenticated `userId`.
- Soft-delete prevents accidental permanent loss.
- Payload validation blocks unsupported types, channels and priorities.
- Deduplication reduces spam from repeated events.
- Broadcast model is backend-ready only; no admin UI is introduced in Module 13E.

## Testing Guide

1. Log in as a normal user.
2. Open `/notifications`.
3. Verify pagination, search, filters, sorting and load more.
4. Open a notification and confirm it becomes read.
5. Mark selected notifications read/unread.
6. Delete selected notifications and test undo.
7. Export CSV.
8. Confirm dashboard/header unread badge updates through the existing notification context.
9. Run backend syntax checks and frontend production build.

## Deployment Notes

- No new environment variables are required.
- Existing MongoDB indexes support user-scoped history queries.
- Future admin broadcast processing can use `NotificationBroadcast` without changing the user-facing center.
