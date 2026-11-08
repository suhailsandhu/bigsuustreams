import fs from 'fs';
import path from 'path';

function unwrapLayers(css) {
  let result = '';
  let i = 0;
  const len = css.length;

  while (i < len) {
    if (css.startsWith('@layer', i)) {
      const openIdx = css.indexOf('{', i);
      if (openIdx !== -1) {
        i = openIdx + 1;
        let depth = 1;
        const start = i;
        while (i < len && depth > 0) {
          if (css[i] === '{') depth++;
          else if (css[i] === '}') depth--;
          i++;
        }
        const inner = css.slice(start, i - 1);
        result += unwrapLayers(inner);
        continue;
      }
    }
    result += css[i];
    i++;
  }
  return result;
}

export function cleanCssForSmartTv(css) {
  // 1. Unroll all @layer declarations so rules are standard top-level CSS for older TV browsers
  let cleaned = unwrapLayers(css);
  // 2. Remove @property at-rules that break older CSS parsers
  cleaned = cleaned.replace(/@property\s+[^{]+{[^}]+}/g, '');
  return cleaned;
}

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
