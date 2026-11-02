async function checkSummaryLeaders() {
  const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401909904");
  const data = await res.json();
  if (data.leaders) {
    data.leaders.forEach(teamLeaders => {
      console.log("\nTeam:", teamLeaders.team?.displayName);
      (teamLeaders.leaders || []).forEach(cat => {
        const top = cat.leaders?.[0];
        console.log(`  ${cat.displayName}: ${top?.athlete?.displayName} (${top?.displayValue})`);
        console.log(`    Jersey: ${top?.athlete?.jersey}, Pos: ${top?.athlete?.position?.abbreviation}, Photo: ${top?.athlete?.headshot?.href}`);
      });
    });
  }
}
checkSummaryLeaders();
