/**
 * oh-my-live2d 运行时的访问层。库里的 stage/models/pixiApp 字段在类型上是 private，
 * 运行时属性依然存在，因此这里用最小接口做一次可选链访问，任何内部结构变化都只
 * 影响这几个函数的返回值，调用方一律按「失败就退回家默认行为」处理。
 */
import type { Reaction } from './model.ts';

interface MotionManagerLike {
  stopAllMotions?(): void;
}

interface Live2dModelLike {
  focus?(x: number, y: number, instant?: boolean): void;
  motion?(group: string, index?: number): unknown;
  expression?(name: string): unknown;
  internalModel?: { motionManager?: MotionManagerLike };
}

interface PixiAppLike {
  start?(): void;
  stop?(): void;
}

interface InstanceLike {
  models?: { model?: Live2dModelLike };
  pixiApp?: PixiAppLike;
}

/** 我们实际调用的公开方法；其余成员一律不依赖。 */
export interface Oml2dLike {
  onLoad?(fn: (status: 'loading' | 'success' | 'fail') => void): void;
  tipsMessage?(message: string, duration?: number, priority?: number): void;
  setStageStyle?(style: { width?: number; height?: number }): void;
}

export function asInstance(value: unknown): Oml2dLike {
  return (value ?? {}) as Oml2dLike;
}

export function modelOf(instance: unknown) {
  try {
    return (instance as InstanceLike | null)?.models?.model;
  } catch {
    return undefined;
  }
}

export function focusModel(
  model: ReturnType<typeof modelOf>,
  x: number,
  y: number,
) {
  try {
    if (!model?.focus) return false;
    model.focus(x, y);
    return true;
  } catch {
    return false;
  }
}

/** 先停掉库自带的点击动作，再播我们要的摇头或害羞，避免两段动作叠在一起。 */
export function playReaction(
  model: ReturnType<typeof modelOf>,
  reaction: Reaction,
) {
  try {
    if (!model) return false;
    let played = false;
    if (reaction.expression && model.expression) {
      model.expression(reaction.expression);
      played = true;
    }
    if (reaction.motion && model.motion) {
      model.internalModel?.motionManager?.stopAllMotions?.();
      model.motion(reaction.motion);
      played = true;
    }
    return played;
  } catch {
    return false;
  }
}

/** 隐藏时停掉 pixi 的渲染循环；取不到内部引用时退化为仅隐藏 DOM。 */
export function setInstanceActive(instance: unknown, active: boolean) {
  try {
    const app = (instance as InstanceLike | null)?.pixiApp;
    if (!app) return false;
    if (active) app.start?.();
    else app.stop?.();
    return true;
  } catch {
    return false;
  }
}
