/**
 * CodeTabs —— 多语言代码页签(演算手稿)。
 * React 岛屿:Python / C++ / Java 切换、行号、复制反馈、关键行高亮。
 * 高亮走一个极简 tokenizer(注释/字符串/关键字/数字),保持克制。
 */
import { useMemo, useState } from 'react';

export type CodeVariant = {
  lang: string;
  label: string;
  code: string;
  /** 关键行(与正文解释联动) */
  highlight?: number[];
};

const KEYWORDS: Record<string, string[]> = {
  python: [
    'def',
    'return',
    'if',
    'elif',
    'else',
    'while',
    'for',
    'in',
    'not',
    'and',
    'or',
    'is',
    'None',
    'True',
    'False',
    'class',
    'import',
    'from',
    'as',
    'range',
    'len',
    'int',
    'float',
    'list',
    'break',
    'continue',
    'pass',
    'yield',
    'lambda',
    'global',
    'assert',
    'with',
    'try',
    'except',
    'raise',
  ],
  cpp: [
    'int',
    'long',
    'bool',
    'void',
    'char',
    'double',
    'float',
    'auto',
    'const',
    'return',
    'if',
    'else',
    'while',
    'for',
    'break',
    'continue',
    'class',
    'struct',
    'public',
    'private',
    'static',
    'template',
    'typename',
    'using',
    'namespace',
    'new',
    'delete',
    'true',
    'false',
    'nullptr',
    'std',
    'vector',
    'size_t',
    'include',
    'push_back',
    'size',
    'front',
    'back',
  ],
  java: [
    'int',
    'long',
    'boolean',
    'char',
    'double',
    'float',
    'void',
    'final',
    'static',
    'public',
    'private',
    'protected',
    'class',
    'interface',
    'new',
    'return',
    'if',
    'else',
    'while',
    'for',
    'break',
    'continue',
    'import',
    'package',
    'true',
    'false',
    'null',
    'this',
    'extends',
    'implements',
  ],
};

type Tok = { text: string; cls: string };

/** 单行 tokenize:块注释状态由调用方跨行维护 */
function tokenizeLine(
  line: string,
  lang: string,
  inBlock: boolean,
): { toks: Tok[]; inBlock: boolean } {
  const kws = new Set(KEYWORDS[lang] ?? []);
  const toks: Tok[] = [];
  let i = 0;
  let block = inBlock;

  const push = (text: string, cls: string) => {
    if (text) toks.push({ text, cls });
  };

  while (i < line.length) {
    if (block) {
      const end = line.indexOf('*/', i);
      if (end === -1) {
        push(line.slice(i), 'cmt');
        return { toks, inBlock: true };
      }
      push(line.slice(i, end + 2), 'cmt');
      i = end + 2;
      block = false;
      continue;
    }
    const ch = line[i];
    const next = line[i + 1];
    // 行注释
    if (ch === '#' && lang === 'python') {
      push(line.slice(i), 'cmt');
      return { toks, inBlock: false };
    }
    if (ch === '/' && next === '/') {
      push(line.slice(i), 'cmt');
      return { toks, inBlock: false };
    }
    // 块注释
    if (ch === '/' && next === '*') {
      block = true;
      const start = i;
      const end = line.indexOf('*/', i + 2);
      if (end === -1) {
        push(line.slice(start), 'cmt');
        return { toks, inBlock: true };
      }
      push(line.slice(start, end + 2), 'cmt');
      i = end + 2;
      block = false;
      continue;
    }
    // 字符串
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) {
        if (line[j] === '\\') j++;
        j++;
      }
      push(line.slice(i, j + 1), 'str');
      i = j + 1;
      continue;
    }
    // 数字
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9a-fA-FxX_.]/.test(line[j])) j++;
      push(line.slice(i, j), 'num');
      i = j;
      continue;
    }
    // 标识符 / 关键字
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      push(word, kws.has(word) ? 'kw' : '');
      i = j;
      continue;
    }
    // 其他
    let j = i;
    while (
      j < line.length &&
      !/[A-Za-z0-9_'"#]/.test(line[j]) &&
      !(line[j] === '/' && (line[j + 1] === '/' || line[j + 1] === '*'))
    )
      j++;
    if (j === i) j++;
    push(line.slice(i, j), '');
    i = j;
  }
  return { toks, inBlock: block };
}

const TOK_CLASS: Record<string, string> = {
  cmt: 'text-[#7d8fa5] italic',
  str: 'text-[#8fbf9f]',
  num: 'text-[#e0b062]',
  kw: 'text-[#79a8f5]',
  '': 'text-[#c9d6e4]',
};

export default function CodeTabs({
  variants,
  title,
  defaultLang,
}: {
  variants: CodeVariant[];
  title?: string;
  defaultLang?: string;
}) {
  const initial =
    variants.find((v) => v.lang === defaultLang)?.lang ?? variants[0].lang;
  const [active, setActive] = useState(initial);
  const [copied, setCopied] = useState(false);

  const current = variants.find((v) => v.lang === active) ?? variants[0];

  const lines = useMemo(() => {
    let inBlock = false;
    return current.code
      .replace(/\n$/, '')
      .split('\n')
      .map((line) => {
        const r = tokenizeLine(line, current.lang, inBlock);
        inBlock = r.inBlock;
        return r.toks;
      });
  }, [current]);

  const hl = new Set(current.highlight ?? []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = current.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <figure className="algo-codetabs my-7 not-prose overflow-hidden rounded-[4px] border border-[#24384f] bg-[var(--algo-code-bg)]">
      {/* 页签栏 + 复制 */}
      <div className="flex items-center justify-between border-b border-[#1c2e42] bg-[#0a1522] pl-1 pr-1.5">
        <div role="tablist" aria-label="代码语言" className="flex items-end">
          {variants.map((v) => (
            <button
              key={v.lang}
              role="tab"
              aria-selected={v.lang === active}
              onClick={() => setActive(v.lang)}
              className={
                'cursor-pointer border-0 bg-transparent px-3 py-2 font-mono text-[0.72rem] tracking-[0.08em] transition-colors duration-200 ' +
                (v.lang === active
                  ? 'border-b-2 border-[#6e96f2] text-[#cfe0ff]'
                  : 'border-b-2 border-transparent text-[#5c7085] hover:text-[#9db8d6]')
              }
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {title && (
            <span className="hidden font-mono text-[0.66rem] tracking-[0.12em] text-[#5c7085] sm:inline">
              {title}
            </span>
          )}
          <button
            onClick={copy}
            aria-label="复制代码"
            className="flex min-h-[32px] cursor-pointer items-center gap-1 rounded-[3px] border border-[#24384f] bg-transparent px-2 py-1 font-mono text-[0.68rem] text-[#7d93ac] transition-colors duration-200 hover:border-[#3a5270] hover:text-[#cfe0ff]"
          >
            {copied ? '✓ 已复制' : '复制'}
          </button>
        </div>
      </div>

      {/* 代码区:行号 + 横向滚动 */}
      <div className="overflow-x-auto">
        <pre className="m-0 p-0 font-mono text-[0.82rem] leading-[1.7]">
          <code className="block min-w-max py-3">
            {lines.map((toks, idx) => {
              const no = idx + 1;
              const isHl = hl.has(no);
              return (
                <span
                  key={no}
                  className={
                    'flex px-0 transition-colors duration-200 ' +
                    (isHl ? 'bg-[#16283d]' : '')
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      'sticky left-0 w-10 shrink-0 select-none pr-3 text-right ' +
                      (isHl
                        ? 'bg-[#16283d] text-[#8ea6d8]'
                        : 'bg-[var(--algo-code-bg)] text-[#3d5270]')
                    }
                  >
                    {no}
                  </span>
                  <span className={'pr-6 ' + (isHl ? 'bg-[#16283d]' : '')}>
                    {toks.length === 0 ? (
                      <span> </span>
                    ) : (
                      toks.map((t, i) => (
                        <span key={i} className={TOK_CLASS[t.cls]}>
                          {t.text}
                        </span>
                      ))
                    )}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </figure>
  );
}
