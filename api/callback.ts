import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis } from '../src/redis';
import { exchangeCode } from '../src/strava';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;

  if (error || !code || typeof code !== 'string') {
    return res.status(400).send('Autoryzacja anulowana lub błędna.');
  }

  try {
    const { athleteId, athleteName, tokens } = await exchangeCode(code);
    const redis = await getRedis();
    await redis.set(`tokens:${athleteId}`, JSON.stringify(tokens));

    res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>✅ Autoryzacja zakończona</h2>
        <p>Konto <strong>${athleteName}</strong> zostało połączone z Discord.</p>
        <p style="color:#666;font-size:14px">Możesz zamknąć tę kartę.</p>
      </body></html>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Błąd podczas wymiany tokenu. Sprawdź logi Vercel.');
  }
}
