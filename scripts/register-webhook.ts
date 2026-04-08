import axios from 'axios';

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN, APP_BASE_URL } = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_VERIFY_TOKEN || !APP_BASE_URL) {
  console.error('Brakuje zmiennych środowiskowych w .env');
  process.exit(1);
}

const { data } = await axios.post(
  'https://www.strava.com/api/v3/push_subscriptions',
  {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    callback_url: `${APP_BASE_URL}/api/webhook`,
    verify_token: STRAVA_VERIFY_TOKEN,
  }
);

console.log('✅ Webhook zarejestrowany:', data);
