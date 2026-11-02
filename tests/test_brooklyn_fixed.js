async function testBrooklynFixed() {
  const m = await import('../src/server/streamService.ts');
  const hls = await m.resolveHlsStream('brooklyn-nets-vs-indiana-pacers', '1080p');
  console.log('M3U8 line count:', hls.m3u8Text.split('\n').length);
  
  // Test rewriting
  const lines = hls.m3u8Text.split('\n');
  const segUrl = lines.find(l => l.startsWith('http') || l.endsWith('.js') || l.endsWith('.ts'))?.trim();
  console.log('Original seg:', segUrl);

  const fixedSeg = segUrl.replace(/https?:\/\/cdn1\.strmfree\.st\/live\//, 'https://strmfree.st/live/');
  console.log('Fixed seg:', fixedSeg);

  const res = await fetch(fixedSeg, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('Fixed Seg Status:', res.status, 'Size:', res.headers.get('content-length'));
  const buf = await res.arrayBuffer();
  const u = new Uint8Array(buf);
  console.log('Sync byte 0x47:', u[0] === 0x47, 'Size KB:', (buf.byteLength / 1024).toFixed(1));
}
testBrooklynFixed();
