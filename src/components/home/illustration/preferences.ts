export type LampMode = 'auto' | 'on' | 'off';
export const PAUSE_KEY = 'lllllei-study-paused';
export const LAMP_KEY = 'lllllei-study-lamp';
export const PREFERENCE_EVENT = 'study-preference-change';
let fallback = { paused: false, lamp: 'auto' as LampMode };

export function readStudyPreferences() {
  try {
    const lamp = localStorage.getItem(LAMP_KEY);
    return {
      paused: localStorage.getItem(PAUSE_KEY) === 'true',
      lamp: (lamp === 'on' || lamp === 'off' ? lamp : 'auto') as LampMode,
    };
  } catch {
    return { ...fallback };
  }
}
export function saveStudyPreference(
  key: typeof PAUSE_KEY | typeof LAMP_KEY,
  value: string,
) {
  if (key === PAUSE_KEY) fallback.paused = value === 'true';
  else fallback.lamp = value === 'on' || value === 'off' ? value : 'auto';
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Optional storage. */
  }
  window.dispatchEvent(
    new CustomEvent(PREFERENCE_EVENT, { detail: { key, value } }),
  );
}
export function lampStrength(mode: LampMode, automatic: number) {
  return mode === 'on' ? 0.95 : mode === 'off' ? 0 : automatic;
}
