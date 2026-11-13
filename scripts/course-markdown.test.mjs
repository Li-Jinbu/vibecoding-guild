import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MarkdownLessonState,
  checkMarkdownPractice,
  markdownExamples,
  markdownPractices,
  parseMarkdown,
  safeCourseImage,
  safeMarkdownLink,
  slideDirection,
} from "../src/course/markdown.ts";

function flattenBlocks(blocks) {
  return blocks.flatMap((block) => [block, ...(block.children ? flattenBlocks(block.children) : []), ...(block.items ? block.items.flatMap(flattenBlocks) : [])]);
}

function flattenInline(blocks) {
  return blocks.flatMap((block) => [
    ...(block.children?.flatMap((item) => [item, ...(item.children ?? [])]) ?? []),
    ...(block.items ? flattenInline(block.items.flat()) : []),
    ...(block.header?.flat() ?? []),
    ...(block.rows?.flat(2) ?? []),
  ]);
}

test("完整示例解析标题、粗体、斜体、列表、链接、图片、引用、代码、代码块和表格", () => {
  const blocks = parseMarkdown(markdownExamples[0].source);
  const blockTypes = flattenBlocks(blocks).map((block) => block.type);
  const inlineTypes = flattenInline(blocks).map((item) => item.type);
  for (const type of ["heading", "paragraph", "list", "blockquote", "codeBlock", "table"]) assert.ok(blockTypes.includes(type), `缺少 ${type}`);
  for (const type of ["strong", "em", "code", "link", "image"]) assert.ok(inlineTypes.includes(type), `缺少 ${type}`);
  assert.ok(blocks.some((block) => block.type === "heading" && block.level === 1));
});

test("所有语法选择器示例都能安全解析", () => {
  for (const example of markdownExamples) assert.doesNotThrow(() => parseMarkdown(example.source), example.label);
});

test("危险 HTML 作为普通文本节点保存，危险链接和外部图片被安全策略拒绝", () => {
  const blocks = parseMarkdown('# 试试安全边界\n\n<script>alert("xss")</script>\n\n[危险链接](javascript:alert%281%29)\n\n![远程图](https://attacker.example/pixel.png)');
  assert.ok(blocks.some((block) => block.type === "rawHtml" && block.value.includes("<script>")));
  assert.equal(safeMarkdownLink("javascript:alert(1)"), null);
  assert.equal(safeMarkdownLink("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeMarkdownLink("https://github.com/"), "https://github.com/");
  assert.equal(safeCourseImage("/vibecoding-guild/course/quest-map.svg", "/vibecoding-guild/course/", "https://guild.example/vibecoding-guild/course/"), "https://guild.example/vibecoding-guild/course/quest-map.svg");
  assert.equal(safeCourseImage("../messages.json", "/vibecoding-guild/course/", "https://guild.example/vibecoding-guild/course/"), null);
  assert.equal(safeCourseImage("https://attacker.example/image.svg", "/vibecoding-guild/course/", "https://guild.example/vibecoding-guild/course/"), null);
});

test("编辑状态支持输入、切换示例与恢复当前示例或练习", () => {
  const example = markdownExamples.find((item) => item.id === "headings");
  const practice = markdownPractices.find((item) => item.id === "intro");
  const state = new MarkdownLessonState("complete", "initial");
  state.selectExample(example.id, example.source);
  state.edit("# 临时编辑");
  assert.equal(state.source, "# 临时编辑");
  state.restore(example.source);
  assert.equal(state.source, example.source);
  state.loadPractice(practice);
  state.edit(`${practice.starter}\n我喜欢设计网页，也想学习如何与更多伙伴协作。`);
  assert.equal(state.check("intro").passed, true);
  state.restore(example.source, practice);
  assert.equal(state.practiceId, "intro");
  assert.equal(state.source, practice.starter);
});

test("三个练习按目标检查结构与内容", () => {
  assert.equal(checkMarkdownPractice("title", "没有标题").passed, false);
  assert.equal(checkMarkdownPractice("title", "# 新的旅程").passed, true);
  assert.equal(checkMarkdownPractice("intro", "# 旅者\n\n你好").passed, false);
  assert.equal(checkMarkdownPractice("intro", `${markdownPractices[1].starter}\n我喜欢设计网页，也想学习如何与更多伙伴协作。`).passed, true);
  assert.equal(checkMarkdownPractice("card", markdownPractices[2].starter).passed, true);
  const missingSkills = markdownPractices[2].starter.replace(/- .+\n/g, "");
  assert.equal(checkMarkdownPractice("card", missingSkills).passed, false);
  const wrongBoldLabel = markdownPractices[2].starter.replace("**职业：**", "**擅长：**");
  assert.equal(checkMarkdownPractice("card", wrongBoldLabel).passed, false);
});

test("编辑区域内的方向键由文本编辑器处理，页面外才用于章节切换", () => {
  assert.equal(slideDirection("ArrowLeft", true), 0);
  assert.equal(slideDirection("ArrowRight", true), 0);
  assert.equal(slideDirection("ArrowLeft", false), -1);
  assert.equal(slideDirection("ArrowRight", false), 1);
  assert.equal(slideDirection("ArrowRight", false, true), 0);
  assert.equal(slideDirection("Enter", false), 0);
});

test("课件提供普通窗口、全屏投影和窄屏上下布局规则", async () => {
  const css = await readFile(new URL("../src/course/style.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/course/main.ts", import.meta.url), "utf8");
  assert.match(css, /\.course-markdown-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s+minmax\(0, 1fr\)/s);
  assert.match(css, /\.course-shell:fullscreen/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.course-markdown-workspace\s*\{\s*grid-template-columns:\s*1fr/s);
  assert.match(app, /requestFullscreen\(/);
  assert.match(app, /event\.key === "Escape"[\s\S]*?exitFullscreen\(/);
});

test("外部链接设置新标签页安全属性且预览只使用 DOM 节点", async () => {
  const app = await readFile(new URL("../src/course/main.ts", import.meta.url), "utf8");
  assert.match(app, /link\.target = "_blank"/);
  assert.match(app, /link\.rel = "noopener noreferrer"/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /document\.createTextNode\(item\.value\)/);
});
