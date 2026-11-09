import { build } from 'vite';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { cleanCssForSmartTv } from './postprocess-css.mjs';

async function run() {
  console.log('[Build] Starting Vite client bundle...');
  await build();
  console.log('[Build] Vite client build complete.');

  console.log('[Build] Post-processing CSS for Smart TV browsers...');
  const assetsDir = path.resolve('dist/assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
    for (const f of files) {
      const fullPath = path.join(assetsDir, f);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const processed = cleanCssForSmartTv(raw);
      fs.writeFileSync(fullPath, processed, 'utf8');
      console.log(`[Smart TV Optimizer] Successfully unrolled layers in ${f} (${processed.length} bytes, @layer: ${processed.includes('@layer')})`);
    }
  }

  console.log('[Build] Bundling server.js via esbuild...');
  await esbuild.build({
    entryPoints: ['server.js'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: 'dist/server.js'
  });
  console.log('[Build] Server build complete: dist/server.js');
  console.log('[Build] All builds finished successfully!');
}

run().catch((err) => {
  console.error('[Build Error]', err);
  process.exit(1);
});
