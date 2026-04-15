import axios from 'axios';
import { getValidAccessToken, getAthleteName } from '../src/strava';
import { sendActivityEmbed } from '../src/discord';
import type { StravaActivity } from '../src/strava';

async function main() {
  const athleteId = Number(process.env.STRAVA_ATHLETE_ID);

  const accessToken = await getValidAccessToken(athleteId);
  if (!accessToken) {
    console.error('Brak tokenu dla atlety', athleteId);
    process.exit(1);
  }

  const { data: activities } = await axios.get<StravaActivity[]>(
    'https://www.strava.com/api/v3/athlete/activities',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 1 },
    }
  );

  if (!activities.length) {
    console.error('Brak aktywności');
    process.exit(1);
  }

  const activity = activities[0];
  const athleteName = await getAthleteName(athleteId);

  console.log(`Wysyłam aktywność: "${activity.name}" (${activity.sport_type}, ${activity.id})`);
  await sendActivityEmbed(activity, athleteName);
  console.log('✅ Wysłano na Discord');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
