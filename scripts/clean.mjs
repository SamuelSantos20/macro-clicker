import { rm } from 'node:fs/promises';
// Fixed path relative to this script, independent of the invoking directory.
await rm(new URL('../dist/', import.meta.url), {
  recursive: true,
  force: true,
});
