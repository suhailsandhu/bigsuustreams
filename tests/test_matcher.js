async function testMatcher() {
  const streamMod = await import('../src/server/streamService.ts');
  const streamsData = await streamMod.getBasketballStreams();
  console.log(`Loaded ${streamsData.streams.length} stream games.`);

  const espnRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard');
  const espnData = await espnRes.json();
  console.log(`Loaded ${espnData.events?.length || 0} ESPN NBA events.`);

  function normalize(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  for (const stream of streamsData.streams) {
    console.log(`\nMatching Stream: "${stream.name}" (key: ${stream.stream_key})`);
    const streamKeyNorm = normalize(stream.stream_key);

    const match = (espnData.events || []).find(e => {
      const comp1 = e.competitions?.[0]?.competitors?.[0]?.team;
      const comp2 = e.competitions?.[0]?.competitors?.[1]?.team;
      
      const t1Norm = normalize(comp1?.name || comp1?.displayName);
      const t2Norm = normalize(comp2?.name || comp2?.displayName);

      const hasT1 = streamKeyNorm.includes(t1Norm) || streamKeyNorm.includes(normalize(comp1?.shortDisplayName));
      const hasT2 = streamKeyNorm.includes(t2Norm) || streamKeyNorm.includes(normalize(comp2?.shortDisplayName));

      return hasT1 && hasT2;
    });

    if (match) {
      console.log(`  -> MATCH FOUND: ESPN Event "${match.name}" (ID: ${match.id})`);
      console.log(`     Status: ${match.status?.type?.detail || match.status?.type?.description}`);
    } else {
      console.log(`  -> No direct NBA match found (might be NCAA or different date)`);
    }
  }
}
testMatcher();
