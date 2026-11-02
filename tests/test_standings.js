async function testStandings() {
  const res = await fetch('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings');
  const d = await res.json();
  d.children.forEach(conf => {
    console.log(`\n=== ${conf.name} ===`);
    conf.standings.entries.slice(0, 5).forEach((e, i) => {
      const stats = {};
      e.stats.forEach(s => { stats[s.name] = s.displayValue; });
      console.log(`  ${i+1}. ${e.team.displayName}: ${stats.wins || stats.W || 0}-${stats.losses || stats.L || 0} (PCT: ${stats.winPercent || '.000'})`);
    });
  });
}
testStandings();
