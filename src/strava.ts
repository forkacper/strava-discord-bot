import axios from 'axios';
import { getRedis } from './redis';

const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_URL = 'https://www.strava.com/api/v3';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
  athlete_name?: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  distance: number;           // metry
  moving_time: number;        // sekundy
  elapsed_time: number;       // sekundy
  total_elevation_gain: number;
  average_speed: number;      // m/s
  max_speed: number;          // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string;
  athlete: { id: number };
}

function seedTokenFromEnv(): TokenData | null {
  const { STRAVA_ATHLETE_ID, STRAVA_ACCESS_TOKEN, STRAVA_REFRESH_TOKEN } = process.env;
  if (!STRAVA_ATHLETE_ID || !STRAVA_ACCESS_TOKEN || !STRAVA_REFRESH_TOKEN) return null;
  return {
    athlete_id: Number(STRAVA_ATHLETE_ID),
    access_token: STRAVA_ACCESS_TOKEN,
    refresh_token: STRAVA_REFRESH_TOKEN,
    expires_at: 0, // wymuś odświeżenie przy pierwszym użyciu
  };
}

export async function getValidAccessToken(athleteId: number): Promise<string | null> {
  const redis = await getRedis();
  const raw = await redis.get(`tokens:${athleteId}`);

  if (!raw) {
    const seed = seedTokenFromEnv();
    if (!seed || seed.athlete_id !== athleteId) return null;
    await redis.set(`tokens:${athleteId}`, JSON.stringify(seed));
    return getValidAccessToken(athleteId); // ponów z danymi w Redis
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

export async function getAthleteName(athleteId: number): Promise<string> {
  const redis = await getRedis();
  const raw = await redis.get(`tokens:${athleteId}`);
  if (!raw) return 'Nieznany atleta';
  const tokenData: TokenData = JSON.parse(raw);
  return tokenData.athlete_name ?? 'Nieznany atleta';
}

export async function fetchActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
  const { data } = await axios.get(`${API_URL}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function exchangeCode(code: string): Promise<{
  athleteId: number;
  athleteName: string;
  tokens: TokenData;
}> {
  const { data } = await axios.post(TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  });

  const tokens: TokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete.id,
    athlete_name: `${data.athlete.firstname} ${data.athlete.lastname}`,
  };

  return {
    athleteId: data.athlete.id,
    athleteName: `${data.athlete.firstname} ${data.athlete.lastname}`,
    tokens,
  };
}
