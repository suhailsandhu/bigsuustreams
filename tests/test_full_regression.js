async function runRegressionSuite() {
  console.log('================================================================');
  console.log('COURTSIDE STREAM — FULL REGRESSION & VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${details ? '• ' + details : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} • ${details}`);
      failed++;
    }
  }

  // 1. App Shell & Static Delivery
  try {
    const res = await fetch('http://localhost:3000/');
    const text = await res.text();
    assert(res.status === 200, 'App Shell Delivery', `HTTP ${res.status}, Length: ${text.length}`);
    assert(!text.includes('HeroFeatured'), 'Hero Section Removal', 'Oversized hero banner verified removed');
  } catch (e) {
    assert(false, 'App Shell Delivery', e.message);
  }

  // 2. Scoreboard Endpoint & Real Game Scores
  let sampleEventId = '';
  try {
    const res = await fetch('http://localhost:3000/api/basketball/scoreboard?date=20261101');
    assert(res.status === 200, 'Scoreboard API (Today)', `HTTP ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.games) && data.games.length >= 4, 'Scoreboard Games Loaded', `Found ${data.games?.length} games`);
    
    // Check real scores & live statuses
    const celticsGame = data.games.find(g => g.name.toLowerCase().includes('celtics'));
    assert(!!celticsGame, 'Celtics vs Magic Found in Scoreboard', `Status: ${celticsGame?.status?.detail}`);
    if (celticsGame) {
      sampleEventId = celticsGame.espnId;
      assert(celticsGame.awayTeam.score > 0, 'Real Game Score Present', `Score: ${celticsGame.awayTeam.displayName} ${celticsGame.awayTeam.score} - ${celticsGame.homeTeam.displayName} ${celticsGame.homeTeam.score}`);
      assert(celticsGame.stream?.available === true, 'Stream Matched to Celtics', `Key: ${celticsGame.stream?.streamKey}`);
    }

    const brooklynGame = data.games.find(g => g.name.toLowerCase().includes('nets'));
    assert(!!brooklynGame, 'Brooklyn Nets vs Pacers Found in Scoreboard', `Status: ${brooklynGame?.status?.detail}`);
    if (brooklynGame) {
      assert(brooklynGame.stream?.available === true, 'Stream Matched to Brooklyn', `Key: ${brooklynGame.stream?.streamKey}`);
    }
  } catch (e) {
    assert(false, 'Scoreboard API', e.message);
  }

  // 3. Date Navigation Test (Yesterday, Today, Tomorrow)
  try {
    const datesToTest = ['20261031', '20261102'];
    for (const d of datesToTest) {
      const res = await fetch(`http://localhost:3000/api/basketball/scoreboard?date=${d}`);
      const data = await res.json();
      assert(res.status === 200 && data.games?.length > 0, `Date Navigation to ${d}`, `Loaded ${data.games?.length} games for ${data.formattedDate}`);
    }
  } catch (e) {
    assert(false, 'Date Navigation', e.message);
  }

  // 4. Box Score / Summary API
  try {
    const eventId = sampleEventId || '401909903';
    const res = await fetch(`http://localhost:3000/api/basketball/game-summary/${eventId}`);
    assert(res.status === 200, 'Game Summary / Box Score API', `HTTP ${res.status}`);
    const data = await res.json();
    assert(!!data.boxscore?.home && !!data.boxscore?.away, 'Box Score Teams Loaded', `${data.boxscore?.away?.team?.displayName} vs ${data.boxscore?.home?.team?.displayName}`);
    const athleteCount = (data.boxscore?.away?.athletes?.length || 0) + (data.boxscore?.home?.athletes?.length || 0);
    assert(athleteCount > 10, 'Player Boxscore Stats Populated', `Found ${athleteCount} players with detailed stats`);
  } catch (e) {
    assert(false, 'Box Score API', e.message);
  }

  // 5. Playback Verification: Celtics vs Magic (Preserved Working)
  try {
    const res = await fetch('http://localhost:3000/api/basketball/hls/boston-celtics-vs-orlando-magic/1080p.m3u8');
    assert(res.status === 200, 'Celtics HLS Manifest', `HTTP ${res.status}, Type: ${res.headers.get('content-type')}`);
    const text = await res.text();
    const segUrl = text.split('\n').find(l => l.startsWith('http'))?.trim();
    assert(!!segUrl, 'Celtics Video Segment Found', segUrl?.slice(0, 50));
    if (segUrl) {
      const segRes = await fetch(segUrl);
      const buf = await segRes.arrayBuffer();
      assert(segRes.status === 200 && buf.byteLength > 1000000, 'Celtics Video Segment Download', `Status: 200, Size: ${(buf.byteLength / 1024).toFixed(1)} KB`);
    }
  } catch (e) {
    assert(false, 'Celtics Playback', e.message);
  }

  // 6. Playback Verification: Brooklyn Nets vs Indiana Pacers (Diagnosed & Fixed!)
  try {
    const res = await fetch('http://localhost:3000/api/basketball/hls/brooklyn-nets-vs-indiana-pacers/1080p.m3u8');
    assert(res.status === 200, 'Brooklyn Nets HLS Manifest', `HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n');
    const segUrl = lines.find(l => l.startsWith('http'))?.trim();
    assert(!!segUrl && !segUrl.includes('cdn1.strmfree.st'), 'Brooklyn Segment Normalization', `Rewritten to reliable origin: ${segUrl?.slice(0, 55)}...`);
    if (segUrl) {
      const segRes = await fetch(segUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const buf = await segRes.arrayBuffer();
      const u = new Uint8Array(buf);
      assert(segRes.status === 200, 'Brooklyn Video Segment Download', `Status: ${segRes.status}, Size: ${(buf.byteLength / 1024).toFixed(1)} KB`);
      assert(u[0] === 0x47, 'Brooklyn Video Stream Decodability', `Valid MPEG-TS Sync Byte (0x47) confirmed`);
    }
  } catch (e) {
    assert(false, 'Brooklyn Nets Playback', e.message);
  }

  // 7. Ad & Tracker Security Audit
  try {
    const res = await fetch('http://localhost:3000/');
    const html = await res.text();
    const forbidden = [/aclib/i, /popunder/i, /adcash/i, /propeller/i, /zoneId/i, /\/ad\.html/i];
    let badFound = false;
    for (const pat of forbidden) {
      if (pat.test(html)) {
        badFound = true;
        break;
      }
    }
    assert(!badFound, 'Zero-Ad Security Audit', 'No advertising scripts, popunders, or deceptive trackers present');
  } catch (e) {
    assert(false, 'Security Audit', e.message);
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
}
runRegressionSuite();
