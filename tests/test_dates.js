async function testDates() {
  const dates = ['20261031', '20261101', '20261102'];
  for (const d of dates) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Date: ${d} -> ${data.events?.length || 0} NBA games`);
    if (data.events?.length > 0) {
      console.log(`  First game: ${data.events[0].name} - ${data.events[0].status?.type?.detail || data.events[0].status?.type?.description}`);
    }
  }
}
testDates();
