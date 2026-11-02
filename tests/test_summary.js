async function testSummary() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401909903';
  const res = await fetch(url);
  const data = await res.json();
  console.log('Summary Top Keys:', Object.keys(data));
  
  if (data.leaders) {
    console.log('\n--- LEADERS ---');
    data.leaders.forEach(teamLead => {
      console.log(`Team: ${teamLead.team?.displayName}`);
      (teamLead.leaders || []).forEach(lead => {
        const top = lead.leaders?.[0];
        console.log(`  ${lead.displayName}: ${top?.athlete?.displayName} (${top?.displayValue}) [Jersey #${top?.athlete?.jersey}, Pos: ${top?.athlete?.position?.abbreviation}] Photo: ${top?.athlete?.headshot?.href || 'none'}`);
      });
    });
  }

  if (data.boxscore?.players) {
    console.log('\n--- BOXSCORE PLAYERS ---');
    data.boxscore.players.forEach(teamPlayers => {
      console.log(`Team: ${teamPlayers.team?.displayName}`);
      const stats = teamPlayers.statistics?.[0];
      console.log(`  Stat names:`, stats?.names?.slice(0, 8).join(', '));
      const athletes = stats?.athletes || [];
      console.log(`  Athletes count:`, athletes.length);
      if (athletes.length > 0) {
        athletes.slice(0, 3).forEach(a => {
          console.log(`    ${a.athlete?.displayName}: ${a.stats?.slice(0, 8).join(' | ')}`);
        });
      }
    });
  }
}
testSummary();
