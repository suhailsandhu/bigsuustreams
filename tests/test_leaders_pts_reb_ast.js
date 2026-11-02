async function testLeadersStats() {
  const eventId = '401909904'; // Brooklyn Nets at Indiana Pacers
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`);
  const data = await res.json();
  
  // From boxscore.players, find the top scorer for each team and their stats
  if (data.boxscore?.players) {
    data.boxscore.players.forEach(teamObj => {
      const teamName = teamObj.team?.displayName;
      const statsObj = teamObj.statistics?.[0];
      const names = statsObj?.names || [];
      const ptsIdx = names.indexOf('PTS');
      const rebIdx = names.indexOf('REB');
      const astIdx = names.indexOf('AST');

      // Sort athletes by PTS descending
      const athletes = (statsObj?.athletes || []).filter(a => !a.didNotPlay);
      athletes.sort((a, b) => {
        const ptsA = parseInt(a.stats?.[ptsIdx] || '0', 10);
        const ptsB = parseInt(b.stats?.[ptsIdx] || '0', 10);
        return ptsB - ptsA;
      });

      const leader = athletes[0];
      if (leader) {
        console.log(`Team: ${teamName}`);
        console.log(`  Leader: ${leader.athlete?.displayName} (${leader.athlete?.jersey} | ${leader.athlete?.position?.abbreviation})`);
        console.log(`  Photo: ${leader.athlete?.headshot?.href}`);
        console.log(`  PTS: ${leader.stats?.[ptsIdx]}, REB: ${leader.stats?.[rebIdx]}, AST: ${leader.stats?.[astIdx]}`);
      }
    });
  }
}
testLeadersStats();
