/**
 * 音频管线:把本机音乐库的 flac/ogg 转码为 m4a(aac),写入 public/music/archive/,
 * 并把每首歌的真实时长生成到 src/data/durations.ts(供档案数据引用)。
 *
 * 用法:npm run encode:music
 * 编码器:优先环境变量 FFMPEG_PATH;默认用剪映自带的 ffmpeg。
 * 注意:该构建的 mp3_mf 会写错误时长头,因此统一走原生 aac → m4a。
 *
 * 新增歌曲:把文件放进 SRC 目录,在下面 SONGS 里补一条 [文件名, slug],
 * 重跑本脚本;再到 src/data/music.ts 的 TRACKS 里补曲目信息。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FFMPEG =
  process.env.FFMPEG_PATH ??
  'C:/Users/60421/AppData/Local/JianyingPro/Apps/11.5.0.14471/ffmpeg.exe';

const SRC = 'C:/Users/60421/Music';
const OUT_DIR = 'public/music/archive';
const DURATIONS_TS = 'src/data/durations.ts';

/** [源文件名, 输出 slug](slug 即 public/music/archive/<slug>.m4a) */
const SONGS = [
  // —— 花譜 ——
  ['花譜 - 不可解.flac', 'kafu-fukakai'],
  ['花譜 - 私論理.flac', 'kafu-shironri'],
  ['花譜 - 鏡よ鏡.flac', 'kafu-kagami'],
  ['花譜 - 心臓と絡繰.flac', 'kafu-shinzo'],
  ['花譜 - 過去を喰らう (吞噬过去).flac', 'kafu-kakio'],
  ['花譜 - 忘れてしまえ.flac', 'kafu-wasurete'],
  ['花譜 - 彷徨い (彷徨).flac', 'kafu-samayoi'],
  ['花譜 - 夜行バスにて.flac', 'kafu-yakobus'],
  ['花譜 - 帰り路 (归途).flac', 'kafu-kaerimichi'],
  ['花譜 - 夜が降り止む前に.flac', 'kafu-yogafuri'],
  ['花譜 - 景色.flac', 'kafu-keshiki'],
  ['花譜 - エリカ.flac', 'kafu-erika'],
  ['花譜 - ひとえに壊れて (单纯崩坏).flac', 'kafu-hitoeni'],
  ['花譜 - 魔女.flac', 'kafu-majo'],
  ['花譜 - 雛鳥.flac', 'kafu-hinadori'],
  ['花譜 - 糸.flac', 'kafu-ito'],
  ['花譜 - そして花になる (然后成为花).flac', 'kafu-soshitehana'],
  ['花譜 - 未確認少女進行形.flac', 'kafu-mikakunin'],
  ['花譜 - モンタージュ (蒙太奇).flac', 'kafu-montage'],
  ['花譜 - メルの黄昏 (Meru的黄昏).flac', 'kafu-meru'],
  ['花譜 - Re_HEROINES.flac', 'kafu-heroines'],
  ['花譜 - quiz.flac', 'kafu-quiz'],
  ['花譜 - 危ノーマル.flac', 'kafu-kinormal'],
  ['花譜 - アンサー (Answer)_H.ogg', 'kafu-answer'],
  ['花譜 - ダンスが僕の恋人 at I SCREAM LIVE.flac', 'kafu-dance-live'],
  [
    '花譜 - 命に嫌われている at I SCREAM LIVE (被生命所厌恶).flac',
    'kafu-inochi-live',
  ],
  ['花譜 - 明けない夜のリリィ at I SCREAM LIVE.flac', 'kafu-lily-live'],
  // —— V.W.P ——
  ['V_W_P - 電脳.flac', 'vwp-dennou'],
  ['V_W_P - 終点.flac', 'vwp-shuten'],
  ['V_W_P - 共鳴 (Single Version)_H.ogg', 'vwp-kyomei'],
  ['V_W_P - 変身_L.ogg', 'vwp-henshin'],
  ['V_W_P _ V_I_P - 機械の声 (机械的声音).flac', 'vwp-kikai'],
  [
    '花譜 _ 理芽_RIM _ 春猿火 _ ヰ世界情緒 - V_W_P_輪廻 acoustic ver__Muv-Luv.flac',
    'vwp-rinne-ac',
  ],
  // —— 合作 ——
  ['FAKE TYPE_ _ 花譜 - マンネリウィークエンド.flac', 'faketype-manneri'],
  ['理芽 _ 花譜 - キャンディーゲリラ.flac', 'rim-candy'],
  ['花譜 _ 理芽 - まほう (魔法).flac', 'kafu-rim-mahou'],
  ['春猿火 _ ヰ世界情緒 - 愛厭奇縁.flac', 'haru-aien'],
  [
    '香椎モイミ _ 幸祜 - 幸祜 -KOKO- 「レイヴン・フリージア_Raven Freesia」 (Live).flac',
    'kuko-raven',
  ],
  // —— ヰ世界情緒 / 明透 / 存流 ——
  ['ヰ世界情緒 - シリウスの心臓 (天狼星的心脏)_H.ogg', 'isekai-sirius'],
  ['异世界情绪 - 熱異常_H.ogg', 'isekai-netsu'],
  ['明透 - Cinnamon_H.ogg', 'asu-cinnamon'],
  ['明透 - ビターエチュード.flac', 'asu-bitter'],
  ['存流 _ 明透 - 東京は夜_H.ogg', 'sunaru-tokyo'],
  // —— 可不(KAFU)——
  ['tawase _ 可不 - アイドル (feat_ 可不).flac', 'kafu-synth-aidol'],
  ['ぷろとぽいんと _ 可不 - 燃花 (feat_ 可不).flac', 'kafu-synth-mohana'],
  [
    '海ぶどう _ 可不 - 眠れない夜に想い出を灯して (feat_ 可不).flac',
    'kafu-synth-nemurenai',
  ],
];

mkdirSync(OUT_DIR, { recursive: true });

/** 从 ffmpeg -i 的 stderr 里解析 "Duration: 00:03:51.33" */
function probeDuration(file) {
  const res = spawnSync(FFMPEG, ['-hide_banner', '-i', file], {
    encoding: 'utf8',
  });
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(res.stderr || '');
  if (!m) return NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const durations = {};
const problems = [];
let totalBytes = 0;
let done = 0;

for (const [name, slug] of SONGS) {
  const src = path.join(SRC, name);
  const out = path.join(OUT_DIR, `${slug}.m4a`);
  if (!existsSync(src)) {
    problems.push(`源文件不存在: ${name}`);
    continue;
  }
  // 增量:输出不存在或源更新过才重转
  const needEncode =
    !existsSync(out) || statSync(src).mtimeMs > statSync(out).mtimeMs;
  if (needEncode) {
    const res = spawnSync(
      FFMPEG,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        src,
        '-vn',
        '-c:a',
        'aac',
        '-b:a',
        '150k',
        '-movflags',
        '+faststart',
        out,
      ],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );
    if (res.status !== 0 || !existsSync(out)) {
      problems.push(`转码失败: ${name}`);
      continue;
    }
  }
  const sec = probeDuration(out);
  if (Number.isFinite(sec)) durations[slug] = Math.round(sec);
  else problems.push(`读取时长失败: ${slug}`);
  totalBytes += statSync(out).size;
  done++;
  console.log(`[${done}/${SONGS.length}] ${slug}.m4a ${Math.round(sec)}s`);
}

const body = JSON.stringify(durations, null, 2);
writeFileSync(
  DURATIONS_TS,
  `/* 由 scripts/encode-music.mjs 自动生成(真实音频时长,秒),勿手改 */\nexport const DURATIONS: Record<string, number> = ${body};\n`,
);

console.log('─'.repeat(50));
console.log(
  `完成 ${done}/${SONGS.length} 首,合计 ${(totalBytes / 1048576).toFixed(1)} MB`,
);
if (problems.length) {
  console.log('问题:');
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}
