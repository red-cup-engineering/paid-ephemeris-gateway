import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const outputRoot = join(import.meta.dirname, '..', 'js', 'engine');

await mkdir(outputRoot, { recursive: true });
for (const name of ['types', 'srs', 'stability', 'lightcone']) {
  await cp(require.resolve(`@red-cup-engineering/education-platform-service/${name}`), join(outputRoot, `${name}.js`));
}
