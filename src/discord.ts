import axios from 'axios';
import { StravaActivity } from './strava';

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

export async function sendActivityEmbed(activity: StravaActivity, athleteName: string): Promise<void> {
  const emoji = SPORT_EMOJI[activity.sport_type] ?? '🏅';
  const color = COLOR[activity.sport_type] ?? 0xfc4c02;
  const activityUrl = `https://www.strava.com/activities/${activity.id}`;

  const speedField = isRunLike(activity.sport_type)
    ? { name: 'Tempo', value: formatPace(activity.average_speed), inline: true }
    : { name: 'Prędkość', value: formatSpeed(activity.average_speed), inline: true };

  const fields = [
    { name: 'Dystans', value: formatDistance(activity.distance), inline: true },
    { name: 'Czas', value: formatDuration(activity.moving_time), inline: true },
    speedField,
    { name: 'Przewyższenie', value: `${Math.round(activity.total_elevation_gain)} m`, inline: true },
  ];

  if (activity.average_heartrate) {
    fields.push({
      name: 'Tętno śr./max',
      value: `${Math.round(activity.average_heartrate)} / ${Math.round(activity.max_heartrate ?? 0)} bpm`,
      inline: true,
    });
  }

  const embed = {
    title: `${emoji} ${activity.name}`,
    url: activityUrl,
    color,
    author: {
      name: athleteName,
      url: `https://www.strava.com/athletes/${activity.athlete.id}`,
    },
    fields,
    footer: {
      text: `${activity.sport_type} • ${new Date(activity.start_date).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      icon_url: 'https://www.strava.com/favicon.ico',
    },
  };

  await axios.post(process.env.DISCORD_WEBHOOK_URL!, { embeds: [embed] });
}
