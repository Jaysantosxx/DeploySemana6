import dotenv from 'dotenv';
import path from 'node:path';

const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'src', '.env'),
];
for (const envPath of candidates) {
  dotenv.config({ path: envPath, quiet: true });
}
