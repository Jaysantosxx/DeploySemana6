import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  path.resolve(serverDirectory, '.env'),
  path.resolve(serverDirectory, 'src', '.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of candidates) {
  dotenv.config({ path: envPath, quiet: true });
}
