async function run() {
  const m = await import('../src/server/scoreboardService.ts');
  const sb = await m.getScoreboard('20261101');
  console.log('Scoreboard for:', sb.date, sb.formattedDate, 'Games:', sb.games.length, 'Live count:', sb.liveCount);
  sb.games.forEach(g => {
    console.log(`\n[${g.league}] ${g.awayTeam.displayName} (${g.awayTeam.score}) @ ${g.homeTeam.displayName} (${g.homeTeam.score})`);
    console.log(`  Status: ${g.status.detail} (Live: ${g.status.isLive})`);
    console.log(`  Stream: Available=${g.stream?.available}, Live=${g.stream?.isLive}, Key=${g.stream?.streamKey}`);
    if (g.leaders?.away?.pointsLeader) {
      console.log(`  Away PTS Leader: ${g.leaders.away.pointsLeader.athlete.displayName} (${g.leaders.away.pointsLeader.displayValue})`);
    }
    if (g.leaders?.home?.pointsLeader) {
      console.log(`  Home PTS Leader: ${g.leaders.home.pointsLeader.athlete.displayName} (${g.leaders.home.pointsLeader.displayValue})`);
    }
  });
}
run();
