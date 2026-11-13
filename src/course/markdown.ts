import { marked, type MarkedToken } from "marked";

const parsedTokens = (source: string): MarkedToken[] => marked.lexer(source, { gfm: true }) as unknown as MarkedToken[];

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "break" }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "del"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] }
  | { type: "image"; href: string; alt: string };

export type BlockNode =
  | { type: "heading"; level: number; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "blockquote"; children: BlockNode[] }
  | { type: "list"; ordered: boolean; items: BlockNode[][] }
  | { type: "codeBlock"; value: string; language: string }
  | { type: "rawHtml"; value: string }
  | { type: "divider" }
  | { type: "table"; header: InlineNode[][]; rows: InlineNode[][][] };

export type Example = { id: string; label: string; source: string };
export type Practice = { id: string; title: string; instruction: string; starter: string };

export class MarkdownLessonState {
  exampleId: string;
  practiceId: string | null = null;
  source: string;

  constructor(exampleId: string, source: string) {
    this.exampleId = exampleId;
    this.source = source;
  }

  edit(source: string): void { this.source = source; }
  selectExample(id: string, source: string): void { this.exampleId = id; this.practiceId = null; this.source = source; }
  loadPractice(practice: Practice): void { this.practiceId = practice.id; this.source = practice.starter; }
  restore(exampleSource: string, practice?: Practice): void { this.source = practice?.starter ?? exampleSource; }
  check(practiceId: string): { passed: boolean; message: string } { return checkMarkdownPractice(practiceId, this.source); }
}

export function slideDirection(key: string, editableTarget: boolean, modified = false): -1 | 0 | 1 {
  if (editableTarget || modified) return 0;
  if (key === "ArrowLeft") return -1;
  if (key === "ArrowRight") return 1;
  return 0;
}

const image = "![公会路线图示例]({{COURSE_MAP}})";

export const markdownExamples: Example[] = [
  { id: "complete", label: "完整冒险者档案", source: `# 星旅者的冒险档案

你好，我是 **林间向导**，目前正在学习 *前端开发*。

## 本周目标

- 学会用 Markdown 写清楚想法
- 使用 \`git status\` 查看项目状态
- 和队友一起完成第一次 Pull Request

> 每一次小小的提交，都能带你走得更远。

### 给队友的一段代码

\`\`\`js
const quest = "第一次开源贡献";
console.log(quest);
\`\`\`

| 工具 | 冒险中的职责 |
| --- | --- |
| Markdown | 整理文字 |
| Git | 记录变化 |
| GitHub | 与队友协作 |

公会路线图：

${image}

[打开 GitHub](https://github.com) 继续探索。` },
  { id: "headings", label: "标题与段落", source: `# 主标题：我的冒险日志

这里是一段普通文字。空一行就会开始新的段落。

## 第二层标题

标题前的井号数量决定层级，标题文字仍然是普通文字。` },
  { id: "emphasis", label: "粗体与斜体", source: `# 给重点加上标记

这是普通文字，**这是需要强调的重点**，*这是轻轻标出的补充*。

也可以把 **粗体** 和 *斜体* 放在同一段说明里。` },
  { id: "lists", label: "列表", source: `# 冒险背包清单

## 无序列表
- 水壶
- 地图
- 代码笔记

## 有序列表
1. 先 Fork 仓库
2. 再 Clone 到电脑
3. 提交并 Push 改动` },
  { id: "links", label: "安全链接", source: `# 传送门

[GitHub 官网](https://github.com) 是大家协作和分享项目的地方。

链接文字放在方括号中，地址放在圆括号中。` },
  { id: "images", label: "图片", source: `# 公会地图

Markdown 图片写法和链接相似，开头多一个感叹号：

${image}

示例图片来自项目自己的静态资源，不依赖第三方图片站。` },
  { id: "quotes", label: "引用", source: `# 来自前辈的提示

> 先读懂改动，再决定是否合并。
>
> 每个冒险者都可以从小任务开始。` },
  { id: "inline-code", label: "行内代码", source: `# 咒语与命令

运行 \`git status\` 可以查看文件状态；命令放在反引号中，就会显示为行内代码。` },
  { id: "code-block", label: "代码块", source: `# 代码卷轴

三个反引号包住多行代码：

\`\`\`ts
const guild = "Git 冒险者公会";
console.log(\`欢迎加入：\${guild}\`);
\`\`\`` },
  { id: "tables", label: "表格", source: `# 工具分工表

| 工具 | 负责什么 | 常见动作 |
| --- | --- | --- |
| Markdown | 整理文字 | 写标题和列表 |
| Git | 记录版本 | Commit |
| GitHub | 远程协作 | Pull Request |` },
];

export const markdownPractices: Practice[] = [
  {
    id: "title",
    title: "练习 01 · 点亮标题",
    instruction: "写一个非空的一级标题（# 标题）。检查会确认解析结果里真的有一级标题。",
    starter: "# 写下你的冒险标题\n\n",
  },
  {
    id: "intro",
    title: "练习 02 · 自我介绍",
    instruction: "包含一个一级标题，再用一段完整文字介绍你自己、喜欢的方向或加入公会的目标（至少 24 个非空白字符）。",
    starter: "# 冒险者介绍\n\n你好！我叫……，来自……。我喜欢……，这次加入公会想要……。\n",
  },
  {
    id: "card",
    title: "练习 03 · 冒险者名片",
    instruction: "制作完整名片：一级标题、至少一段介绍、把职业或身份标记加粗、包含 3 项的无序技能列表，以及一句引用格言。",
    starter: `# 星旅者的冒险名片

**职业：** 新手地图绘制师

我喜欢把复杂的知识整理成清楚的路线，也想认识更多一起学习的队友。

### 冒险技能
- 认真观察
- 乐于提问
- 持续练习

> “一步一步，也能走到很远的地方。”
`,
  },
];

type Token = MarkedToken;

function inlineTokens(tokens: Token[] = []): InlineNode[] {
  return tokens.flatMap((token): InlineNode[] => {
    switch (token.type) {
      case "text": case "escape": return [{ type: "text", value: token.text }];
      case "strong": case "em": case "del": return [{ type: token.type, children: inlineTokens(token.tokens as unknown as Token[]) }];
      case "codespan": return [{ type: "code", value: token.text }];
      case "br": return [{ type: "break" }];
      case "link": return [{ type: "link", href: token.href, children: inlineTokens(token.tokens as unknown as Token[]) }];
      case "image": return [{ type: "image", href: token.href, alt: token.text }];
      case "html": return [{ type: "text", value: token.raw }];
      default: return [{ type: "text", value: token.raw ?? "" }];
    }
  });
}

function blockTokens(tokens: Token[]): BlockNode[] {
  return tokens.flatMap((token): BlockNode[] => {
    switch (token.type) {
      case "heading": return [{ type: "heading", level: token.depth, children: inlineTokens(token.tokens as unknown as Token[]) }];
      case "paragraph": return [{ type: "paragraph", children: inlineTokens(token.tokens as unknown as Token[]) }];
      case "text": return [{ type: "paragraph", children: inlineTokens((token.tokens ?? []) as unknown as Token[]) }];
      case "blockquote": return [{ type: "blockquote", children: blockTokens(parsedTokens(token.text)) }];
      case "list": return [{ type: "list", ordered: token.ordered, items: token.items.map((item) => blockTokens(parsedTokens(item.text))) }];
      case "code": return [{ type: "codeBlock", value: token.text, language: /^[a-z0-9_-]{1,20}$/i.test(token.lang ?? "") ? token.lang ?? "" : "" }];
      case "hr": return [{ type: "divider" }];
      case "space": return [];
      case "html": return [{ type: "rawHtml", value: token.raw }];
      case "table": return [{
        type: "table",
        header: token.header.map((cell) => inlineTokens(cell.tokens as unknown as Token[])),
        rows: token.rows.map((row) => row.map((cell) => inlineTokens(cell.tokens as unknown as Token[]))),
      }];
      default: return [{ type: "rawHtml", value: token.raw ?? "" }];
    }
  });
}

export function parseMarkdown(source: string): BlockNode[] {
  return blockTokens(parsedTokens(source));
}

export function safeMarkdownLink(href: string, base = "https://guild.example/"): string | null {
  try {
    const url = new URL(href, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function safeCourseImage(href: string, coursePrefix: string, base = "https://guild.example/course/"): string | null {
  try {
    const url = new URL(href, base);
    const expected = new URL(coursePrefix, base);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.origin !== expected.origin || !url.pathname.startsWith(expected.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function inlineText(nodes: InlineNode[]): string {
  return nodes.map((item) => item.type === "text" || item.type === "code"
    ? item.value
    : item.type === "break" ? " " : item.type === "image" ? item.alt : item.type === "link" || item.type === "strong" || item.type === "em" || item.type === "del" ? inlineText(item.children) : "").join("");
}

function blockText(blocks: BlockNode[]): string {
  return blocks.map((block) => {
    if (block.type === "heading" || block.type === "paragraph") return inlineText(block.children);
    if (block.type === "blockquote") return blockText(block.children);
    if (block.type === "list") return block.items.map((items) => blockText(items)).join(" ");
    if (block.type === "table") return [...block.header, ...block.rows.flat()].map(inlineText).join(" ");
    if (block.type === "codeBlock" || block.type === "rawHtml") return block.value;
    return "";
  }).join(" ").replace(/\s+/g, " ").trim();
}

function hasInline(blocks: BlockNode[], type: "strong"): boolean {
  const contains = (items: InlineNode[]): boolean => items.some((item) => item.type === type || ("children" in item && contains(item.children)));
  return blocks.some((block) => {
    if (block.type === "heading" || block.type === "paragraph") return contains(block.children);
    if (block.type === "blockquote") return hasInline(block.children, type);
    if (block.type === "list") return block.items.some((item) => hasInline(item, type));
    if (block.type === "table") return [...block.header, ...block.rows.flat()].some(contains);
    return false;
  });
}

function hasIdentityLabel(blocks: BlockNode[]): boolean {
  const contains = (items: InlineNode[]): boolean => items.some((item) => {
    if (item.type === "strong") return /职业|身份/.test(inlineText(item.children)) || contains(item.children);
    if ("children" in item) return contains(item.children);
    return false;
  });
  return blocks.some((block) => {
    if (block.type === "heading" || block.type === "paragraph") return contains(block.children);
    if (block.type === "blockquote") return hasIdentityLabel(block.children);
    if (block.type === "list") return block.items.some((item) => hasIdentityLabel(item));
    if (block.type === "table") return [...block.header, ...block.rows.flat()].some(contains);
    return false;
  });
}

export function checkMarkdownPractice(id: string, source: string): { passed: boolean; message: string } {
  const blocks = parseMarkdown(source);
  const headings = blocks.filter((block) => block.type === "heading");
  const hasTitle = headings.some((block) => block.type === "heading" && block.level === 1 && inlineText(block.children).trim().length > 0);
  if (id === "title") return hasTitle
    ? { passed: true, message: "标题已点亮！你写出了一个有效的一级标题。" }
    : { passed: false, message: "还没找到有效的一级标题。用「# 标题」开始，井号后记得空一格。" };

  const paragraphs = blocks.filter((block) => block.type === "paragraph");
  const hasIntro = paragraphs.some((block) => block.type === "paragraph" && inlineText(block.children).replace(/\s/g, "").length >= (id === "intro" ? 24 : 18));
  if (id === "intro") {
    const passed = hasTitle && hasIntro;
    return { passed, message: passed ? "介绍完整！标题和一段具体的自我介绍都已就位。" : "还差一点：请同时写一级标题和至少 24 个非空白字符的介绍段落。" };
  }

  if (id === "card") {
    const skillLists = blocks.filter((block): block is Extract<BlockNode, { type: "list" }> => block.type === "list" && !block.ordered);
    const skillCount = skillLists.reduce((total, block) => total + block.items.filter((item) => blockText(item).trim().length > 0).length, 0);
    const hasMotto = blocks.some((block) => block.type === "blockquote" && blockText(block.children).replace(/\s/g, "").length >= 8);
    const passed = hasTitle && hasIntro && skillCount >= 3 && hasInline(blocks, "strong") && hasIdentityLabel(blocks) && hasMotto;
    return { passed, message: passed ? "名片制作完成！标题、介绍、身份强调、技能清单和格言都齐了。" : "检查清单：一级标题、一段介绍、粗体身份、至少 3 项无序技能，以及一句引用格言。" };
  }

  return { passed: false, message: "请选择一个有效练习。" };
}
