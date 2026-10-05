import { MIN_VIEWPORT } from './config.ts';

/** 加载前的全部门控条件，集中在一处便于测试与排查。 */
export interface GateInput {
  width: number;
  pointerFine: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  stored: boolean;
  hidden: boolean;
  webgl: boolean;
}

export type GateReason =
  | 'stored'
  | 'viewport'
  | 'pointer'
  | 'motion'
  | 'save-data'
  | 'hidden'
  | 'webgl';

export type GateResult = { ok: true } | { ok: false; reason: GateReason };

/** 用户主动隐藏优先于一切；其次才是设备与偏好限制。 */
export function gateCharacter(input: GateInput): GateResult {
  if (input.stored) return { ok: false, reason: 'stored' };
  if (input.width < MIN_VIEWPORT) return { ok: false, reason: 'viewport' };
  if (!input.pointerFine) return { ok: false, reason: 'pointer' };
  if (input.reducedMotion) return { ok: false, reason: 'motion' };
  if (input.saveData) return { ok: false, reason: 'save-data' };
  if (input.hidden) return { ok: false, reason: 'hidden' };
  if (!input.webgl) return { ok: false, reason: 'webgl' };
  return { ok: true };
}
