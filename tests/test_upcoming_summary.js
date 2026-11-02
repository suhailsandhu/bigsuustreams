async function testUpcomingSummary() {
  const eventId = '401909905'; // LA Clippers at Golden State Warriors
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`);
  const data = await res.json();
  console.log('Upcoming keys:', Object.keys(data));
  if (data.leaders) {
    console.log('Season Leaders count:', data.leaders.length);
    data.leaders.forEach(teamLead => {
      console.log(`Team: ${teamLead.team?.displayName}`);
      teamLead.leaders?.forEach(l => {
        const top = l.leaders?.[0];
        console.log(`  ${l.displayName}: ${top?.athlete?.displayName} (${top?.displayValue})`);
      });
    });
  }
}
testUpcomingSummary();
