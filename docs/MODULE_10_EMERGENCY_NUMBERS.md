# Module 10 — Emergency Numbers

The module is local-first: verified bundled national numbers load instantly, IndexedDB caches the directory, and localStorage persists settings, favorites, searches, analytics, and recent usage.

Optional Supabase administration is enabled with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Apply `supabase/emergency_numbers.sql` before enabling remote updates. The existing Mongo/JWT authentication remains unchanged; favorite synchronization can be connected after a Supabase user session is introduced. Local favorites continue to work without Supabase.

Imported JSON may be an array or `{ "numbers": [] }`. CSV headers follow the exported format. Imports are capped at 500 records, sanitized, validated, and merged by country, number, and service.

The production service worker caches same-origin navigation and assets after first use. Nearby service discovery uses the existing OpenStreetMap/Overpass implementation and does not require Google Places billing.
