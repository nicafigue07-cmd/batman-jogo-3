import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run representative ground/air missions and platform input workflows.
// Each runner closes its browser and preserves its actual exit status.
for (const filename of ['terrain-smoke.mjs','platform-smoke.mjs']) {
  const result=spawnSync(process.execPath,[fileURLToPath(new URL(filename,import.meta.url))],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
