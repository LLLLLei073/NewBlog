/**
 * 文章页 Live2D 看板娘的集中配置：模型清单、舞台尺寸、文案与偏好键都在这里维护。
 * 模型文件落地前 MODEL 为 null，此时不渲染容器也不加载任何脚本。
 */

/** 与 public/live2d 下的 manifest 一一对应的模型清单，由测试校验一致性。 */
export interface Live2dModel {
  /** 目录名，同时用于文档记录与状态文案。 */
  name: string;
  /** manifest 的站内路径，只写进 data-* 属性，不写 href/src。 */
  path: string;
  scale: number;
  position: [x: number, y: number];
  /** 模型自带动作组名，用于挑选反应动作与兜底随机动作。 */
  motions: string[];
  /** 优先用于「摇头」的动作组。 */
  shakeMotion?: string;
  /** 优先用于「害羞」的表情名。 */
  shyExpression?: string;
  /** 没有害羞表情时退回的动作组。 */
  shyMotion?: string;
  /** 少数模型的眼睛朝向与屏幕方向相反，靠这个开关做唯一镜像调参。 */
  mirror?: boolean;
}

/**
 * Live2D 官方样本模型 Natori（`Samples/Resources/Natori`，Free Material License）。
 * 来源、许可与体积见 docs/live2d/README.md 与 public/licenses/natori-live2d-sample.txt。
 */
export const MODEL: Live2dModel | null = {
  name: 'natori',
  path: '/live2d/natori/Natori.model3.json',
  /** 舞台 200×260 下按浏览器实测调出的缩放与位置：半身构图，头肩填满舞台。 */
  scale: 0.115,
  position: [-130, 10],
  motions: ['Idle', 'TapBody'],
  /** 样本的 TapBody 组就是「被戳到」的反应，用作摇头。 */
  shakeMotion: 'TapBody',
  /** 样本自带 Blushing 表情，正好是害羞。 */
  shyExpression: 'Blushing',
  mirror: false,
};

/** 舞台尺寸按断点分档，避免遮住左侧文章列表。 */
export const STAGE = {
  /** ≥1280px：左右各一栏时仍留出边距。 */
  wide: { width: 200, height: 260 },
  /** 1024–1279px：只占一栏，尺寸收紧。 */
  narrow: { width: 168, height: 220 },
  /** 库默认把舞台贴死在视口左下角，这里抬到「隐藏看板娘」按钮上方，两者互不遮挡。 */
  offset: { left: '0.75rem', bottom: '4.5rem' },
};

/** 只有 ≥1024px 的精细指针设备才加载，移动端保持零开销。 */
export const MIN_VIEWPORT = 1024;
export const WIDE_VIEWPORT = 1280;

/** 隐藏偏好；与房间的 lllllei-study-* 偏好互不影响。 */
export const HIDDEN_KEY = 'lllllei-live2d-hidden';

/** 全程静音，沿用房间「不播放音效」的既有取舍。 */
export const MODEL_VOLUME = 0;

export const REACTION_MS = 4200;
export const REACTION_PRIORITY = 4;

/** 点头部时的反应文案。 */
export const SHAKE_LINES = [
  '诶，别摇啦，我头晕。',
  '不是那样啦～',
  '嗯……不太对哦。',
];

/** 害羞时的反应文案。 */
export const SHY_LINES = [
  '呀，被发现了……',
  '别一直盯着我嘛。',
  '我、我在认真看书啦。',
];

/** 陪伴阅读的闲置提示。 */
export const IDLE_LINES = [
  '这段读慢一点，挺重要的。',
  '读到哪儿啦？我在这儿陪着。',
  '眼睛累了就抬头看看窗外。',
];

/** 按时段变化的入场问候。 */
export const WELCOME_LINES = {
  daybreak: '天刚亮就在读书呀，我来陪你。',
  morning: '早上好，我来陪你读这篇。',
  noon: '中午啦，读完这段就去吃饭吧。',
  afternoon: '午后容易犯困，我陪你接着读。',
  dusk: '傍晚了，读慢一点也没关系。',
  night: '晚上好，看到哪一段啦？',
  lateNight: '这么晚还在读呀，我陪着你。',
  weeHours: '该睡了哦，明天再读也不迟。',
};
