/**
 * 「抽屉杂记」其他专栏文案与话题数据。
 * 话题标签从现有文章归纳(项目/随笔/建站);文章列表始终从 blog
 * 内容集合实时读取,这里不重复维护。
 */

export interface DrawerTopic {
  tag: string;
  note: string;
}

export const COLUMN = {
  updated: '2026.10.26',
  headline: '抽屉里的那些事',
  intro:
    '没有被收进四大专栏的东西都放这里:做出来的小项目、建站过程的技术决定、还有一些想到就写的随笔。像抽屉一样,不分类,但每样都舍不得扔。',
  sub: '不分类,但都舍不得扔',
  en: 'DRAWER MISCELLANY',
  topicsHint: '软木板上的标签会随着新文章继续钉上去。',
} as const;

export const TOPICS: DrawerTopic[] = [
  {
    tag: '项目',
    note: '做出来并真的在用的小东西,比如 CF Friends。',
  },
  {
    tag: '建站',
    note: '这个博客本身:搭建、主题与那些反复改的细节。',
  },
  {
    tag: '随笔',
    note: '想到就写,写完就钉上的碎碎念。',
  },
];
