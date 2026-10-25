/**
 * 全局音乐播放器控制器(单例)。
 *
 * <audio> 位于 transition:persist 的持久化元素内,跨页面存活;
 * 本模块的状态自首次加载后常驻。底部迷你播放器(MusicPlayer.astro)与
 * 「耳朵的私人档案」各页面通过 subscribe() 订阅同一份状态。
 *
 * 播放队列用 queueId 字符串标识(album:slug / scene:slug),
 * 由 src/data/music.ts 的 resolveQueue 解析;切歌/随机都在当前队列内进行。
 */
import { resolveQueue, type QueueInfo, type Track } from '../../data/music';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  /** 当前队列 id(album:slug / scene:slug) */
  queueId: string | undefined;
  /** 队列内曲目序号 */
  index: number;
  playing: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  volume: number;
  time: number;
  duration: number;
  /** 已设置过 src(音频真正开始加载) */
  loaded: boolean;
}

const STORAGE_KEY = 'music-state';

const state: PlayerState = {
  queueId: undefined,
  index: -1,
  playing: false,
  repeat: 'off',
  shuffle: false,
  volume: 0.8,
  time: 0,
  duration: 0,
  loaded: false,
};

function queue(): QueueInfo | undefined {
  return resolveQueue(state.queueId);
}

function clampIndex(i: number): number {
  const list = queue()?.tracks ?? [];
  if (list.length === 0) return -1;
  return Math.min(Math.max(Math.floor(i), 0), list.length - 1);
}

// 恢复上次的队列/曲目/进度/音量(恢复为暂停态——浏览器禁止无手势自动播放)
try {
  const saved = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '{}',
  ) as Partial<{
    queueId: string;
    index: number;
    time: number;
    volume: number;
    repeat: RepeatMode;
    shuffle: boolean;
  }>;
  if (typeof saved.queueId === 'string' && resolveQueue(saved.queueId)) {
    state.queueId = saved.queueId;
    if (Number.isFinite(saved.index)) state.index = clampIndex(saved.index);
  }
  if (Number.isFinite(saved.time) && saved.time > 0) state.time = saved.time;
  if (Number.isFinite(saved.volume)) {
    state.volume = Math.min(1, Math.max(0, saved.volume));
  }
  if (
    saved.repeat === 'off' ||
    saved.repeat === 'all' ||
    saved.repeat === 'one'
  ) {
    state.repeat = saved.repeat;
  }
  if (typeof saved.shuffle === 'boolean') state.shuffle = saved.shuffle;
} catch {
  /* localStorage 不可用(如私有模式)时使用默认值 */
}

const listeners = new Set<() => void>();

/** 订阅状态变化,返回取消订阅函数 */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getState(): Readonly<PlayerState> {
  return state;
}

/** 当前队列信息(含条目专属色) */
export function currentQueue(): QueueInfo | undefined {
  return queue();
}

/** 当前曲目 */
export function currentTrack(): Track | undefined {
  return queue()?.tracks[state.index];
}

function emit() {
  listeners.forEach((fn) => fn());
}

let lastPersist = 0;
function persist(force = false) {
  const now = Date.now();
  if (!force && now - lastPersist < 5000) return;
  lastPersist = now;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        queueId: state.queueId,
        index: state.index,
        time: state.time,
        volume: state.volume,
        repeat: state.repeat,
        shuffle: state.shuffle,
      }),
    );
  } catch {
    /* 忽略持久化失败 */
  }
}

let audio: HTMLAudioElement | null = null;
let pendingSeek: number | null = null;

function randomOtherIndex(): number {
  const list = queue()?.tracks ?? [];
  if (list.length <= 1) return state.index;
  let i = state.index;
  while (i === state.index) i = Math.floor(Math.random() * list.length);
  return i;
}

function nextIndex(): number {
  if (state.shuffle) return randomOtherIndex();
  return (state.index + 1) % (queue()?.tracks.length ?? 0);
}

function prevIndex(): number {
  if (state.shuffle) return randomOtherIndex();
  const len = queue()?.tracks.length ?? 0;
  return (state.index - 1 + len) % len;
}

/** 在当前队列内切换曲目;autoplay 需处于用户手势调用链内 */
function loadTrack(
  index: number,
  autoplay: boolean,
  seekTo: number | null = null,
) {
  state.index = clampIndex(index);
  const track = currentTrack();
  state.playing = false;
  if (!track || !audio) {
    state.loaded = false;
    state.time = 0;
    state.duration = 0;
    emit();
    persist(true);
    return;
  }
  state.time = seekTo ?? 0;
  state.duration = track.duration || 0;
  pendingSeek = seekTo;
  audio.src = track.src;
  state.loaded = true;
  if (autoplay) void audio.play().catch(() => {});
  updateMediaSession(track);
  emit();
  persist(true);
}

function handleEnded() {
  if (state.repeat === 'one' && audio) {
    audio.currentTime = 0;
    void audio.play().catch(() => {});
    return;
  }
  // 队列顺序播完且不循环:停下
  if (
    state.repeat === 'off' &&
    !state.shuffle &&
    state.index === (queue()?.tracks.length ?? 0) - 1
  ) {
    state.playing = false;
    state.time = state.duration;
    persist(true);
    emit();
    return;
  }
  loadTrack(nextIndex(), true);
}

function updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: queue()?.title,
  });
}

function initMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  const safe = (
    name: MediaSessionAction,
    handler: MediaSessionActionHandler,
  ) => {
    try {
      ms.setActionHandler(name, handler);
    } catch {
      /* 部分动作在个别浏览器不支持 */
    }
  };
  safe('play', () => togglePlay());
  safe('pause', () => togglePlay());
  safe('previoustrack', () => prev());
  safe('nexttrack', () => next());
  safe('seekto', (details) => {
    if (details.seekTime != null) seekTo(details.seekTime);
  });
  subscribe(() => {
    ms.playbackState = state.playing ? 'playing' : 'paused';
  });
}

/**
 * 绑定持久化元素内的 <audio>,只执行一次(元素跨页面存活)。
 * root 需是 id="music-player" 的持久化根元素。
 */
export function initPlayer(root: HTMLElement) {
  if (root.dataset.playerInit === 'true') return;
  root.dataset.playerInit = 'true';
  audio = root.querySelector('audio');
  if (!audio) return;

  audio.volume = state.volume;
  audio.addEventListener('play', () => {
    state.playing = true;
    emit();
  });
  audio.addEventListener('pause', () => {
    state.playing = false;
    persist(true);
    emit();
  });
  audio.addEventListener('timeupdate', () => {
    state.time = audio!.currentTime;
    persist();
    emit();
  });
  audio.addEventListener('durationchange', () => {
    state.duration = audio!.duration || state.duration;
    emit();
  });
  audio.addEventListener('loadedmetadata', () => {
    if (audio!.duration && Number.isFinite(audio!.duration)) {
      state.duration = audio!.duration;
    }
    if (
      pendingSeek != null &&
      Number.isFinite(pendingSeek) &&
      pendingSeek > 0
    ) {
      try {
        audio!.currentTime = pendingSeek;
      } catch {
        /* 跳转失败则从头播放 */
      }
      state.time = pendingSeek;
      pendingSeek = null;
    }
    emit();
  });
  audio.addEventListener('ended', handleEnded);
  initMediaSession();
  emit();
}

export function togglePlay() {
  if (!audio || state.index < 0 || !state.queueId) return;
  if (state.playing) {
    audio.pause();
    return;
  }
  if (!state.loaded) {
    // 首次播放:加载恢复的曲目并跳到上次进度
    loadTrack(state.index, true, state.time);
    return;
  }
  void audio.play().catch(() => {});
}

/** 点选当前队列内的曲目:同一首在播放中则暂停,否则(重新)播放 */
export function playAt(index: number) {
  if (!audio || !state.queueId || (queue()?.tracks.length ?? 0) === 0) return;
  const target = clampIndex(index);
  if (target === state.index && state.loaded) {
    togglePlay();
    return;
  }
  loadTrack(target, true);
}

/**
 * 切换并播放指定队列(album:slug / scene:slug)。
 * 同队列时等价于 playAt(trackIndex);换队列会整体重置。
 */
export function playQueue(queueId: string, trackIndex = 0) {
  if (!audio || !resolveQueue(queueId)) return;
  if (queueId === state.queueId) {
    playAt(trackIndex);
    return;
  }
  state.queueId = queueId;
  state.index = clampIndex(trackIndex);
  loadTrack(state.index, true);
}

export function next() {
  if (!audio || !state.queueId) return;
  loadTrack(nextIndex(), true);
}

export function prev() {
  if (!audio || !state.queueId) return;
  if (state.loaded && audio.currentTime > 3) {
    audio.currentTime = 0;
    state.time = 0;
    emit();
    return;
  }
  loadTrack(prevIndex(), true);
}

export function seekTo(t: number) {
  if (!audio || !state.loaded) return;
  try {
    audio.currentTime = t;
    state.time = t;
    emit();
  } catch {
    /* 忽略非法跳转 */
  }
}

export function setVolume(v: number) {
  state.volume = Math.min(1, Math.max(0, v));
  if (audio) audio.volume = state.volume;
  persist(true);
  emit();
}

export function cycleRepeat() {
  state.repeat =
    state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
  persist(true);
  emit();
}

export function toggleShuffle() {
  state.shuffle = !state.shuffle;
  persist(true);
  emit();
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
