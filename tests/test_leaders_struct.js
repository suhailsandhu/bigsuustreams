async function checkLeaders() {
  const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261101");
  const data = await res.json();
  data.events.forEach(e => {
    console.log("\nEvent:", e.name);
    const comp = e.competitions[0];
    if (comp.leaders) {
      comp.leaders.forEach(l => {
        console.log("  Category:", l.name);
        l.leaders.forEach(lead => {
          console.log("    Athlete:", lead.athlete?.displayName, "Team:", lead.team?.id, "Val:", lead.displayValue, "Photo:", lead.athlete?.headshot?.href);
        });
      });
    }
  });
}
checkLeaders();
