/**
 * 「形与数 · 直觉图鉴」数学专栏文案与板块数据。
 * 文案与主题清单来自开栏手记(math-column-intro);文章列表始终从
 * blog 内容集合实时读取,这里不重复维护。
 */

export interface MathSection {
  /** 图版罗马数字 */
  no: string;
  /** 英文小标 */
  en: string;
  title: string;
  /** 一句话直觉 */
  intuition: string;
  /** 计划收录的主题示例 */
  items: string[];
}

export const COLUMN = {
  updated: '2026.10.26',
  headline: '先看见形状,再写下公式',
  intro:
    '数学是理解世界的语言,但这里不想把它讲成公式堆砌。每一篇都遵循同一个模式:先给直觉,再给公式,最后给应用——公式是工具,理解才是目的。',
  sub: '直觉先行,证明殿后',
  en: 'AN ILLUSTRATED GUIDE TO MATHEMATICS',
  sectionsHint: '四大板块会像展品一样逐件装裱,先立目录,再补图版。',
} as const;

export const SECTIONS: MathSection[] = [
  {
    no: 'Ⅰ',
    en: 'CALCULUS',
    title: '高等数学',
    intuition: '极限、导数与积分,都是"变化"的几何语言。',
    items: [
      '极限到底是什么',
      '导数与微分:变化率的直觉',
      '积分:把无穷切成小块',
      '泰勒展开:多项式逼近世界',
    ],
  },
  {
    no: 'Ⅱ',
    en: 'LINEAR ALGEBRA',
    title: '线性代数',
    intuition: '从几何视角看矩阵:变换的复合与空间的拉伸。',
    items: [
      '向量与空间:几何视角',
      '矩阵乘法的本质',
      '特征值与特征向量',
      '行列式:体积的推广',
    ],
  },
  {
    no: 'Ⅲ',
    en: 'PROBABILITY',
    title: '概率与统计',
    intuition: '从赌场到机器学习,不确定性的度量术。',
    items: [
      '概率论的直觉',
      '贝叶斯定理:更新信念',
      '大数定律与中心极限定理',
      '统计推断:从样本看整体',
    ],
  },
  {
    no: 'Ⅳ',
    en: 'MATH × CODE',
    title: '数学与编程',
    intuition: '傅里叶、优化与数论,在代码里长出形状。',
    items: [
      '傅里叶变换:音频与图像的魔法',
      '优化理论:梯度下降为什么有效',
      '密码学中的数论',
    ],
  },
];
