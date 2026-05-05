import axios from 'axios';
import { getRedis } from './redis';

const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_URL = 'https://www.strava.com/api/v3';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
}

export interface ClubActivity {
  athlete: {
    firstname: string;
    lastname: string;
  };
  name: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date_local?: string;
}

function seedTokenFromEnv(): TokenData | null {
  const { STRAVA_ATHLETE_ID, STRAVA_ACCESS_TOKEN, STRAVA_REFRESH_TOKEN } = process.env;
  if (!STRAVA_ATHLETE_ID || !STRAVA_ACCESS_TOKEN || !STRAVA_REFRESH_TOKEN) return null;
  return {
    athlete_id: Number(STRAVA_ATHLETE_ID),
    access_token: STRAVA_ACCESS_TOKEN,
    refresh_token: STRAVA_REFRESH_TOKEN,
    expires_at: 0,
  };
}

export async function getValidAccessToken(athleteId: number): Promise<string | null> {
  const redis = await getRedis();
  const raw = await redis.get(`tokens:${athleteId}`);

  if (!raw) {
    const seed = seedTokenFromEnv();
    if (!seed || seed.athlete_id !== athleteId) return null;
    await redis.set(`tokens:${athleteId}`, JSON.stringify(seed));
    return getValidAccessToken(athleteId);
  }

  const tokenData: TokenData = JSON.parse(raw);

  if (Date.now() / 1000 < tokenData.expires_at - 60) {
    return tokenData.access_token;
  }

  const { data } = await axios.post(TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token,
  });

  const updated: TokenData = {
    ...tokenData,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
  await redis.set(`tokens:${athleteId}`, JSON.stringify(updated));

  return updated.access_token;
}

export async function fetchClubActivities(accessToken: string, clubId: number): Promise<ClubActivity[]> {
  const { data } = await axios.get<ClubActivity[]>(`${API_URL}/clubs/${clubId}/activities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 30 },
  });
  return data;
}
