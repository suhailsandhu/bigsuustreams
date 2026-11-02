async function testServer() {
  const tests = [
    { name: 'App Shell (HTML)', url: 'http://localhost:3000/' },
    { name: 'PWA Manifest', url: 'http://localhost:3000/manifest.json' },
    { name: 'Service Worker', url: 'http://localhost:3000/sw.js' },
    { name: 'Streams API', url: 'http://localhost:3000/api/basketball/streams' },
    { name: 'Single Game API', url: 'http://localhost:3000/api/basketball/stream/boston-celtics-vs-orlando-magic' },
    { name: 'Live HLS Manifest', url: 'http://localhost:3000/api/basketball/hls/boston-celtics-vs-orlando-magic/1080p.m3u8' }
  ];

  for (const t of tests) {
    try {
      const res = await fetch(t.url);
      const text = await res.text();
      console.log(`[PASS] ${t.name}: HTTP ${res.status}, Type: ${res.headers.get('content-type')}, Length: ${text.length}`);
      if (t.name === 'Live HLS Manifest') {
        console.log('   M3U8 Sample (First 3 lines):', text.split('\n').slice(0, 3).join(' | '));
      }
      if (t.name === 'Streams API') {
        const json = JSON.parse(text);
        console.log(`   Count: ${json.count}, Live games: ${json.streams.filter(s => s.is_live).map(s => s.name).join(', ')}`);
      }
    } catch (e) {
      console.log(`[FAIL] ${t.name}: ${e.message}`);
    }
  }
}
testServer();
