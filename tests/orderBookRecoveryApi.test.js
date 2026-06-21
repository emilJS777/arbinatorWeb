import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('order book recovery API exposes ML dataset clear endpoint', () => {
  const source = readFileSync(resolve(__dirname, '../src/api/orderBookRecovery.js'), 'utf8');

  assert.match(source, /clearMlDataset\(\)/);
  assert.match(source, /\/orderbook-recovery\/ml\/dataset\/clear/);
});
