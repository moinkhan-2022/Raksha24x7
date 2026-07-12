import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../..');
const rootDir = path.resolve(serverRoot, '..');
const nodeEnv = process.env.NODE_ENV || 'development';

const envFiles = [
  path.join(serverRoot, `.env.${nodeEnv}.local`),
  path.join(serverRoot, `.env.${nodeEnv}`),
  path.join(serverRoot, '.env.local'),
  path.join(serverRoot, '.env'),
  path.join(rootDir, `.env.${nodeEnv}.local`),
  path.join(rootDir, `.env.${nodeEnv}`),
  path.join(rootDir, '.env.local'),
  path.join(rootDir, '.env')
];

const loaded = [];
for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
    loaded.push(envPath);
  }
}

export default { loaded };
