/** Device-only visual preference; never store game state or override an OS reduction. */
export const MOTION_PREFERENCES_KEY = 'werewolf.motion.v1';
export type MotionPreference = 'system' | 'reduced';
export function normalizeMotionPreference(value: unknown): MotionPreference {
  return value==='reduced'?'reduced':'system';
}
