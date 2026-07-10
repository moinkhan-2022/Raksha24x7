import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`Could not load server environment file at ${envPath}: ${result.error.message}`);
} else {
  console.log(`Loaded server environment from ${envPath}`);
}

export default result.parsed || {};
