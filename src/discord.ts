import axios from 'axios';
import { ClubActivity } from './strava';

const SPORT_EMOJI: Record<string, string> = {
  Run: '🏃',
  Ride: '🚴',
  Swim: '🏊',
  Walk: '🚶',
  Hike: '🥾',
  VirtualRide: '🚴',
  VirtualRun: '🏃',
  WeightTraining: '🏋️',
  Yoga: '🧘',
  Rowing: '🚣',
  Kayaking: '🛶',
  Skiing: '⛷️',
  Snowboard: '🏂',
  Workout: '💪',
};

const COLOR: Record<string, number> = {
  Run: 0xe8492e,
  Ride: 0xf5a623,
  Swim: 0x4a90d9,
  Walk: 0x7ed321,
  Hike: 0x8b6914,
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatPace(metersPerSecond: number): string {
  if (metersPerSecond === 0) return '—';
  const secPerKm = 1000 / metersPerSecond;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function formatSpeed(metersPerSecond: number): string {
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
}

function isRunLike(sportType: string): boolean {
  return ['Run', 'VirtualRun', 'Walk', 'Hike'].includes(sportType);
}

export async function sendActivityEmbed(activity: ClubActivity): Promise<void> {
  const emoji = SPORT_EMOJI[activity.sport_type] ?? '🏅';
  const color = COLOR[activity.sport_type] ?? 0xfc4c02;
  const athleteName = `${activity.athlete.firstname} ${activity.athlete.lastname}`;
  const avgSpeed = activity.moving_time > 0 ? activity.distance / activity.moving_time : 0;

  const speedField = isRunLike(activity.sport_type)
    ? { name: 'Tempo', value: formatPace(avgSpeed), inline: true }
    : { name: 'Prędkość', value: formatSpeed(avgSpeed), inline: true };

  const fields = [
    { name: 'Dystans', value: formatDistance(activity.distance), inline: true },
    { name: 'Czas', value: formatDuration(activity.moving_time), inline: true },
    speedField,
    { name: 'Przewyższenie', value: `${Math.round(activity.total_elevation_gain)} m`, inline: true },
  ];

  const footerText = activity.start_date_local
    ? `${activity.sport_type} • ${new Date(activity.start_date_local).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : activity.sport_type;

  const embed = {
    title: `${emoji} ${activity.name}`,
    color,
    author: { name: athleteName },
    fields,
    footer: {
      text: footerText,
      icon_url: 'https://www.strava.com/favicon.ico',
    },
  };

  await axios.post(process.env.DISCORD_WEBHOOK_URL!, { embeds: [embed] });
}
