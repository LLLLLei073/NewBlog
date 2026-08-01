/** 估算文章阅读时间（分钟）。基于中英文混合内容。 */
export function readingTime(text: string): number {
  // 中文按字符数计，英文按单词数计
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) ?? []).length;
  // 中文 ~400字/分钟，英文 ~200词/分钟
  const minutes = Math.ceil(chineseChars / 400 + englishWords / 200);
  return Math.max(1, minutes);
}

/** 统计文章字数（中文字符 + 英文单词，中文按字计、英文按词计）。 */
export function wordCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) ?? []).length;
  return chineseChars + englishWords;
}

export interface ArticleMeta {
  slug: string;
  title: string;
  pubDate: Date;
}
