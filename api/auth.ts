import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.APP_BASE_URL}/api/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });

  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
