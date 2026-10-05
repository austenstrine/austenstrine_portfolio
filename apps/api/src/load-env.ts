import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

function loadIfPresent(path: string): void {
  if (existsSync(path)) {
    config({ path, override: false, quiet: true });
  }
}

const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../../.env'),
  resolve(process.cwd(), 'apps/api/.env'),
];

for (const candidate of [...new Set(candidates)]) {
  loadIfPresent(candidate);
}
