import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getValidAccessToken, fetchClubActivities } from '../src/strava';
import { sendActivityEmbed } from '../src/discord';
import { getRedis } from '../src/redis';

const CLUB_ID = 2115668;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const athleteId = Number(process.env.STRAVA_ATHLETE_ID);
  const accessToken = await getValidAccessToken(athleteId);
  if (!accessToken) {
    return res.status(500).json({ error: `No access token for athlete ${athleteId}` });
  }

  const activities = await fetchClubActivities(accessToken, CLUB_ID);
  const redis = await getRedis();

  // Pierwsze uruchomienie: wypełnij cache bez wysyłania na Discord
  const isBootstrap = !(await redis.get('club:initialized'));
  if (isBootstrap) {
    await redis.set('club:initialized', '1');
  }

  let posted = 0;
  // Reverse: najstarsza aktywność pierwsza → chronologiczny porządek na Discordzie
  for (const activity of [...activities].reverse()) {
    const sig = [
      activity.athlete.firstname,
      activity.athlete.lastname,
      activity.sport_type,
      activity.moving_time,
      Math.round(activity.distance),
    ].join('_');

    const exists = await redis.get(`seen:${sig}`);
    if (!exists) {
      await redis.set(`seen:${sig}`, '1', { EX: 60 * 60 * 24 * 7 });
      if (!isBootstrap) {
        await sendActivityEmbed(activity);
        posted++;
      }
    }
  }

  res.status(200).json({ checked: activities.length, posted, bootstrap: isBootstrap });
}
