async function testEspn() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Day:', data.day?.date);
    console.log('Events count:', data.events?.length);
    if (data.events?.length > 0) {
      data.events.forEach((e, idx) => {
        const c = e.competitions?.[0];
        const comp1 = c?.competitors?.find(x => x.homeAway === 'home') || c?.competitors?.[0];
        const comp2 = c?.competitors?.find(x => x.homeAway === 'away') || c?.competitors?.[1];
        console.log(`\nEvent ${idx}: ${e.name} (ID: ${e.id})`);
        console.log(`  Status: ${e.status?.type?.name} (${e.status?.type?.detail || e.status?.type?.description})`);
        console.log(`  Period: ${e.status?.period}, Clock: ${e.status?.displayClock}`);
        console.log(`  Home: ${comp1?.team?.displayName} [${comp1?.score || 0}] (${comp1?.records?.[0]?.summary || ''})`);
        console.log(`  Away: ${comp2?.team?.displayName} [${comp2?.score || 0}] (${comp2?.records?.[0]?.summary || ''})`);
        
        if (c?.leaders?.length > 0) {
          console.log('  Leaders:');
          c.leaders.forEach(lead => {
            const top = lead.leaders?.[0];
            if (top) {
              console.log(`    ${lead.displayName}: ${top.athlete?.displayName} (${top.displayValue}) - ${top.athlete?.headshot?.href || 'no photo'}`);
            }
          });
        }
      });
    }
  } catch (err) {
    console.error('ESPN fetch error:', err);
  }
}
testEspn();
