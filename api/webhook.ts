import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getValidAccessToken, fetchActivity } from '../src/strava';
import { sendActivityEmbed } from '../src/discord';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleVerification(req, res);
  }
  if (req.method === 'POST') {
    return handleEvent(req, res);
  }
  res.status(405).end();
}

// Strava weryfikuje webhook jednorazowo przy rejestracji
function handleVerification(req: VercelRequest, res: VercelResponse) {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
    return res.status(200).json({ 'hub.challenge': challenge });
  }

  res.status(403).json({ error: 'Forbidden' });
}

// Każde zdarzenie ze Stravy (create/update/delete aktywności)
async function handleEvent(req: VercelRequest, res: VercelResponse) {
  // Odpowiadamy natychmiast — Strava wymaga odpowiedzi w ciągu 2 sekund
  res.status(200).end();

  const event = req.body as {
    object_type: string;
    aspect_type: string;
    object_id: number;
    owner_id: number;
  };

  // Obsługujemy tylko nowe aktywności
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') return;

  try {
    const accessToken = await getValidAccessToken(event.owner_id);
    if (!accessToken) {
      console.warn(`No token for athlete ${event.owner_id}`);
      return;
    }

    const activity = await fetchActivity(accessToken, event.object_id);
    await sendActivityEmbed(activity);
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
}
