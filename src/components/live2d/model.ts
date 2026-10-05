import type { Live2dModel } from './config.ts';

export type ReactionKind = 'shake' | 'shy';

export interface Reaction {
  kind: ReactionKind;
  motion?: string;
  expression?: string;
  line: string;
}

export interface ReactionLines {
  shake: readonly string[];
  shy: readonly string[];
}

/** 单数次点击先摇头、双数次害羞，行为确定且可测。 */
export function reactionKindFor(clickIndex: number): ReactionKind {
  return clickIndex % 2 === 0 ? 'shake' : 'shy';
}

/** 随机取一条与上次不同的文案；只有一句时保持原样。 */
export function pickLine(pool: readonly string[], previous: string | null) {
  if (pool.length === 0) return '';
  const usable = pool.filter((line) => line !== previous);
  const choices = usable.length > 0 ? usable : pool;
  return choices[Math.floor(Math.random() * choices.length)]!;
}

/** 没有对应动作组时退回模型自带的动作，文案始终保留。 */
export function motionFor(
  model: Live2dModel,
  kind: ReactionKind,
  clickIndex: number,
) {
  if (kind === 'shy') return model.shyMotion;
  if (model.shakeMotion) return model.shakeMotion;
  if (model.motions.length === 0) return undefined;
  return model.motions[clickIndex % model.motions.length];
}

/** 把一次点击换算成「动作 + 表情 + 文案」，模型缺失时只给文案。 */
export function planReaction(
  model: Live2dModel | null,
  clickIndex: number,
  previousLine: string | null,
  lines: ReactionLines,
): Reaction {
  const kind = reactionKindFor(clickIndex);
  const pool = kind === 'shake' ? lines.shake : lines.shy;
  const line = pickLine(pool, previousLine);
  if (!model) return { kind, line };
  const reaction: Reaction = {
    kind,
    line,
    motion: motionFor(model, kind, clickIndex),
  };
  if (kind === 'shy' && model.shyExpression) {
    reaction.expression = model.shyExpression;
  }
  return reaction;
}
