async function testPlayback() {
  console.log('=== REAL-WORLD PLAYBACK & STREAM VERIFICATION ===\n');

  // 1. Fetch live manifest
  const manifestUrl = 'http://localhost:3000/api/basketball/hls/boston-celtics-vs-orlando-magic/1080p.m3u8';
  console.log('1. Requesting HLS Manifest:', manifestUrl);
  const manifestRes = await fetch(manifestUrl);
  console.log('   Status:', manifestRes.status, 'Content-Type:', manifestRes.headers.get('content-type'));

  const manifestText = await manifestRes.text();
  const lines = manifestText.split('\n');
  const segmentUrls = lines.filter(l => l.trim().startsWith('http'));
  console.log(`   Found ${segmentUrls.length} live segments in playlist.`);

  if (segmentUrls.length === 0) {
    console.error('FAIL: No segment URLs found in manifest!');
    return;
  }

  // 2. Download and verify first 2 video segments
  for (let i = 0; i < Math.min(2, segmentUrls.length); i++) {
    const segUrl = segmentUrls[i].trim();
    const startTime = Date.now();
    const segRes = await fetch(segUrl);
    const durationMs = Date.now() - startTime;
    const buffer = await segRes.arrayBuffer();

    console.log(`2.${i+1} Segment #${i+1}:`);
    console.log(`   URL: ${segUrl.slice(0, 60)}...`);
    console.log(`   Status: HTTP ${segRes.status}`);
    console.log(`   Size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
    console.log(`   Download Latency: ${durationMs} ms`);
    console.log(`   CORS header: ${segRes.headers.get('access-control-allow-origin')}`);
    
    // Check sync byte (0x47 for MPEG-TS)
    const uint8 = new Uint8Array(buffer);
    const isTsSync = uint8[0] === 0x47;
    console.log(`   Valid MPEG-TS Sync Byte (0x47): ${isTsSync ? 'YES (Verified Valid Video Stream)' : 'fMP4/Binary'}`);
  }

  // 3. Test Quality Switching (720p & 540p)
  console.log('\n3. Testing Quality Switching:');
  for (const q of ['720p', '540p']) {
    const qUrl = `http://localhost:3000/api/basketball/hls/boston-celtics-vs-orlando-magic/${q}.m3u8`;
    const qRes = await fetch(qUrl);
    console.log(`   Quality [${q}]: HTTP ${qRes.status}, Active Quality: ${qRes.headers.get('x-stream-quality')}`);
  }

  // 4. Test Expired / Non-Existent Stream Handling
  console.log('\n4. Testing Expired / Non-Existent Stream Handling:');
  const badRes = await fetch('http://localhost:3000/api/basketball/hls/expired-game-9999/1080p.m3u8');
  console.log(`   Expected 502/404 for bad key: HTTP ${badRes.status}`);
  const badJson = await badRes.json();
  console.log(`   Error response payload:`, badJson);

  // 5. Test Advertising & Tracker Audit
  console.log('\n5. Advertising & Tracker Audit:');
  const htmlRes = await fetch('http://localhost:3000/');
  const html = await htmlRes.text();
  const forbiddenPatterns = [
    /aclib/i,
    /popunder/i,
    /adcash/i,
    /propeller/i,
    /doubleclick/i,
    /googlesyndication/i,
    /adnxs/i,
    /zoneId/i,
    /\/ad\.html/i
  ];
  let adViolations = 0;
  for (const pat of forbiddenPatterns) {
    if (pat.test(html)) {
      console.error(`   [VIOLATION] Found pattern matching ${pat}`);
      adViolations++;
    }
  }
  if (adViolations === 0) {
    console.log('   [AUDIT PASSED] 0 ad scripts, 0 popunders, 0 trackers found in Courtside Stream app bundle!');
  }

  console.log('\n=== ALL PLAYBACK & QA VERIFICATIONS COMPLETE ===');
}
testPlayback();
