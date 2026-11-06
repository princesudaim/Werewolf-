/** Device preferences only. Never store players, roles, votes or messages here. */
export const FEEDBACK_PREFERENCES_KEY = 'werewolf.feedback.v1';
export type FeedbackPreferences = {
  ambienceVolume: number;
  effectsVolume: number;
  hapticIntensity: 'gentle' | 'standard';
};
export const DEFAULT_FEEDBACK_PREFERENCES: FeedbackPreferences = {
  ambienceVolume: 45, effectsVolume: 50, hapticIntensity: 'gentle',
};
export function normalizeFeedbackPreferences(value: unknown): FeedbackPreferences {
  const input = value && typeof value === 'object' ? value as Record<string,unknown> : {};
  const volume = (key: 'ambienceVolume' | 'effectsVolume') => typeof input[key] === 'number' && Number.isFinite(input[key])
    ? Math.round(Math.max(0,Math.min(100,input[key] as number))) : DEFAULT_FEEDBACK_PREFERENCES[key];
  return {ambienceVolume:volume('ambienceVolume'),effectsVolume:volume('effectsVolume'),hapticIntensity:input.hapticIntensity==='standard'?'standard':'gentle'};
}
