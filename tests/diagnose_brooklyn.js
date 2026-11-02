async function testBrooklynSegment() {
  const m = await import('../src/server/streamService.ts');
  const hls = await m.resolveHlsStream('brooklyn-nets-vs-indiana-pacers', '1080p');
  console.log('Available qualities:', hls.availableQualities);
  console.log('M3U8 text lines:');
  const lines = hls.m3u8Text.split('\n');
  lines.slice(0, 15).forEach(l => console.log('  ', l));
  
  const segUrl = lines.find(l => l.startsWith('http'))?.trim();
  console.log('\nTesting first segment URL:', segUrl);
  if (!segUrl) return;

  try {
    const res = await fetch(segUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://strmfree.st/'
      }
    });
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('CORS Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    const buf = await res.arrayBuffer();
    console.log('Segment size (bytes):', buf.byteLength);
  } catch (e) {
    console.error('Segment fetch failed:', e);
  }
}
testBrooklynSegment();
