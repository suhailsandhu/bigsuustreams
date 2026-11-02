async function inspectAllBrooklyn() {
  const m = await import('../src/server/streamService.ts');
  for (const q of ['1080p', '540p', '720p']) {
    try {
      console.log(`\n=== Testing Brooklyn Nets [${q}] ===`);
      const hls = await m.resolveHlsStream('brooklyn-nets-vs-indiana-pacers', q);
      console.log('Upstream URL:', hls.upstreamUrl);
      const lines = hls.m3u8Text.split('\n');
      const segs = lines.filter(l => l.trim().length > 0 && !l.startsWith('#')).slice(0, 3);
      console.log('First 3 segments:', segs);
    } catch (e) {
      console.error(`Failed ${q}:`, e.message);
    }
  }
}
inspectAllBrooklyn();
