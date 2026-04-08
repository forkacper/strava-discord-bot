import axios from 'axios';
import { kv } from '@vercel/kv';

const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_URL = 'https://www.strava.com/api/v3';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
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
  athlete: { id: number; firstname: string; lastname: string };
}

export async function getValidAccessToken(athleteId: number): Promise<string | null> {
  const raw = await kv.get<TokenData>(`tokens:${athleteId}`);
  if (!raw) return null;

  if (Date.now() / 1000 < raw.expires_at - 60) {
    return raw.access_token;
  }

  const { data } = await axios.post(TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: raw.refresh_token,
  });

  const updated: TokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: athleteId,
  };
  await kv.set(`tokens:${athleteId}`, updated);

  return updated.access_token;
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
  };

  return {
    athleteId: data.athlete.id,
    athleteName: `${data.athlete.firstname} ${data.athlete.lastname}`,
    tokens,
  };
}
