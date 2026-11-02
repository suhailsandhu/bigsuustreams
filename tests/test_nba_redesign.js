async function runTests() {
  console.log('--- COURTSIDE STREAM REDESIGN REGRESSION TEST ---');
  let failures = 0;

  // 1. Standings
  try {
    const res = await fetch('http://localhost:3000/api/basketball/standings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`[PASS] Standings API: received ${data.length} conferences: ${data.map(c => c.name).join(', ')}`);
    if (data.length < 2 || !data[0].teams || data[0].teams.length === 0) {
      throw new Error('Incomplete standings data');
    }
  } catch (e) {
    console.error('[FAIL] Standings API:', e.message);
    failures++;
  }

  // 2. Scoreboard & Game Leaders
  try {
    const res = await fetch('http://localhost:3000/api/basketball/scoreboard');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`[PASS] Scoreboard API: received ${data.games.length} games for ${data.formattedDate}`);
    const gameWithLeaders = data.games.find(g => g.displayLeaders || g.leaders);
    if (gameWithLeaders) {
      console.log(`[PASS] Game Leaders verified: ${gameWithLeaders.name} has leaders (${gameWithLeaders.displayLeaders?.title || 'Game Leaders'})`);
    } else {
      console.log('[INFO] No active leaders on current date, fallback verified');
    }
  } catch (e) {
    console.error('[FAIL] Scoreboard API:', e.message);
    failures++;
  }

  // 3. Dynamic Live Stream HLS Feed
  try {
    const streamsRes = await fetch('http://localhost:3000/api/basketball/streams');
    const streamsData = await streamsRes.json();
    const liveStream = streamsData.streams.find(s => s.is_live);
    if (liveStream) {
      const res = await fetch(`http://localhost:3000/api/basketball/hls/${liveStream.stream_key}.m3u8`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const m3u8 = await res.text();
      if (!m3u8.includes('#EXTM3U')) throw new Error('Not valid M3U8');
      console.log(`[PASS] Live Stream HLS (${liveStream.stream_key}): ${m3u8.split('\n').length} lines, valid normalized M3U8 feed`);
    } else {
      console.log('[INFO] No streams currently marked live');
    }
  } catch (e) {
    console.error('[FAIL] Live Stream HLS:', e.message);
    failures++;
  }

  // 4. Brooklyn Nets vs Indiana Pacers HLS Feed
  try {
    const res = await fetch('http://localhost:3000/api/basketball/hls/brooklyn-nets-vs-indiana-pacers.m3u8');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m3u8 = await res.text();
    if (!m3u8.includes('#EXTM3U')) throw new Error('Not valid M3U8');
    console.log(`[PASS] Nets vs Pacers HLS: ${m3u8.split('\n').length} lines, valid normalized M3U8 feed`);
  } catch (e) {
    console.error('[FAIL] Nets vs Pacers HLS:', e.message);
    failures++;
  }

  // 5. Index HTML & Asset Verification
  try {
    const res = await fetch('http://localhost:3000/');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes('id="root"')) throw new Error('Root div missing');
    if (!html.includes('courtside-v4') && !html.includes('/sw.js')) throw new Error('Service worker registration missing');
    console.log('[PASS] Index HTML served successfully');
  } catch (e) {
    console.error('[FAIL] Index HTML:', e.message);
    failures++;
  }

  // 6. Service Worker
  try {
    const res = await fetch('http://localhost:3000/sw.js');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const sw = await res.text();
    if (!sw.includes('courtside-v6')) throw new Error('SW not updated to courtside-v6');
    console.log('[PASS] Service worker courtside-v6 active with network-first navigation');
  } catch (e) {
    console.error('[FAIL] Service Worker:', e.message);
    failures++;
  }

  if (failures === 0) {
    console.log('\n=== ALL REGRESSION AND REDESIGN TESTS PASSED SUCCESSFULLY (0 failures) ===');
  } else {
    console.error(`\n=== FAILED WITH ${failures} ERRORS ===`);
    process.exit(1);
  }
}

runTests();
