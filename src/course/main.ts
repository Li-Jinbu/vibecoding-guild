import "./style.css";
import "../site-navigation.css";
import { createGuildNavigation } from "../site-navigation";
import { GIT_PRACTICES, GitSimulator } from "./git-simulator";
import { CollaborationSimulator, UPSTREAM, type PullRequestConfig } from "./collaboration-simulator";
import {
  CHECKLIST_ITEMS,
  GITHUB_PAGES_URL,
  GITHUB_REPOSITORY_URL,
  GuildTaskState,
  TERMINAL_STEPS,
  WEB_STEPS,
  copyGuideText,
} from "./guild-task";
import {
  AGENT_STEPS,
  AI_LESSON_MODULES,
  AIAgentLessonState,
  DEVELOPMENT_CYCLE,
  PROMPT_FIELDS,
  copyPrompt,
} from "./ai-agent";
import {
  AI_BUILD_STEPS,
  FINAL_CHECK_ITEMS,
  FINAL_DELIVERABLE_ITEMS,
  FINAL_NODES,
  FINAL_PROMPT_FIELDS,
  PROJECT_IDEAS,
  FinalChallengeState,
  copyFinalText,
} from "./final-challenge";
import {
  MarkdownLessonState,
  markdownExamples,
  markdownPractices,
  parseMarkdown,
  safeCourseImage,
  safeMarkdownLink,
  slideDirection,
  type BlockNode,
  type InlineNode,
} from "./markdown";

type View = "welcome" | "map" | "chapter";
type Route = { view: View; chapter: number };
type Chapter = { slug: string; title: string; short: string; theme: string };

const chapters: Chapter[] = [
  { slug: "prologue", title: "序章", short: "认识冒险地图", theme: "启程前，先看懂队伍里的伙伴。" },
  { slug: "markdown", title: "Markdown 魔法书", short: "把想法写清楚", theme: "用轻巧的标记，把文字变成清晰的说明。" },
  { slug: "git", title: "Git 时光机器", short: "记录每次改变", theme: "给项目留下可以回看、比较与协作的历史。" },
  { slug: "collaboration", title: "多人协作副本", short: "一起完成任务", theme: "从 Fork 到 Pull Request，体验真实协作。" },
  { slug: "guild", title: "公会入会任务", short: "完成首次贡献", theme: "提交一条留言，让第一次贡献留下记录。" },
  { slug: "agent", title: "召唤 AI 队友", short: "与 Agent 合作", theme: "让 AI 帮忙拆解任务、修改代码和检查结果。" },
  { slug: "final", title: "最终挑战", short: "整合所学技能", theme: "把整段开发流程串起来，完成你的冒险。" },
];

const app = document.querySelector<HTMLDivElement>("#course-app");
const tag = "course-";

function node<K extends keyof HTMLElementTagNameMap>(name: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const item = document.createElement(name);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function button(label: string, className: string, onClick: () => void, options: { disabled?: boolean; shortcut?: string } = {}): HTMLButtonElement {
  const item = node("button", className, label);
  item.type = "button";
  item.disabled = options.disabled ?? false;
  if (options.shortcut) item.setAttribute("aria-keyshortcuts", options.shortcut);
  item.addEventListener("click", onClick);
  return item;
}

function routeFromLocation(): Route {
  const params = new URLSearchParams(location.search);
  if (params.get("view") === "map") return { view: "map", chapter: 0 };
  const chapter = chapters.findIndex((item) => item.slug === params.get("chapter"));
  if (chapter >= 0) return { view: "chapter", chapter };
  return { view: "welcome", chapter: 0 };
}

let route = routeFromLocation();
const markdownState = new MarkdownLessonState("complete", getMarkdownExample("complete"));
const markdownPracticeResults = new Map<string, { passed: boolean; message: string }>();
const gitSimulator = new GitSimulator();
const gitPracticeResults = new Map<string, { passed: boolean; message: string }>();

function getMarkdownExample(id: string): string {
  const example = markdownExamples.find((item) => item.id === id) ?? markdownExamples[0];
  return example.source.replaceAll("{{COURSE_MAP}}", `${import.meta.env.BASE_URL}course/quest-map.svg`);
}

function renderMarkdownInline(items: InlineNode[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    if (item.type === "text") fragment.append(document.createTextNode(item.value));
    else if (item.type === "break") fragment.append(document.createElement("br"));
    else if (item.type === "code") {
      const code = node("code", `${tag}markdown-inline-code`, item.value);
      fragment.append(code);
    } else if (item.type === "image") {
      const prefix = new URL(`${import.meta.env.BASE_URL}course/`, location.origin).pathname;
      const source = safeCourseImage(item.href, prefix, location.href);
      if (!source) {
        fragment.append(node("span", `${tag}markdown-image-blocked`, `［未加载图片：${item.alt || "仅允许课件本地图片"}］`));
        continue;
      }
      const figure = node("figure", `${tag}markdown-figure`);
      const image = node("img", `${tag}markdown-image`);
      image.src = source;
      image.alt = item.alt;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      figure.append(image);
      if (item.alt) figure.append(node("figcaption", `${tag}markdown-figcaption`, item.alt));
      fragment.append(figure);
    } else if (item.type === "link") {
      const href = safeMarkdownLink(item.href, location.href);
      if (!href) {
        fragment.append(renderMarkdownInline(item.children));
        continue;
      }
      const link = node("a", `${tag}markdown-link`);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(renderMarkdownInline(item.children));
      fragment.append(link);
    } else {
      const element = node(item.type === "strong" ? "strong" : item.type === "em" ? "em" : "del", `${tag}markdown-${item.type}`);
      element.append(renderMarkdownInline(item.children));
      fragment.append(element);
    }
  }
  return fragment;
}

function renderMarkdownBlocks(blocks: BlockNode[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const block of blocks) {
    if (block.type === "heading") {
      const level = Math.max(2, Math.min(6, block.level ?? 2));
      const heading = node(`h${level}` as "h2", `${tag}markdown-heading`);
      heading.append(renderMarkdownInline(block.children));
      fragment.append(heading);
    } else if (block.type === "paragraph") {
      const paragraph = node("p", `${tag}markdown-paragraph`);
      paragraph.append(renderMarkdownInline(block.children));
      fragment.append(paragraph);
    } else if (block.type === "blockquote") {
      const quote = node("blockquote", `${tag}markdown-quote`);
      quote.append(renderMarkdownBlocks(block.children));
      fragment.append(quote);
    } else if (block.type === "list") {
      const list = document.createElement(block.ordered ? "ol" : "ul");
      list.className = `${tag}markdown-list`;
      for (const content of block.items) {
        const item = node("li", `${tag}markdown-list-item`);
        item.append(renderMarkdownBlocks(content));
        list.append(item);
      }
      fragment.append(list);
    } else if (block.type === "codeBlock" || block.type === "rawHtml") {
      const pre = node("pre", block.type === "rawHtml" ? `${tag}markdown-raw` : `${tag}markdown-code-block`);
      const code = node("code");
      code.textContent = block.value;
      if (block.type === "codeBlock" && block.language) code.dataset.language = block.language;
      pre.append(code);
      fragment.append(pre);
    } else if (block.type === "table") {
      const wrapper = node("div", `${tag}markdown-table-wrap`);
      const table = node("table", `${tag}markdown-table`);
      const head = node("thead");
      const headRow = node("tr");
      block.header.forEach((cell) => {
        const th = node("th");
        th.scope = "col";
        th.append(renderMarkdownInline(cell));
        headRow.append(th);
      });
      head.append(headRow);
      const body = node("tbody");
      block.rows.forEach((row) => {
        const tr = node("tr");
        row.forEach((cell) => {
          const td = node("td");
          td.append(renderMarkdownInline(cell));
          tr.append(td);
        });
        body.append(tr);
      });
      table.append(head, body);
      wrapper.append(table);
      fragment.append(wrapper);
    } else if (block.type === "divider") {
      fragment.append(node("hr", `${tag}markdown-divider`));
    }
  }
  return fragment;
}

function renderMarkdownPreview(target: HTMLElement, source: string): void {
  target.replaceChildren();
  if (!source.trim()) {
    target.append(node("p", `${tag}markdown-preview-empty`, "开始输入，渲染结果会出现在这里。"));
    return;
  }
  try {
    target.append(renderMarkdownBlocks(parseMarkdown(source)));
  } catch {
    target.append(node("p", `${tag}markdown-preview-empty`, "暂时无法解析这段内容，请检查 Markdown 语法。"));
  }
}

function createMarkdownChapter(): HTMLElement {
  const section = node("section", `${tag}markdown-lesson`);
  section.setAttribute("aria-labelledby", "chapter-heading");
  const intro = node("div", `${tag}markdown-lesson__intro`);
  intro.append(node("p", `${tag}eyebrow`, "CHAPTER 02 / 07 · MARKDOWN SPELLBOOK"));
  const heading = node("h1", `${tag}markdown-lesson__title`, "Markdown 魔法书");
  heading.id = "chapter-heading";
  heading.tabIndex = -1;
  intro.append(heading, node("p", `${tag}markdown-lesson__lead`, "改一行源码，马上看看它如何变成清晰的页面。试着选择示例、动手修改，再完成三张练习卡。"));
  section.append(intro);

  const explainer = node("aside", `${tag}markdown-explainer`);
  explainer.setAttribute("aria-label", "Markdown 基础概念");
  explainer.append(
    node("span", `${tag}markdown-explainer__mark`, ".md"),
    node("p", `${tag}markdown-explainer__copy`),
  );
  const explanation = explainer.querySelector("p")!;
  explanation.append(node("strong", undefined, "左边是源码，右边是渲染结果。"), document.createTextNode(" `.md` 是 Markdown 文件的常见扩展名；它保存简单文字和标记，GitHub 等工具可以把它显示成格式化页面。"));
  section.append(explainer);

  const controls = node("div", `${tag}markdown-controls`);
  const pickerLabel = node("label", `${tag}markdown-picker-label`, "语法示例");
  const picker = node("select", `${tag}markdown-picker`);
  picker.id = "markdown-example-picker";
  picker.setAttribute("aria-label", "选择 Markdown 语法示例");
  const practiceOption = node("option", undefined, "当前练习内容");
  practiceOption.value = "practice";
  picker.append(practiceOption);
  markdownExamples.forEach((example) => {
    const option = node("option", undefined, example.label);
    option.value = example.id;
    picker.append(option);
  });
  pickerLabel.htmlFor = picker.id;
  pickerLabel.append(picker);
  const restore = button("恢复当前示例", `${tag}button ${tag}button--restore`, () => {
    const practice = markdownPractices.find((item) => item.id === markdownState.practiceId);
    markdownState.restore(getMarkdownExample(markdownState.exampleId), practice);
    editor.value = markdownState.source;
    syncPreview();
    syncMode();
  });
  controls.append(pickerLabel, restore);
  section.append(controls);

  const workspace = node("div", `${tag}markdown-workspace`);
  const editorPane = node("section", `${tag}markdown-pane ${tag}markdown-pane--editor`);
  editorPane.setAttribute("aria-labelledby", "markdown-source-heading");
  const editorHead = node("div", `${tag}markdown-pane__head`);
  const editorTitle = node("h2", `${tag}markdown-pane__title`, "Markdown 源码");
  editorTitle.id = "markdown-source-heading";
  editorHead.append(editorTitle, node("span", `${tag}markdown-pane__badge`, "SOURCE.md"));
  const editor = node("textarea", `${tag}markdown-editor`);
  editor.id = "markdown-source-editor";
  editor.setAttribute("aria-label", "可编辑的 Markdown 源码");
  editor.setAttribute("aria-describedby", "markdown-editor-hint");
  editor.spellcheck = false;
  editor.autocapitalize = "off";
  editor.value = markdownState.source;
  const hint = node("p", `${tag}markdown-pane__hint`, "可以直接编辑。改动只保存在当前浏览器页面，不会提交到仓库。");
  hint.id = "markdown-editor-hint";
  editorPane.append(editorHead, editor, hint);

  const previewPane = node("section", `${tag}markdown-pane ${tag}markdown-pane--preview`);
  previewPane.setAttribute("aria-labelledby", "markdown-preview-heading");
  const previewHead = node("div", `${tag}markdown-pane__head`);
  const previewTitle = node("h2", `${tag}markdown-pane__title`, "实时预览");
  previewTitle.id = "markdown-preview-heading";
  previewHead.append(previewTitle, node("span", `${tag}markdown-pane__badge ${tag}markdown-pane__badge--preview`, "RENDERED VIEW"));
  const preview = node("div", `${tag}markdown-preview`);
  preview.setAttribute("aria-label", "Markdown 渲染结果");
  preview.setAttribute("aria-live", "off");
  previewPane.append(previewHead, preview);
  workspace.append(editorPane, previewPane);
  section.append(workspace);

  const currentMode = node("span", `${tag}markdown-mode`, "综合语法示例");
  const exercises = node("section", `${tag}markdown-practice`);
  exercises.setAttribute("aria-labelledby", "markdown-practice-heading");
  const practiceHeader = node("div", `${tag}markdown-practice__header`);
  const practiceHeading = node("h2", `${tag}markdown-practice__title`, "技能试炼");
  practiceHeading.id = "markdown-practice-heading";
  practiceHeader.append(practiceHeading, currentMode);
  const practiceGrid = node("div", `${tag}markdown-practice__grid`);
  exercises.append(practiceHeader, practiceGrid);

  function syncPreview(): void {
    renderMarkdownPreview(preview, editor.value);
    markdownState.edit(editor.value);
    if (markdownState.practiceId) markdownPracticeResults.delete(markdownState.practiceId);
    updatePracticeCards();
  }

  function syncMode(): void {
    currentMode.textContent = markdownState.practiceId
      ? `正在练习：${markdownPractices.find((item) => item.id === markdownState.practiceId)?.title ?? "自定义练习"}`
      : markdownExamples.find((item) => item.id === markdownState.exampleId)?.label ?? "自定义内容";
    picker.value = markdownState.practiceId ? "practice" : markdownState.exampleId;
  }

  function updatePracticeCards(): void {
    practiceGrid.replaceChildren();
    markdownPractices.forEach((practice, index) => {
      const card = node("article", `${tag}practice-card${markdownState.practiceId === practice.id ? ` ${tag}practice-card--active` : ""}`);
      const titleRow = node("div", `${tag}practice-card__title-row`);
      titleRow.append(node("span", `${tag}practice-card__number`, `0${index + 1}`), node("h3", `${tag}practice-card__title`, practice.title.replace(/^练习 0\d · /, "")));
      card.append(titleRow, node("p", `${tag}practice-card__instruction`, practice.instruction));
      const actions = node("div", `${tag}practice-card__actions`);
      const loadButton = button(markdownState.practiceId === practice.id ? "重载练习" : "载入练习", `${tag}button ${tag}button--load`, () => {
        markdownState.loadPractice(practice);
        editor.value = markdownState.source;
        markdownPracticeResults.delete(practice.id);
        syncPreview();
        syncMode();
        practiceGrid.querySelector<HTMLButtonElement>(`[data-load-practice="${practice.id}"]`)?.focus();
      });
      loadButton.dataset.loadPractice = practice.id;
      actions.append(loadButton);
      const checkButton = button("检查答案", `${tag}button ${tag}button--check`, () => {
        markdownState.edit(editor.value);
        markdownPracticeResults.set(practice.id, markdownState.check(practice.id));
        updatePracticeCards();
        practiceGrid.querySelector<HTMLButtonElement>(`[data-check-practice="${practice.id}"]`)?.focus();
      });
      checkButton.dataset.checkPractice = practice.id;
      actions.append(checkButton);
      card.append(actions);
      const result = markdownPracticeResults.get(practice.id);
      const feedback = node("p", `${tag}practice-card__feedback${result ? result.passed ? ` ${tag}practice-card__feedback--pass` : ` ${tag}practice-card__feedback--fail` : ""}`, result?.message ?? "载入练习并编辑后，点击检查答案。");
      feedback.setAttribute("aria-live", "polite");
      card.append(feedback);
      practiceGrid.append(card);
    });
  }

  picker.addEventListener("change", () => {
    if (picker.value === "practice") {
      if (!markdownState.practiceId) markdownState.loadPractice(markdownPractices[0]);
    } else {
      markdownState.selectExample(picker.value, getMarkdownExample(picker.value));
    }
    editor.value = markdownState.source;
    syncPreview();
    syncMode();
  });
  editor.addEventListener("input", syncPreview);
  syncPreview();
  syncMode();
  section.append(exercises);
  return section;
}

function go(next: Route, replace = false): void {
  route = next;
  const url = new URL(location.href);
  url.search = "";
  if (next.view === "map") url.searchParams.set("view", "map");
  if (next.view === "chapter") url.searchParams.set("chapter", chapters[next.chapter].slug);
  if (replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  render();
}

function conceptCard(symbol: string, name: string, english: string, description: string, tone: string): HTMLElement {
  const card = node("article", `${tag}concept ${tag}concept--${tone}`);
  const symbolNode = node("span", `${tag}concept__symbol`, symbol);
  symbolNode.setAttribute("aria-hidden", "true");
  const heading = node("h3", `${tag}concept__title`, name);
  heading.append(node("span", `${tag}concept__english`, english));
  card.append(symbolNode, heading, node("p", `${tag}concept__description`, description));
  return card;
}

function createPrologue(): HTMLElement {
  const section = node("section", `${tag}lesson`);
  section.setAttribute("aria-labelledby", "chapter-heading");

  const intro = node("div", `${tag}lesson__intro`);
  intro.append(node("p", `${tag}eyebrow`, "PROLOGUE / 冒险序章"));
  const heading = node("h1", `${tag}lesson__title`, "先认识你的开发伙伴");
  heading.id = "chapter-heading";
  heading.tabIndex = -1;
  intro.append(heading, node("p", `${tag}lesson__lead`, "写程序不只是写代码。我们用不同工具分工：有人记录变化，有人连接同伴，有人整理说明，也有人协助思考。"));
  section.append(intro);

  const cards = node("div", `${tag}concept-grid`);
  cards.append(
    conceptCard("GIT", "Git", "版本管理", "项目的时光记录器。它保存每次修改的快照，让你比较变化、回到过去，也能把不同人的工作合在一起。", "gold"),
    conceptCard("GH", "GitHub", "协作平台", "放置 Git 仓库、分享项目并讨论改动的线上平台。Pull Request 是把一份改动交给同伴检查的请求。", "blue"),
    conceptCard("#", "Markdown", "轻量标记语言", "用简单符号整理纯文字。标题、列表和代码块都能清楚表达，不需要复杂排版软件。", "mint"),
    conceptCard("AI", "AI Agent", "智能协作队友", "可以按目标规划步骤、编辑文件和运行检查。它能帮忙，但你仍要阅读改动、判断结果并决定是否接受。", "violet"),
  );
  section.append(cards);

  const flow = node("section", `${tag}flow`);
  flow.setAttribute("aria-labelledby", "flow-heading");
  const flowHeader = node("div", `${tag}flow__header`);
  flowHeader.append(node("span", `${tag}section-kicker`, "THE WHOLE ADVENTURE"), node("h2", `${tag}flow__title`, "一段完整的开发旅程"));
  flow.append(flowHeader);

  const steps = node("ol", `${tag}flow__steps`);
  const flowItems = [
    ["01", "描述想法", "Markdown"],
    ["02", "保存变化", "Git"],
    ["03", "分享与审查", "GitHub"],
    ["04", "协助完成", "AI Agent"],
  ];
  flowItems.forEach(([number, title, tool], index) => {
    const item = node("li", `${tag}flow-step`);
    item.append(node("span", `${tag}flow-step__number`, number), node("strong", `${tag}flow-step__title`, title), node("span", `${tag}flow-step__tool`, tool));
    steps.append(item);
    if (index < flowItems.length - 1) {
      const connector = node("li", `${tag}flow__connector`, "→");
      connector.setAttribute("aria-hidden", "true");
      steps.append(connector);
    }
  });
  flow.append(steps);
  const note = node("p", `${tag}flow__note`);
  note.append(node("strong", undefined, "记住分工："), document.createTextNode("Git 管版本，GitHub 管协作，Markdown 管表达，Agent 管辅助。工具协同，决定权始终在你手里。"));
  flow.append(note);
  section.append(flow);
  return section;
}

function createWelcome(): HTMLElement {
  const section = node("section", `${tag}welcome`);
  section.setAttribute("aria-labelledby", "welcome-heading");
  const copy = node("div", `${tag}welcome__copy`);
  const badge = node("p", `${tag}eyebrow`);
  badge.append(node("span", `${tag}eyebrow__pip`), document.createTextNode("90 分钟新生启程课 · 第 01 章 / 07"));
  copy.append(badge);
  const title = node("h1", `${tag}welcome__title`);
  title.id = "welcome-heading";
  title.tabIndex = -1;
  title.append(document.createTextNode("Git 冒险者公会"), node("span", undefined, "新手启程"));
  copy.append(title, node("p", `${tag}welcome__lead`, "每个开发者都从第一次开始。带上好奇心，认识工具、结伴协作，完成你的第一段开源冒险。"));
  const actions = node("div", `${tag}welcome__actions`);
  actions.append(button("开始冒险", `${tag}button ${tag}button--primary`, () => go({ view: "map", chapter: 0 })));
  const courseInfo = node("span", `${tag}welcome__meta`, "7 个章节　·　从零开始　·　无需经验");
  actions.append(courseInfo);
  copy.append(actions);

  const art = node("div", `${tag}welcome-art`);
  art.setAttribute("aria-hidden", "true");
  art.append(node("div", `${tag}welcome-art__orbit ${tag}welcome-art__orbit--one`), node("div", `${tag}welcome-art__orbit ${tag}welcome-art__orbit--two`));
  const map = node("div", `${tag}welcome-art__map`);
  map.append(node("span", `${tag}welcome-art__route`), node("span", `${tag}welcome-art__pin ${tag}welcome-art__pin--one`), node("span", `${tag}welcome-art__pin ${tag}welcome-art__pin--two`), node("span", `${tag}welcome-art__pin ${tag}welcome-art__pin--three`));
  const tower = node("div", `${tag}pixel-tower`);
  for (let i = 0; i < 15; i++) tower.append(node("i", `${tag}pixel-tower__block ${i % 4 === 0 ? `${tag}pixel-tower__block--lit` : ""}`));
  map.append(tower, node("span", `${tag}welcome-art__cross`, "+"));
  art.append(map, node("p", `${tag}welcome-art__caption`, "GUILD TERRITORY · 001"));

  section.append(copy, art);
  const footer = node("div", `${tag}welcome__footer`);
  footer.append(node("span", undefined, "你的起点不必完美，只要愿意迈出第一步。"), node("span", `${tag}welcome__footer-code`, "QUESTLINE / OPEN"));
  section.append(footer);
  return section;
}

function createMap(): HTMLElement {
  const section = node("section", `${tag}map-view`);
  section.setAttribute("aria-labelledby", "map-heading");
  const header = node("div", `${tag}map-view__header`);
  const headingCopy = node("div");
  headingCopy.append(node("p", `${tag}eyebrow`, "COURSE MAP / 课程地图"));
  const title = node("h1", `${tag}map-view__title`, "你的冒险路线");
  title.id = "map-heading";
  title.tabIndex = -1;
  headingCopy.append(title, node("p", `${tag}map-view__lead`, "七个章节，从认识工具到完成第一次协作。选择一站开始。"));
  header.append(headingCopy, button("继续序章", `${tag}button ${tag}button--primary ${tag}button--compact`, () => go({ view: "chapter", chapter: 0 })));
  section.append(header);

  const routeLine = node("div", `${tag}map-line`);
  routeLine.setAttribute("aria-hidden", "true");
  const grid = node("div", `${tag}chapter-grid`);
  chapters.forEach((chapter, index) => {
    const isOpen = index <= 6;
    const card = button("", `${tag}chapter-card${isOpen ? ` ${tag}chapter-card--ready` : ""}`, () => go({ view: "chapter", chapter: index }));
    card.setAttribute("aria-label", `第 ${index + 1} 章：${chapter.title}。${isOpen ? "内容已开放" : "互动内容将在后续阶段开发"}`);
    card.append(node("span", `${tag}chapter-card__number`, `CH ${String(index + 1).padStart(2, "0")}`));
    const emblem = node("span", `${tag}chapter-card__emblem`, isOpen ? "✦" : String(index + 1).padStart(2, "0"));
    emblem.setAttribute("aria-hidden", "true");
    card.append(emblem, node("strong", `${tag}chapter-card__title`, chapter.title), node("span", `${tag}chapter-card__short`, chapter.short));
    card.append(node("span", `${tag}chapter-card__status`, index === 0 ? "序章 · 已开放" : index === 1 ? "魔法书 · 已开放" : index === 2 ? "时光机器 · 已开放" : index === 3 ? "协作副本 · 已开放" : index === 4 ? "入会任务 · 已开放" : index === 5 ? "AI 队友 · 已开放" : index === 6 ? "最终挑战 · 已开放" : "互动内容将在后续阶段开发"));
    grid.append(card);
  });
  section.append(routeLine, grid);
  const notice = node("p", `${tag}map-notice`);
  notice.append(node("span", `${tag}map-notice__mark`, "i"), document.createTextNode("七个章节均已开放，选择一站开始你的冒险。"));
  section.append(notice);
  return section;
}

function createGitSimulatorChapter(): HTMLElement {
  const section = node("section", tag + "git-lesson");
  section.setAttribute("aria-labelledby", "git-heading");
  const title = node("h1", tag + "git-title", "Git 时光机器");
  title.id = "git-heading";
  title.tabIndex = -1;
  section.append(node("p", tag + "eyebrow", "CHAPTER 03 / GIT TIME MACHINE"), title,
    node("p", tag + "git-lead", "编辑 README.md，观察 Git 记录快照、形成提交，再将提交同步到远程。"),
    node("p", tag + "git-note", "四个区域是内容快照与提交引用的教学视图，不是文件物理移动。所有操作只在浏览器中模拟。"));

  const lanes = node("div", tag + "git-lanes");
  const work = node("article", tag + "git-lane " + tag + "git-lane--work");
  const workTitle = node("h2", tag + "git-lane__title", "01 · 工作区");
  workTitle.id = "git-work-title";
  const editor = node("textarea", tag + "git-editor");
  editor.setAttribute("aria-labelledby", "git-work-title");
  editor.setAttribute("spellcheck", "false");
  editor.value = gitSimulator.workingContent;
  work.append(workTitle, node("p", tag + "git-lane__meta", "README.md · 当前编辑内容"), editor);

  const stage = node("article", tag + "git-lane " + tag + "git-lane--stage");
  const stageTitle = node("h2", tag + "git-lane__title", "02 · 暂存区 (Index)");
  stageTitle.id = "git-stage-title";
  const stageBadge = node("span", tag + "git-badge");
  const stageSnapshot = node("pre", tag + "git-snapshot");
  stageSnapshot.setAttribute("aria-labelledby", "git-stage-title");
  stage.append(stageTitle, stageBadge, stageSnapshot);

  const local = node("article", tag + "git-lane " + tag + "git-lane--local");
  const localTitle = node("h2", tag + "git-lane__title", "03 · 本地仓库");
  localTitle.id = "git-local-title";
  const localMeta = node("p", tag + "git-lane__meta");
  const localList = node("ol", tag + "git-commit-list");
  localList.setAttribute("aria-labelledby", "git-local-title");
  local.append(localTitle, localMeta, localList);
  const remote = node("article", tag + "git-lane " + tag + "git-lane--remote");
  const remoteTitle = node("h2", tag + "git-lane__title", "04 · 远程仓库");
  remoteTitle.id = "git-remote-title";
  const remoteMeta = node("p", tag + "git-lane__meta");
  const remoteList = node("ol", tag + "git-commit-list");
  remoteList.setAttribute("aria-labelledby", "git-remote-title");
  remote.append(remoteTitle, remoteMeta, remoteList);
  lanes.append(work, stage, local, remote);
  section.append(lanes);

  const statusPanel = node("section", tag + "git-status-panel");
  const statusBadge = node("span", tag + "git-status-badge");
  const statusOutput = node("pre", tag + "git-status-output");
  statusOutput.setAttribute("aria-live", "polite");
  statusPanel.append(node("h2", tag + "git-subtitle", "状态观察站 · git status"), statusBadge, statusOutput);
  section.append(statusPanel);

  const controls = node("section", tag + "git-controls");
  controls.append(node("h2", tag + "git-subtitle", "操作台 · 只识别本课命令"));
  const commandButtons = node("div", tag + "git-command-buttons");
  const explanation = node("section", tag + "git-explanation");
  const explainCommand = node("p", tag + "git-explanation__command");
  const explainChanged = node("p", tag + "git-explanation__row");
  const explainUnchanged = node("p", tag + "git-explanation__row");
  const explainNext = node("p", tag + "git-explanation__row");
  const history = node("ol", tag + "git-history");
  explanation.append(node("h2", tag + "git-subtitle", "上一步操作说明"), explainCommand, explainChanged, explainUnchanged, explainNext,
    node("h3", tag + "git-history__title", "操作历史"), history);
  const update = (syncEditor = false): void => {
    if (syncEditor) editor.value = gitSimulator.workingContent;
    stageBadge.textContent = gitSimulator.hasStagedChange ? "暂存快照有变化" : "与 HEAD 相同";
    stageBadge.classList.toggle(tag + "git-badge--active", gitSimulator.hasStagedChange);
    stageSnapshot.textContent = gitSimulator.stagedContent;
    localMeta.textContent = "HEAD " + gitSimulator.head.hash + " · " + gitSimulator.commits.length + " 条提交 · " + (gitSimulator.commitsAhead ? "领先远程 " + gitSimulator.commitsAhead + " 条" : "与远程同步");
    remoteMeta.textContent = "远程 HEAD " + gitSimulator.remoteHead.hash + " · " + gitSimulator.remoteCommits.length + " 条提交";
    const fill = (list: HTMLOListElement, commits: typeof gitSimulator.commits): void => {
      list.replaceChildren();
      [...commits].reverse().forEach((commit) => {
        const item = node("li", tag + "git-commit");
        item.append(node("code", tag + "git-commit__hash", commit.hash), node("strong", tag + "git-commit__message", commit.message),
          node("span", tag + "git-commit__version", "README v" + commit.id));
        list.append(item);
      });
    };
    fill(localList, gitSimulator.localCommits);
    fill(remoteList, gitSimulator.remoteCommits);
    statusBadge.textContent = gitSimulator.statusLabel;
    statusOutput.textContent = gitSimulator.statusTextForDisplay();
    const result = gitSimulator.lastResult;
    explainCommand.textContent = "$ " + result.command;
    explainChanged.textContent = "改变了什么：" + result.changed;
    explainUnchanged.textContent = "没有改变：" + result.unchanged;
    explainNext.textContent = "下一步：" + result.next;
    history.replaceChildren();
    gitSimulator.operationHistory.slice(0, 5).forEach((entry) => history.append(node("li", undefined, entry.command + " — " + entry.title)));
    GIT_PRACTICES.forEach((practice) => {
      const output = section.querySelector<HTMLElement>('[data-practice-feedback="' + practice.id + '"]');
      const checked = gitPracticeResults.get(practice.id);
      if (output && checked) {
        output.textContent = checked.message;
        output.className = tag + "git-practice__feedback " + (checked.passed ? tag + "git-practice__feedback--pass" : tag + "git-practice__feedback--fail");
      }
    });
  };
  const run = (command: string): void => { gitSimulator.run(command); update(); };
  commandButtons.append(
    button("git status", tag + "button " + tag + "button--ghost", () => run("git status")),
    button("git add README.md", tag + "button " + tag + "button--ghost", () => run("git add README.md")),
    button("提交暂存内容", tag + "button " + tag + "button--primary", () => run('git commit -m "更新 README"')),
    button("git push", tag + "button " + tag + "button--ghost", () => run("git push")),
    button("重置模拟器", tag + "button " + tag + "button--reset", () => { gitSimulator.reset(); gitPracticeResults.clear(); update(true); }),
  );
  controls.append(commandButtons);
  const terminal = node("form", tag + "git-terminal");
  const input = node("input", tag + "git-terminal__input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = '例如：git commit -m "Add my introduction"';
  input.setAttribute("aria-label", "输入模拟 Git 命令");
  const label = node("label", tag + "git-terminal__label", "模拟终端");
  label.append(input);
  const submit = node("button", tag + "button " + tag + "button--primary", "运行命令");
  submit.type = "submit";
  terminal.append(label, submit);
  terminal.addEventListener("submit", (event) => { event.preventDefault(); run(input.value); input.value = ""; });
  controls.append(terminal, node("p", tag + "git-terminal__hint", '只支持 git status、git add README.md、git commit -m "说明"、git push；不会执行系统命令。'));
  section.append(controls, explanation);

  const practiceSection = node("section", tag + "git-practices");
  practiceSection.append(node("h2", tag + "git-subtitle", "公会训练任务"));
  const grid = node("div", tag + "git-practice-grid");
  GIT_PRACTICES.forEach((practice, index) => {
    const card = node("article", tag + "git-practice");
    card.append(node("span", tag + "git-practice__number", "TASK 0" + (index + 1)),
      node("h3", tag + "git-practice__title", practice.title), node("p", tag + "git-practice__requirement", practice.requirement));
    const feedback = node("p", tag + "git-practice__feedback", "完成任务后检查当前模拟状态。");
    feedback.dataset.practiceFeedback = practice.id;
    card.append(button("检查当前进度", tag + "button " + tag + "button--check", () => { gitPracticeResults.set(practice.id, gitSimulator.checkPractice(practice.id)); update(); }), feedback);
    grid.append(card);
  });
  practiceSection.append(grid, node("p", tag + "git-simplification", "简化模型：一个 README.md 和线性提交历史；不模拟分支、冲突、撤销、合并或真实网络传输。"));
  section.append(practiceSection);
  editor.addEventListener("input", () => { gitSimulator.editWorkingFile(editor.value); update(); });
  editor.addEventListener("change", () => gitSimulator.recordEdit());
  update();
  return section;
}

function createCollaborationChapter(): HTMLElement {
  const sim = new CollaborationSimulator();
  const section = node("section", tag + "collab-lesson");
  const title = node("h1", tag + "collab-title", "多人协作副本");
  title.id = "collab-heading";
  title.tabIndex = -1;
  section.setAttribute("aria-labelledby", title.id);
  section.append(node("p", tag + "eyebrow", "CHAPTER 04 / CO-OP QUEST"), title,
    node("p", tag + "collab-lead", "从 Fork 到 Merge，轮流扮演贡献者与仓库管理员。整个副本只在浏览器里模拟，不会创建真实 Fork 或 Pull Request。"));

  const roles = node("div", tag + "collab-role-switch");
  const roleText = node("p", tag + "collab-role-copy");
  const roleContributor = button("贡献者视角", tag + "button " + tag + "button--ghost", () => { sim.role = "contributor"; update(); });
  const roleMaintainer = button("仓库管理员视角", tag + "button " + tag + "button--ghost", () => { sim.role = "maintainer"; update(); });
  roles.append(node("span", tag + "collab-role-label", "当前角色"), roleContributor, roleMaintainer, roleText);
  section.append(roles);

  const relation = node("section", tag + "collab-relation");
  relation.append(node("h2", tag + "collab-subtitle", "仓库关系图"));
  const relationRow = node("div", tag + "collab-relation__row");
  const upstream = node("article", tag + "collab-repo collab-repo--upstream");
  upstream.append(node("span", tag + "collab-repo__kind", "UPSTREAM · 原始远程仓库"), node("strong", tag + "collab-repo__name", "Li-Jinbu/vibecoding-guild"), node("span", tag + "collab-repo__state", "main · 目前没有本次留言"));
  const fork = node("article", tag + "collab-repo collab-repo--fork");
  const forkState = node("span", tag + "collab-repo__state");
  fork.append(node("span", tag + "collab-repo__kind", "FORK · 贡献者远程副本"), node("strong", tag + "collab-repo__name", "contributor/vibecoding-guild"), forkState);
  const local = node("article", tag + "collab-repo collab-repo--local");
  const localState = node("span", tag + "collab-repo__state");
  local.append(node("span", tag + "collab-repo__kind", "CLONE · 贡献者本地仓库"), node("strong", tag + "collab-repo__name", "本地工作副本"), localState);
  const prNode = node("article", tag + "collab-repo collab-repo--pr");
  const prState = node("span", tag + "collab-repo__state");
  prNode.append(node("span", tag + "collab-repo__kind", "PULL REQUEST · 合并请求"), node("strong", tag + "collab-repo__name", "功能分支 → 原始仓库 main"), prState);
  [upstream, fork, local, prNode].forEach((repo, index) => {
    relationRow.append(repo);
    if (index < 3) relationRow.append(node("span", tag + "collab-arrow", index === 0 ? "Fork →" : index === 1 ? "Clone →" : "Push → PR →"));
  });
  relation.append(relationRow, node("p", tag + "collab-flow-note", "Fork 创建远程副本；Clone 复制到本地；Branch 是本地仓库中的开发线。PR 只提出请求，只有管理员 Merge 后才会进入原始仓库 main。"));
  section.append(relation);

  const progress = node("nav", tag + "collab-steps");
  progress.setAttribute("aria-label", "协作流程步骤");
  const stepLabels = ["Fork", "Clone", "Branch", "修改", "Commit & Push", "Pull Request", "Review", "Merge"];
  const stepButtons = stepLabels.map((label, index) => {
    const item = button((index + 1) + ". " + label, tag + "collab-step", () => { sim.step = index; update(); });
    item.setAttribute("aria-label", "第 " + (index + 1) + " 步：" + label);
    progress.append(item);
    return item;
  });
  section.append(progress);

  const stepPanel = node("section", tag + "collab-step-panel");
  const stepHeading = node("h2", tag + "collab-subtitle");
  const stepDescription = node("p", tag + "collab-step-description");
  const actionArea = node("div", tag + "collab-actions");
  stepPanel.append(stepHeading, stepDescription, actionArea);
  section.append(stepPanel);

  const prSummary = node("section", tag + "collab-pr-summary");
  const prStatus = node("span", tag + "collab-pr-status");
  const prDetails = node("div", tag + "collab-pr-details");
  prSummary.append(node("h2", tag + "collab-subtitle", "PR #1 · 入会留言"), prStatus, prDetails);
  section.append(prSummary);

  const resultPanel = node("section", tag + "collab-result");
  const resultTitle = node("h2", tag + "collab-subtitle", "副本反馈");
  const resultDetail = node("p", tag + "collab-result__detail");
  const history = node("ol", tag + "collab-history");
  history.setAttribute("aria-label", "操作历史");
  resultPanel.append(resultTitle, resultDetail, node("h3", tag + "collab-history__title", "最近操作"), history);
  section.append(resultPanel);

  const exercises = node("section", tag + "collab-exercises");
  exercises.append(node("h2", tag + "collab-subtitle", "协作训练任务"));
  const quiz = node("article", tag + "collab-exercise");
  quiz.append(node("h3", tag + "collab-exercise__title", "练习 1 · 分清三个概念"));
  const selects: HTMLSelectElement[] = [];
  const choices = [
    ["fork", "Fork 做什么？", [["", "请选择"], ["remote-copy", "创建自己的远程仓库副本"], ["local-copy", "复制仓库到电脑"], ["repo-branch", "在仓库里建开发分支"]]],
    ["clone", "Clone 做什么？", [["", "请选择"], ["remote-copy", "创建远程仓库副本"], ["local-copy", "把远程仓库复制到本地"], ["repo-branch", "创建仓库内的开发分支"]]],
    ["branch", "Branch 是什么？", [["", "请选择"], ["remote-copy", "远程仓库的副本"], ["local-copy", "把远程仓库下载到电脑"], ["repo-branch", "仓库内部的一条开发线"]]],
  ] as const;
  choices.forEach(([name, label, options]) => {
    const select = node("select", tag + "collab-select");
    select.setAttribute("aria-label", label);
    options.forEach(([value, text]) => { const option = node("option", undefined, text); option.value = value; select.append(option); });
    const wrapper = node("label", tag + "collab-select-label", label);
    wrapper.htmlFor = "collab-quiz-" + name;
    select.id = wrapper.htmlFor;
    wrapper.append(select);
    quiz.append(wrapper);
    selects.push(select);
  });
  const feedbacks = new Map<string, { ok: boolean; title: string; detail: string }>();
  const quizFeedback = node("p", tag + "collab-exercise__feedback", "选择答案后检查。");
  quizFeedback.dataset.exercise = "concepts";
  quiz.append(button("检查匹配", tag + "button " + tag + "button--check", () => {
    const answer = sim.checkConceptExercise({ fork: selects[0].value, clone: selects[1].value, branch: selects[2].value });
    feedbacks.set("concepts", answer);
    update();
  }), quizFeedback);
  exercises.append(quiz);
  const flowExercise = node("article", tag + "collab-exercise");
  flowExercise.append(node("h3", tag + "collab-exercise__title", "练习 2 · 从 Fork 提交 PR"),
    node("p", tag + "collab-exercise__copy", "完成正确来源与目标配置，并成功创建 Pull Request。"),
    button("检查当前状态", tag + "button " + tag + "button--check", () => { feedbacks.set("open-pr", sim.checkExercise("open-pr")); update(); }));
  const prFeedback = node("p", tag + "collab-exercise__feedback", "按步骤完成后检查。");
  prFeedback.dataset.exercise = "open-pr";
  flowExercise.append(prFeedback);
  exercises.append(flowExercise);
  const mergeExercise = node("article", tag + "collab-exercise");
  mergeExercise.append(node("h3", tag + "collab-exercise__title", "练习 3 · 双角色 Review 与 Merge"),
    node("p", tag + "collab-exercise__copy", "分别扮演贡献者和管理员，让留言经过审核后进入原始 main。"),
    button("检查通关状态", tag + "button " + tag + "button--check", () => { feedbacks.set("merge", sim.checkExercise("merge")); update(); }));
  const mergeFeedback = node("p", tag + "collab-exercise__feedback", "按步骤完成后检查。");
  mergeFeedback.dataset.exercise = "merge";
  mergeExercise.append(mergeFeedback);
  exercises.append(mergeExercise);
  section.append(exercises);

  const controls = node("div", tag + "collab-nav");
  const previous = button("← 上一步", tag + "button " + tag + "button--ghost", () => { sim.step = Math.max(0, sim.step - 1); update(); });
  const next = button("下一步 →", tag + "button " + tag + "button--primary", () => { sim.step = Math.min(stepLabels.length - 1, sim.step + 1); update(); });
  controls.append(previous, next, button("重置副本", tag + "button " + tag + "button--reset", () => { sim.reset(); feedbacks.clear(); selects.forEach((select) => { select.selectedIndex = 0; }); update(); }));
  section.append(controls);
  const realLink = node("a", tag + "collab-real-link", "前往真实公会入会任务 →");
  realLink.href = "https://github.com/Li-Jinbu/vibecoding-guild";
  realLink.target = "_blank";
  realLink.rel = "noopener noreferrer";
  section.append(realLink);

  function renderStep(): void {
    const index = sim.step;
    stepButtons.forEach((item, i) => {
      item.classList.toggle(tag + "collab-step--current", index === i);
      item.classList.toggle(tag + "collab-step--done", [sim.forkCreated, sim.cloned, sim.branchCreated, Boolean(sim.localCommit), sim.pushed, sim.prStatus !== "none", sim.prStatus === "approved" || sim.prStatus === "merged", sim.prStatus === "merged"][i]);
      item.setAttribute("aria-current", index === i ? "step" : "false");
    });
    stepHeading.textContent = "步骤 " + (index + 1) + " · " + stepLabels[index];
    actionArea.replaceChildren();
    if (index === 0) {
      stepDescription.textContent = "Fork 会在 GitHub 上创建属于贡献者的远程仓库副本；它不是下载到电脑（那是 Clone）。";
      actionArea.append(button("Fork 原始仓库", tag + "button " + tag + "button--primary", () => { sim.fork(); update(); }));
    } else if (index === 1) {
      stepDescription.textContent = "Clone 把贡献者自己的 Fork 复制到本地，并让本地仓库知道对应的远程地址。";
      actionArea.append(button("Clone 贡献者的 Fork", tag + "button " + tag + "button--primary", () => { sim.clone(); update(); }));
    } else if (index === 2) {
      stepDescription.textContent = "在独立功能分支工作，main 留给稳定版本；分支不是新的仓库。";
      const name = node("input", tag + "collab-input");
      name.value = sim.branchName;
      name.setAttribute("aria-label", "功能分支名称");
      actionArea.append(name, button("创建功能分支", tag + "button " + tag + "button--primary", () => { sim.createBranch(name.value); update(); }));
    } else if (index === 3) {
      stepDescription.textContent = "模拟新增 messages/my-message.md。只在这里编辑练习文本，不会写入项目真实留言目录。";
      const editor = node("textarea", tag + "collab-editor");
      editor.value = sim.workingMessage;
      editor.setAttribute("aria-label", "编辑虚拟 messages/my-message.md");
      editor.addEventListener("input", () => sim.editMessage(editor.value));
      actionArea.append(node("label", tag + "collab-field-label", "messages/my-message.md"), editor);
    } else if (index === 4) {
      stepDescription.textContent = "Commit 形成分支上的本地提交；Push 将这条提交推送到自己的 Fork。未 Commit 的修改不能被 Push。";
      const message = node("input", tag + "collab-input");
      message.value = sim.commitMessage || "Add my guild message";
      message.setAttribute("aria-label", "提交说明");
      actionArea.append(button("Commit 修改", tag + "button " + tag + "button--ghost", () => { sim.commit(message.value); update(); }),
        button("Push 到我的 Fork", tag + "button " + tag + "button--primary", () => { sim.push("fork"); update(); }),
        button("尝试 Push 到原始仓库", tag + "button " + tag + "button--ghost", () => { sim.push("upstream"); update(); }), message);
    } else if (index === 5) {
      stepDescription.textContent = "base 是目标仓库/分支，head 是贡献者来源仓库/分支。默认配置指向项目原始仓库 main。";
      const form = node("div", tag + "collab-pr-config");
      const configs: Array<[keyof PullRequestConfig, string, string[]]> = [
        ["baseRepository", "base repository", [UPSTREAM, "contributor/vibecoding-guild"]],
        ["baseBranch", "base branch", ["main", "add-my-message"]],
        ["headRepository", "head repository", ["contributor/vibecoding-guild", UPSTREAM]],
        ["compareBranch", "compare branch", [sim.branchName, "main"]],
      ];
      configs.forEach(([key, label, values]) => {
        const select = node("select", tag + "collab-select");
        select.setAttribute("aria-label", label);
        values.forEach((value) => { const option = node("option", undefined, value); option.value = value; select.append(option); });
        select.value = sim.prConfig[key];
        select.addEventListener("change", () => {
          sim.setPullRequestConfig({ ...sim.prConfig, [key]: select.value });
          updatePrSummary();
        });
        const wrapper = node("label", tag + "collab-select-label", label);
        wrapper.append(select);
        form.append(wrapper);
      });
      actionArea.append(form, button("创建 Pull Request", tag + "button " + tag + "button--primary", () => { sim.openPullRequest(); update(); }));
    } else if (index === 6) {
      stepDescription.textContent = "管理员查看文件差异并检查结果。Review 是审核，不等于合并；请求修改后贡献者可更新同一条 PR。";
      const diff = node("pre", tag + "collab-diff");
      diff.textContent = sim.workingMessage.split("\n").map((line) => "+ " + line).join("\n");
      actionArea.append(node("p", tag + "collab-review-comment", sim.reviewComment || "检查项：留言文件路径正确、内容安全、格式清晰。"),
        diff,
        button("Request changes · 请求修改", tag + "button " + tag + "button--ghost", () => { sim.requestChanges(); update(); }),
        button("Approve · 批准", tag + "button " + tag + "button--primary", () => { sim.approve(); update(); }));
      if (sim.prStatus === "changes-requested") {
        actionArea.append(button("切换贡献者并更新 PR", tag + "button " + tag + "button--ghost", () => {
          sim.role = "contributor";
          sim.updateAfterReview(sim.workingMessage + "\n\n我还想学习分支与代码审查。");
          update();
        }));
      }
    } else {
      stepDescription.textContent = "即使 PR 已批准，也要由管理员执行 Merge。只有合并后，原始仓库 main 才包含这条留言。";
      actionArea.append(button("Approve · 批准", tag + "button " + tag + "button--ghost", () => { sim.approve(); update(); }),
        button("Merge Pull Request", tag + "button " + tag + "button--primary", () => { sim.merge(); update(); }),
        node("p", tag + "collab-merge-warning", "真实 PR 也可能因冲突、检查失败或权限限制暂时不能合并。"));
    }
    previous.disabled = index === 0;
    next.disabled = index === stepLabels.length - 1;
  }

  function updatePrSummary(): void {
    prStatus.textContent = "状态：" + ({ none: "尚未创建", open: "等待审核", "changes-requested": "需要修改", approved: "已批准 · 未合并", merged: "已合并" } as const)[sim.prStatus];
    prDetails.replaceChildren();
    const detailRows = [
      ["标题", "Add my guild message"],
      ["描述", "新增 messages/my-message.md，完成首次公会留言。"],
      ["目标", sim.prConfig.baseRepository + " · " + sim.prConfig.baseBranch],
      ["来源", sim.prConfig.headRepository + " · " + sim.prConfig.compareBranch],
      ["文件差异", sim.localCommit ? "+ messages/my-message.md（" + sim.workingMessage.split("\n").length + " 行）" : "尚无提交差异"],
      ["自动检查", sim.checksPassed ? "通过" : "等待 PR 创建"],
      ["PR 更新", sim.prUpdateCount ? "已更新 " + sim.prUpdateCount + " 次" : "暂无新提交"],
    ];
    detailRows.forEach(([label, value]) => {
      const row = node("p", tag + "collab-pr-row");
      row.append(node("strong", undefined, label + "："), document.createTextNode(value));
      prDetails.append(row);
    });
  }

  function update(): void {
    roleText.textContent = sim.role === "contributor" ? "贡献者：在自己的 Fork 分支修改并提交 PR。" : "管理员：审核 PR、请求修改、批准并决定是否合并。";
    roleContributor.setAttribute("aria-pressed", String(sim.role === "contributor"));
    roleMaintainer.setAttribute("aria-pressed", String(sim.role === "maintainer"));
    forkState.textContent = sim.forkCreated ? sim.pushed ? sim.branchName + " · 已 Push" : "已 Fork · 分支尚未 Push" : "尚未 Fork";
    localState.textContent = sim.cloned ? sim.branchCreated ? sim.branchName + (sim.localCommit ? " · 有本地提交" : " · 等待提交") : "已 Clone · 当前在 main" : "尚未 Clone";
    prState.textContent = sim.prStatus === "none" ? "尚未创建" : sim.prStatus === "merged" ? "已合并" : sim.prStatus;
    upstream.querySelector<HTMLElement>("." + tag + "collab-repo__state")!.textContent = sim.upstreamHasMessage ? "main · 已包含 messages/my-message.md" : "main · 目前没有本次留言";
    progress.setAttribute("aria-label", "协作流程步骤，第 " + (sim.step + 1) + " 步，共 8 步");
    resultTitle.textContent = sim.lastResult.title + (sim.lastResult.ok ? " · 完成" : " · 提示");
    resultDetail.textContent = sim.lastResult.detail;
    history.replaceChildren();
    sim.operationHistory.slice(0, 6).forEach((entry) => history.append(node("li", undefined, entry)));
    feedbacks.forEach((_, id) => {
      const current = sim.checkExercise(id as "concepts" | "open-pr" | "merge");
      feedbacks.set(id, current);
    });
    section.querySelectorAll<HTMLElement>("[data-exercise]").forEach((element) => {
      const result = feedbacks.get(element.dataset.exercise || "");
      if (result) {
        element.textContent = result.title + "：" + result.detail;
        element.className = tag + "collab-exercise__feedback " + (result.ok ? tag + "collab-exercise__feedback--pass" : tag + "collab-exercise__feedback--fail");
      }
    });
    renderStep();
    updatePrSummary();
  }
  roleContributor.addEventListener("click", () => { sim.role = "contributor"; update(); });
  roleMaintainer.addEventListener("click", () => { sim.role = "maintainer"; update(); });
  update();
  return section;
}

function createGuildTaskChapter(): HTMLElement {
  const state = new GuildTaskState();
  const section = node("section", tag + "guild-task");
  const heading = node("h1", tag + "guild-task__title", "公会入会任务");
  heading.id = "guild-task-heading";
  heading.tabIndex = -1;
  section.setAttribute("aria-labelledby", heading.id);
  section.append(node("p", tag + "eyebrow", "CHAPTER 05 / FIRST CONTRIBUTION"),
    heading,
    node("p", tag + "guild-task__lead", "把 Markdown、Git 和 GitHub 串成一次真实贡献：新增一条留言、提交 Pull Request，等待维护者合并，再到留言墙核对结果。"));

  const goal = node("div", tag + "guild-task__goal");
  goal.append(node("strong", undefined, "任务目标"), node("span", undefined, "只新增一份留言 Markdown，不修改项目源码。"));
  const prep = node("ul", tag + "guild-task__prep");
  ["GitHub 账号可以登录", "准备好几句友善、原创的自我介绍", "网页路线无需安装 Git；进阶路线需要 Git 与 VS Code"].forEach((text) => prep.append(node("li", undefined, text)));
  section.append(goal, prep);

  const tabs = node("div", tag + "guild-task__tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "选择入会任务操作路线");
  const webTab = button("GitHub 网页端新手路线", tag + "guild-task__tab", () => { state.setRoute("web"); renderGuide(); });
  webTab.setAttribute("role", "tab");
  webTab.id = "guild-task-tab-web";
  const terminalTab = button("VS Code + Git 进阶路线", tag + "guild-task__tab", () => { state.setRoute("terminal"); renderGuide(); });
  terminalTab.setAttribute("role", "tab");
  terminalTab.id = "guild-task-tab-terminal";
  tabs.append(webTab, terminalTab);
  tabs.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    state.setRoute(state.route === "web" ? "terminal" : "web");
    renderGuide();
    (state.route === "web" ? webTab : terminalTab).focus();
  });
  section.append(tabs);

  const panel = node("section", tag + "guild-task__guide");
  panel.setAttribute("role", "tabpanel");
  const panelTitle = node("h2", tag + "guild-task__section-title");
  const progressWrap = node("div", tag + "guild-task__progress-wrap");
  const progress = node("div", tag + "guild-task__progress");
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "当前路线进度");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  const progressBar = node("span", tag + "guild-task__progress-bar");
  progress.append(progressBar);
  const progressText = node("span", tag + "guild-task__progress-text");
  progressWrap.append(progress, progressText);
  const stepNav = node("nav", tag + "guild-task__steps");
  stepNav.setAttribute("aria-label", "路线步骤");
  const stepPanel = node("article", tag + "guild-task__step");
  const stepHeading = node("h3", tag + "guild-task__step-title");
  const stepBody = node("p", tag + "guild-task__step-copy");
  const commandArea = node("div", tag + "guild-task__command");
  const stepLink = node("a", tag + "guild-task__step-link", "打开 GitHub 公会仓库");
  stepLink.href = GITHUB_REPOSITORY_URL;
  stepLink.target = "_blank";
  stepLink.rel = "noopener noreferrer";
  const routeFeedback = node("p", tag + "guild-task__feedback");
  routeFeedback.setAttribute("aria-live", "polite");
  stepPanel.append(stepHeading, stepBody, commandArea, stepLink, routeFeedback);
  const navButtons = node("div", tag + "guild-task__nav");
  const previous = button("← 上一步", tag + "button " + tag + "button--ghost", () => { state.previous(); renderGuide(); });
  const next = button("下一步 →", tag + "button " + tag + "button--primary", () => { state.next(); renderGuide(); });
  navButtons.append(previous, next);
  panel.append(panelTitle, progressWrap, stepNav, stepPanel, navButtons);
  section.append(panel);

  const checklist = node("section", tag + "guild-task__checklist");
  const checklistTitle = node("h2", tag + "guild-task__section-title", "交 PR 前后自检");
  const checklistCount = node("span", tag + "guild-task__check-count");
  const checklistItems = node("div", tag + "guild-task__check-items");
  const checkInputs: HTMLInputElement[] = [];
  CHECKLIST_ITEMS.forEach((text, index) => {
    const input = node("input");
    input.type = "checkbox";
    input.id = "guild-task-check-" + index;
    input.addEventListener("change", () => { state.toggleChecklist(index); updateChecklist(); });
    const label = node("label", tag + "guild-task__check", text);
    label.htmlFor = input.id;
    label.prepend(input);
    checklistItems.append(label);
    checkInputs.push(input);
  });
  const checklistNote = node("p", tag + "guild-task__local-note", "这是浏览器本地自检清单，不会查询 GitHub，也不代表 PR 已通过或已合并。");
  const checklistReset = button("清空自检", tag + "button " + tag + "button--ghost", () => { state.resetChecklist(); checkInputs.forEach((input) => { input.checked = false; }); updateChecklist(); });
  checklist.append(checklistTitle, checklistCount, checklistItems, checklistNote, checklistReset);
  section.append(checklist);

  const details = node("div", tag + "guild-task__details");
  const markdownDetails = node("details", tag + "guild-task__details-item");
  markdownDetails.append(node("summary", undefined, "留言 Markdown 规范（按真实校验规则）"));
  const markdownCopy = node("ul");
  [
    "文件必须直接放在 messages/ 下，一次 PR 只新增一个 .md 文件；不能改动、删除或重命名其他文件。",
    "文件名以 Unicode 字母或数字开头，后续最多 119 个字母、数字、空格、下划线、括号、点或连字符；不能含 ..，不能以 _ 开头。推荐：我的留言.md。",
    "文件大小最多 10 KB，内容不能为空。可以写普通文字、标题、段落、粗体、斜体、删除线、列表、引用、代码、代码块、分隔线和链接。",
    "禁止原始 HTML 与图片。链接必须是完整的 http:// 或 https:// 地址；暂不支持的 Markdown 格式会被拒绝。",
    "不要求 YAML Front Matter。不要填写 author/github 来声明身份；旧版 YAML 仍兼容，但身份不会从这些字段读取。",
  ].forEach((text) => markdownCopy.append(node("li", undefined, text)));
  markdownDetails.append(markdownCopy);

  const reviewDetails = node("details", tag + "guild-task__details-item");
  reviewDetails.append(node("summary", undefined, "PR 检查、审核与作者显示"));
  const reviewCopy = node("div", tag + "guild-task__details-copy");
  reviewCopy.append(
    node("p", undefined, "PR 必须面向原始仓库 Li-Jinbu/vibecoding-guild 的 main。自动校验会检查 PR 相对目标分支的完整变更，要求只新增一份合法留言，并运行测试、留言校验和构建。"),
    node("p", undefined, "自动检查通过不代表已经合并。维护者会 Review；如请求修改，请在原功能分支补充 Commit 并 Push，PR 会更新。只有管理员 Merge 后，留言才进入网站数据。"),
    node("p", undefined, "合并后，作者登记工作流从 GitHub PR 的可信作者信息建立文件对应关系。符合条件且成功合并的留言才会进入作者记录流程；不需要手动填写 JSON。无法可靠确认身份的旧留言仍显示匿名。"),
    node("p", undefined, "本页面不会读取真实 PR 状态。请在 GitHub 的 Pull requests、Checks 和合并记录中手动核实；部署完成后再到留言墙查找留言及作者。"),
  );
  reviewDetails.append(reviewCopy);

  const troubleDetails = node("details", tag + "guild-task__details-item");
  troubleDetails.append(node("summary", undefined, "常见错误与排查"));
  const troubleList = node("ul");
  [
    "PR 显示 base 是自己的 Fork：改为 base repository Li-Jinbu/vibecoding-guild、base branch main；head repository 才是自己的 Fork，compare branch 是功能分支。",
    "自动检查提示文件变更不合规：确认只新增一个 messages/xxx.md；不要把 README、源码、工作流或其他人的留言一起提交。",
    "留言校验失败：检查文件名字符、10 KB 上限、原始 HTML、图片、链接协议和不支持的 Markdown。",
    "检查通过但网站暂时没显示：确认 PR 已合并，并等待 Pages 部署完成后刷新留言墙。",
    "作者仍显示匿名：核对 PR 是否由项目作者登记工作流处理；网页端不会猜测作者，也不要自行编辑作者映射文件。",
  ].forEach((text) => troubleList.append(node("li", undefined, text)));
  troubleDetails.append(troubleList);
  details.append(markdownDetails, reviewDetails, troubleDetails);
  section.append(details);

  const acceptance = node("section", tag + "guild-task__acceptance");
  acceptance.append(node("h2", tag + "guild-task__section-title", "作业验收标准"),
    node("p", undefined, "PR 只新增一份合规留言；目标是原始仓库 main；自动检查通过；维护者完成审核并合并；部署后留言墙显示留言，作者信息来自可信 PR 记录。"));
  const siteLink = node("a", tag + "guild-task__site-link", "打开真实留言墙核验 →");
  siteLink.href = GITHUB_PAGES_URL;
  siteLink.target = "_blank";
  siteLink.rel = "noopener noreferrer";
  acceptance.append(siteLink);
  section.append(acceptance);

  function updateChecklist(): void {
    checklistCount.textContent = state.checklistProgress + " / " + CHECKLIST_ITEMS.length + " 项已勾选";
  }

  function renderGuide(): void {
    const isWeb = state.route === "web";
    const items = isWeb ? WEB_STEPS : TERMINAL_STEPS;
    const index = state.currentStep;
    panelTitle.textContent = isWeb ? "GitHub 网页端 · 不需要本地命令行" : "VS Code + Git · Windows PowerShell";
    webTab.setAttribute("aria-selected", String(isWeb));
    terminalTab.setAttribute("aria-selected", String(!isWeb));
    webTab.tabIndex = isWeb ? 0 : -1;
    terminalTab.tabIndex = isWeb ? -1 : 0;
    panel.setAttribute("aria-labelledby", isWeb ? webTab.id : terminalTab.id);
    progress.setAttribute("aria-valuenow", String(state.progress));
    progressBar.style.width = state.progress + "%";
    progressText.textContent = "第 " + (index + 1) + " / " + items.length + " 步 · " + state.progress + "%";
    stepNav.replaceChildren();
    items.forEach((item, itemIndex) => {
      const step = button((itemIndex + 1) + ". " + item.title, tag + "guild-task__step-tab", () => { state.goTo(itemIndex); renderGuide(); });
      step.setAttribute("aria-current", index === itemIndex ? "step" : "false");
      stepNav.append(step);
    });
    const current = items[index];
    stepHeading.textContent = current.title;
    stepBody.textContent = isWeb ? WEB_STEPS[index].detail : TERMINAL_STEPS[index].explanation;
    commandArea.replaceChildren();
    routeFeedback.textContent = "";
    if (!isWeb) {
      const commandText = TERMINAL_STEPS[index].command;
      const pre = node("pre", tag + "guild-task__code");
      pre.textContent = commandText;
      const copy = button("复制命令", tag + "button " + tag + "button--copy", async () => {
        try {
          await copyGuideText(commandText, (value) => navigator.clipboard.writeText(value));
          routeFeedback.textContent = "已复制。请确认占位用户名已替换，再在自己的终端执行。";
        } catch {
          routeFeedback.textContent = "浏览器未提供剪贴板权限。请选中命令手动复制；本页面不会执行命令。";
        }
      });
      commandArea.append(pre, copy);
    } else if (index === 2) {
      const sample = "# 我的留言\n\n大家好！我正在学习 Git，这是我的第一条留言。";
      const pre = node("pre", tag + "guild-task__code");
      pre.textContent = sample;
      const copy = button("复制留言示例", tag + "button " + tag + "button--copy", async () => {
        try {
          await copyGuideText(sample, (value) => navigator.clipboard.writeText(value));
          routeFeedback.textContent = "示例已复制。请改成自己的内容后再提交。";
        } catch {
          routeFeedback.textContent = "浏览器未提供剪贴板权限。请选中示例手动复制，并改成自己的内容。";
        }
      });
      commandArea.append(pre, copy);
    }
    stepLink.hidden = !isWeb || index !== 0;
    if (isWeb && index === 4) {
      commandArea.append(node("p", tag + "guild-task__config-note", "base repository / base branch：原始仓库 Li-Jinbu/vibecoding-guild 的 main（接收修改的一方）；head repository / compare branch：你的 Fork 与 add-my-message（提供修改的一方）。"));
    }
    previous.disabled = index === 0;
    next.disabled = index === items.length - 1;
  }

  updateChecklist();
  renderGuide();
  return section;
}

function createAIAgentChapter(): HTMLElement {
  const state = new AIAgentLessonState();
  const section = node("section", tag + "ai-lesson");
  const heading = node("h1", tag + "ai-title", "召唤 AI 队友");
  heading.id = "ai-lesson-heading";
  heading.tabIndex = -1;
  section.setAttribute("aria-labelledby", heading.id);
  section.append(node("p", tag + "eyebrow", "CHAPTER 06 / AI COMPANION"), heading,
    node("p", tag + "ai-lead", "把 AI 当作能协作、也会犯错的队友：说清目标，检查它的工作，再用测试和反馈继续迭代。"));

  const tabs = node("nav", tag + "ai-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "AI 队友课程模块");
  const panel = node("section", tag + "ai-panel");
  panel.setAttribute("role", "tabpanel");
  const tabButtons = new Map<string, HTMLButtonElement>();
  AI_LESSON_MODULES.forEach((module) => {
    const tab = button(module.title, tag + "ai-tab", () => { state.setModule(module.id); renderModule(); });
    tab.setAttribute("role", "tab");
    tab.id = "ai-tab-" + module.id;
    tabButtons.set(module.id, tab);
    tabs.append(tab);
  });
  tabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const current = AI_LESSON_MODULES.findIndex((item) => item.id === state.activeModule);
    const next = event.key === "Home" ? 0 : event.key === "End" ? AI_LESSON_MODULES.length - 1
      : (current + (event.key === "ArrowRight" ? 1 : -1) + AI_LESSON_MODULES.length) % AI_LESSON_MODULES.length;
    state.setModule(AI_LESSON_MODULES[next].id);
    renderModule();
    tabButtons.get(state.activeModule)?.focus();
  });
  section.append(tabs, panel);

  const caution = node("aside", tag + "ai-caution");
  caution.setAttribute("aria-label", "重要提醒");
  caution.append(node("strong", undefined, "开发者仍负责结果。"),
    node("span", undefined, "AI 可能误解需求、改错文件或生成有问题的代码。审核差异、运行测试，并保护密码、Token 和私人数据。"));
  section.append(caution);

  function renderModule(): void {
    const active = state.activeModule;
    tabButtons.forEach((tab, id) => {
      const selected = id === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.setAttribute("aria-controls", "ai-module-panel");
    });
    panel.id = "ai-module-panel";
    panel.setAttribute("aria-labelledby", "ai-tab-" + active);
    panel.replaceChildren();

    if (active === "teammate") {
      panel.append(node("p", tag + "ai-kicker", "01 / WHO'S ON THE PARTY"),
        node("h2", tag + "ai-section-title", "认识 AI 队友"));
      const cards = node("div", tag + "ai-concepts");
      const entries = [
        ["LLM · 大语言模型", "能根据上下文理解并生成自然语言、代码等内容。它根据学到的语言规律生成回答，不等于知道所有事实。", "TEXT / CODE"],
        ["聊天式 AI", "主要通过对话给建议、解释知识或生成内容。你通常需要自己把建议复制到项目里并执行。", "ASK / ANSWER"],
        ["AI Agent", "获得相应工具和权限后，可以按步骤读取项目、修改文件、运行检查并汇报。能力取决于所连接的工具和权限。", "PLAN / ACT"],
      ];
      entries.forEach(([title, detail, code], index) => {
        const card = node("article", tag + "ai-concept");
        card.append(node("span", tag + "ai-concept__index", "ROLE 0" + (index + 1)),
          node("h3", tag + "ai-concept__title", title), node("p", tag + "ai-concept__detail", detail),
          node("span", tag + "ai-concept__code", code));
        cards.append(card);
      });
      panel.append(cards);
      const vibe = node("div", tag + "ai-vibe");
      vibe.append(node("span", tag + "ai-vibe__sigil", "VIBE"),
        node("h3", tag + "ai-vibe__title", "Vibe Coding"),
        node("p", tag + "ai-vibe__copy", "用自然语言描述想做什么，借助 AI 生成、修改和迭代软件。节奏可以轻快，验证不能省略。"));
      panel.append(vibe);
    } else if (active === "tools") {
      panel.append(node("p", tag + "ai-kicker", "02 / PARTY ROSTER"),
        node("h2", tag + "ai-section-title", "工具小队 · 看清各自定位"));
      const cards = node("div", tag + "ai-tools");
      const tools = [
        ["ChatGPT", "需求讨论、知识讲解、代码分析和方案设计。", "对话与推理伙伴"],
        ["Codex", "面向代码项目的 AI 编程助手，可依环境和权限执行开发任务。", "项目开发队友"],
        ["Claude Code", "可在开发环境中协助阅读、修改和测试代码的 Agent 工具。", "终端与项目协作"],
        ["DeepSeek", "可用于代码讨论、问题分析和开发辅助；Agent 能力取决于接入的工具与运行环境。", "对话与开发辅助"],
      ];
      tools.forEach(([name, detail, role], index) => {
        const card = node("article", tag + "ai-tool-card");
        card.append(node("span", tag + "ai-tool-card__serial", "ALLY / 0" + (index + 1)),
          node("h3", tag + "ai-tool-card__name", name), node("p", tag + "ai-tool-card__role", role),
          node("p", tag + "ai-tool-card__detail", detail));
        cards.append(card);
      });
      panel.append(cards, node("p", tag + "ai-small-note", "工具持续变化，实际能力取决于产品版本、运行环境、连接工具和你授予的权限。本课不涉及价格、账号配置或 API Key。"));
    } else if (active === "comparison") {
      panel.append(node("p", tag + "ai-kicker", "03 / SAME QUEST, DIFFERENT TOOLS"),
        node("h2", tag + "ai-section-title", "同一个任务：帮我制作一个个人介绍网页"));
      const compare = node("div", tag + "ai-compare");
      const chat = node("article", tag + "ai-compare-card ai-compare-card--chat");
      chat.append(node("span", tag + "ai-compare-card__label", "CHAT / 普通对话"),
        node("h3", tag + "ai-compare-card__title", "AI 提供示例，你来接手"),
        node("p", tag + "ai-compare-card__copy", "AI 可以给出一段 HTML/CSS 示例。你需要自己新建文件、复制代码、打开网页并观察结果。"));
      const code = node("pre", tag + "ai-code");
      code.textContent = ['<main class="profile">', '  <h1>你好，我是冒险者</h1>', '  <p>这里写下我的学习方向。</p>', '</main>', '', '<style>', '  .profile { max-width: 42rem; margin: 3rem auto; padding: 2rem; }', '  h1 { color: #164e63; }', '</style>'].join("\n");
      const copyCode = button("复制示例片段", tag + "button " + tag + "button--copy", async () => {
        try {
          await copyPrompt(code.textContent || "", (value) => navigator.clipboard.writeText(value));
          chatFeedback.textContent = "片段已复制；还需要你自己放进文件并运行。";
        } catch { chatFeedback.textContent = "无法访问剪贴板，请手动选择代码复制。"; }
      });
      const chatFeedback = node("p", tag + "ai-feedback");
      chat.append(code, copyCode, chatFeedback);

      const agent = node("article", tag + "ai-compare-card ai-compare-card--agent");
      const agentHeader = node("div", tag + "ai-agent-head");
      agentHeader.append(node("span", tag + "ai-compare-card__label", "AGENT / 工具协作"),
        node("span", tag + "ai-agent-step-count"));
      const agentMeter = node("div", tag + "ai-agent-meter");
      const agentMeterFill = node("span");
      agentMeter.append(agentMeterFill);
      const agentStage = node("div", tag + "ai-agent-stage");
      agentStage.setAttribute("aria-live", "polite");
      const agentStepTitle = node("h3", tag + "ai-compare-card__title");
      const agentStepCopy = node("p", tag + "ai-compare-card__copy");
      const agentNav = node("div", tag + "ai-agent-nav");
      const agentBack = button("上一步", tag + "button " + tag + "button--ghost", () => { state.previousAgentStep(); renderAgentStep(); });
      const agentNext = button("下一步", tag + "button " + tag + "button--primary", () => { state.nextAgentStep(); renderAgentStep(); });
      const agentReset = button("重新演示", tag + "button " + tag + "button--ghost", () => { state.resetAgent(); renderAgentStep(); });
      agentNav.append(agentBack, agentNext, agentReset);
      agentStage.append(agentStepTitle, agentStepCopy, agentNav);
      agent.append(agentHeader, agentMeter, agentStage);
      compare.append(chat, agent);
      panel.append(compare, node("p", tag + "ai-simulation-note", "教学模拟：右侧只逐步展示可能的 Agent 工作方式，不会读取项目或修改你电脑上的文件。"));
      function renderAgentStep(): void {
        const index = state.agentStep;
        const current = AGENT_STEPS[index];
        agentStepTitle.textContent = (index + 1) + ". " + current.title;
        agentStepCopy.textContent = current.detail;
        agentBack.disabled = index === 0;
        agentNext.disabled = index === AGENT_STEPS.length - 1;
        agentNext.textContent = index === AGENT_STEPS.length - 1 ? "已到最后一步" : "下一步";
        agentMeterFill.style.width = (((index + 1) / AGENT_STEPS.length) * 100) + "%";
        agentMeter.setAttribute("aria-label", "Agent 演示进度");
        agentMeter.setAttribute("role", "progressbar");
        agentMeter.setAttribute("aria-valuemin", "1");
        agentMeter.setAttribute("aria-valuemax", String(AGENT_STEPS.length));
        agentMeter.setAttribute("aria-valuenow", String(index + 1));
        agentHeader.querySelector<HTMLElement>("." + tag + "ai-agent-step-count")!.textContent = "STEP " + String(index + 1).padStart(2, "0") + " / 05";
      }
      renderAgentStep();
    } else if (active === "prompt") {
      panel.append(node("p", tag + "ai-kicker", "04 / PROMPT TRAINING CAMP"),
        node("h2", tag + "ai-section-title", "把“帮我做个好看的网页”说得更清楚"));
      panel.append(node("p", tag + "ai-small-note", "目标不是写得越长越好，而是补足完成任务所需的信息。请按自己的想法填写；空白项会在结果里保留待补充提示。"));
      const form = node("div", tag + "ai-prompt-form");
      PROMPT_FIELDS.forEach((field) => {
        const label = node("label", tag + "ai-prompt-label", field.label);
        const input = node("textarea", tag + "ai-prompt-input");
        input.rows = field.id === "features" || field.id === "acceptance" ? 3 : 2;
        input.placeholder = field.placeholder;
        input.value = state.prompt[field.id];
        input.addEventListener("input", () => state.setPromptField(field.id, input.value));
        label.append(input);
        form.append(label);
      });
      const promptOutput = node("pre", tag + "ai-prompt-output");
      promptOutput.setAttribute("aria-live", "polite");
      const promptFeedback = node("p", tag + "ai-feedback");
      const actions = node("div", tag + "ai-prompt-actions");
      const generate = button("查看优化结果", tag + "button " + tag + "button--primary", () => {
        promptOutput.textContent = state.createPrompt();
        promptOutput.hidden = false;
        copyGenerated.disabled = false;
        promptFeedback.textContent = "已根据你填写的内容整理结构；这不是模型生成或质量评分。";
      });
      const copyGenerated = button("复制提示词", tag + "button " + tag + "button--copy", async () => {
        try {
          await copyPrompt(promptOutput.textContent || "", (value) => navigator.clipboard.writeText(value));
          promptFeedback.textContent = "提示词已复制，可以粘贴给你选择的 AI 工具。";
        } catch { promptFeedback.textContent = "请先生成提示词，或在剪贴板不可用时手动选择复制。"; }
      });
      copyGenerated.disabled = true;
      actions.append(generate, copyGenerated);
      promptOutput.hidden = true;
      panel.append(form, actions, promptOutput, promptFeedback);
      panel.append(node("p", tag + "ai-prompt-privacy", "不要在提示词里填写密码、Token、私人数据或不应公开的信息。"));
    } else {
      panel.append(node("p", tag + "ai-kicker", "05 / BUILD LOOP"),
        node("h2", tag + "ai-section-title", "开发不是一句 Prompt，而是一轮轮可验证的协作"));
      const loop = node("div", tag + "ai-cycle");
      const flowNav = node("div", tag + "ai-cycle-nav");
      const meaning = node("article", tag + "ai-cycle-meaning");
      const meaningTitle = node("h3", tag + "ai-cycle-meaning__title");
      const meaningCopy = node("p", tag + "ai-cycle-meaning__copy");
      const detailCallout = node("p", tag + "ai-cycle-safety");
      meaning.append(node("span", tag + "ai-cycle-meaning__number"), meaningTitle, meaningCopy, detailCallout);
      DEVELOPMENT_CYCLE.forEach((item, index) => {
        const buttonNode = button(String(index + 1).padStart(2, "0") + " · " + item.title, tag + "ai-cycle-node", () => {
          state.setCycleStep(index);
          renderCycle();
        });
        buttonNode.setAttribute("aria-current", "false");
        flowNav.append(buttonNode);
      });
      loop.append(flowNav, meaning);
      panel.append(loop);
      function renderCycle(): void {
        const item = DEVELOPMENT_CYCLE[state.cycleStep];
        const nodes = [...flowNav.querySelectorAll<HTMLButtonElement>("button")];
        nodes.forEach((buttonNode, index) => {
          buttonNode.setAttribute("aria-current", String(index === state.cycleStep));
          buttonNode.classList.toggle(tag + "ai-cycle-node--active", index === state.cycleStep);
        });
        meaning.querySelector<HTMLElement>("." + tag + "ai-cycle-meaning__number")!.textContent = "STAGE " + String(state.cycleStep + 1).padStart(2, "0");
        meaningTitle.textContent = item.title;
        meaningCopy.textContent = item.detail;
        detailCallout.textContent = state.cycleStep === 3 || state.cycleStep === 4
          ? "检查：重要修改前可用 Git 保存版本。AI 说“完成”不等于程序真的可用。"
          : state.cycleStep === 5
            ? "反馈：描述复现步骤、观察结果和期望行为，帮助下一轮聚焦问题。"
            : "安全：不要把密码、Token 或私人数据交给不可信工具；不要盲目执行不理解的终端命令。";
      }
      renderCycle();
    }
  }
  renderModule();
  return section;
}

function createFinalChallengeChapter(): HTMLElement {
  const state = new FinalChallengeState();
  const section = node("section", tag + "final-lesson");
  const heading = node("h1", tag + "final-title", "Vibe Coding 最终挑战");
  heading.id = "final-heading";
  heading.tabIndex = -1;
  section.setAttribute("aria-labelledby", heading.id);
  section.append(node("p", tag + "eyebrow", "CHAPTER 07 / THE FINAL QUEST"),
    heading,
    node("p", tag + "final-lead", "把想法变成一个小作品：和 AI 一起做、自己运行检查，用 Git 保存成果，再把项目分享给别人。"));

  const safety = node("aside", tag + "final-safety");
  safety.append(node("strong", undefined, "你的项目由你掌控。"),
    node("span", undefined, "本章只提供指导和本地自检，不会调用 AI、修改电脑文件、访问 GitHub API 或替你创建仓库。"));
  section.append(safety);

  const progressPanel = node("div", tag + "final-progress-panel");
  const progressHead = node("div", tag + "final-progress-head");
  const progressTitle = node("strong", undefined, "最终挑战进度");
  const progressCount = node("span", tag + "final-progress-count");
  progressHead.append(progressTitle, progressCount);
  const progress = node("div", tag + "final-progress");
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "最终挑战已完成任务节点");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", String(FINAL_NODES.length));
  const progressFill = node("span");
  progress.append(progressFill);
  progressPanel.append(progressHead, progress);

  const nodeNav = node("nav", tag + "final-node-map");
  nodeNav.setAttribute("aria-label", "最终挑战五个任务节点");
  const nodeButtons = FINAL_NODES.map((item, index) => {
    const navButton = button("", tag + "final-node", () => { state.activeNode = index; update(); });
    navButton.setAttribute("aria-label", "节点 " + (index + 1) + "：" + item.title + "。 " + item.short);
    nodeNav.append(navButton);
    return navButton;
  });
  progressPanel.append(nodeNav);
  section.append(progressPanel);

  const modulePanel = node("section", tag + "final-panel");
  modulePanel.setAttribute("aria-live", "polite");
  section.append(modulePanel);
  const navigation = node("div", tag + "final-nav");
  const back = button("← 上一节点", tag + "button " + tag + "button--ghost", () => { state.activeNode = Math.max(0, state.activeNode - 1); update(); });
  const forward = button("下一节点 →", tag + "button " + tag + "button--primary", () => { state.activeNode = Math.min(FINAL_NODES.length - 1, state.activeNode + 1); update(); });
  const reset = button("重置本地自检", tag + "button " + tag + "button--reset", () => { state.reset(); update(); });
  navigation.append(back, forward, reset);
  section.append(navigation);

  const finish = node("section", tag + "final-finish");
  finish.setAttribute("aria-live", "polite");
  section.append(finish);

  function renderNode(): void {
    modulePanel.replaceChildren();
    const current = FINAL_NODES[state.activeNode];
    modulePanel.append(node("p", tag + "final-kicker", "QUEST NODE 0" + (state.activeNode + 1) + " / 05"),
      node("h2", tag + "final-section-title", current.title),
      node("p", tag + "final-section-lead", current.short));

    if (state.activeNode === 0) {
      modulePanel.append(node("p", tag + "final-hint", "选一个够小、能在课堂时间里完成的起点。预设只是灵感，也可以把自己的创意写下来。"));
      const grid = node("div", tag + "final-project-grid");
      PROJECT_IDEAS.forEach((idea) => {
        const card = button("", tag + "final-project" + (state.selectedIdea === idea.id ? " " + tag + "final-project--selected" : ""), () => {
          state.chooseIdea(idea.id);
          update();
        });
        card.setAttribute("aria-pressed", String(state.selectedIdea === idea.id));
        card.append(node("span", tag + "final-project__tag", "IDEA / " + idea.id.toUpperCase()),
          node("strong", tag + "final-project__title", idea.title),
          node("span", tag + "final-project__summary", idea.summary),
          node("span", tag + "final-project__requirement", "起步要求：" + idea.minimum),
          node("span", tag + "final-project__extension", "可选扩展：" + idea.extension));
        grid.append(card);
      });
      const customCard = node("div", tag + "final-custom");
      const customLabel = node("label", tag + "final-field-label", "或者，写下你自己的创意");
      const customInput = node("input", tag + "final-input");
      customInput.type = "text";
      customInput.maxLength = 120;
      customInput.placeholder = "例如：一张能随机抽取校园散步路线的地图";
      customInput.value = state.customIdea;
      customInput.addEventListener("input", () => {
        state.chooseIdea("custom");
        state.setCustomIdea(customInput.value);
        confirm.disabled = !customInput.value.trim();
        updateStatus();
      });
      customLabel.append(customInput);
      const confirm = button("确认这个项目", tag + "button " + tag + "button--primary", () => {
        state.confirmProject();
        update();
      });
      confirm.disabled = state.selectedIdea === "custom" && !state.customIdea.trim();
      const selectedIdea = state.selectedIdea === "custom"
        ? state.customIdea.trim()
        : PROJECT_IDEAS.find((idea) => idea.id === state.selectedIdea)?.title || "";
      customCard.append(customLabel, confirm);
      if (selectedIdea) customCard.append(node("p", tag + "final-selected-note", "当前选择：" + selectedIdea));
      modulePanel.append(grid, customCard);
    } else if (state.activeNode === 1) {
      modulePanel.append(node("p", tag + "final-hint", "用自己的话填写目标、用户、功能、风格和验收方式。内容会在浏览器中组合，不会发给模型。"));
      const promptForm = node("div", tag + "final-prompt-form");
      FINAL_PROMPT_FIELDS.forEach((field) => {
        const label = node("label", tag + "final-field-label", field.label);
        const input = node("textarea", tag + "final-textarea");
        input.rows = field.id === "features" || field.id === "acceptance" ? 3 : 2;
        input.placeholder = field.placeholder;
        input.value = state.prompt[field.id];
        input.addEventListener("input", () => {
          state.setPromptField(field.id, input.value);
          promptOutput.hidden = true;
          copyPromptButton.disabled = true;
          promptFeedback.textContent = "";
          updateStatus();
        });
        label.append(input);
        promptForm.append(label);
      });
      const promptActions = node("div", tag + "final-actions");
      const generatePrompt = button("生成开发需求", tag + "button " + tag + "button--primary", () => {
        promptOutput.textContent = state.createDevelopmentPrompt();
        promptOutput.hidden = false;
        copyPromptButton.disabled = false;
        promptFeedback.textContent = "这是根据表单整理的提示词，不是 AI 生成的软件。";
        updateStatus();
      });
      const copyPromptButton = button("复制开发需求", tag + "button " + tag + "button--copy", async () => {
        try {
          await copyFinalText(state.generatedPrompt, (text) => navigator.clipboard.writeText(text));
          promptFeedback.textContent = "已复制。接下来可以粘贴到你选择的 Codex、Claude Code 或其他工具。";
        } catch { promptFeedback.textContent = "请先生成需求；若剪贴板不可用，可以手动选择文本复制。"; }
      });
      copyPromptButton.disabled = !state.generatedPrompt;
      promptActions.append(generatePrompt, copyPromptButton,
        button("恢复示例", tag + "button " + tag + "button--ghost", () => { state.restorePromptExample(); update(); }));
      const promptOutput = node("pre", tag + "final-output");
      promptOutput.hidden = !state.generatedPrompt;
      promptOutput.textContent = state.generatedPrompt;
      const promptFeedback = node("p", tag + "final-feedback");
      promptActions.append(promptFeedback);
      modulePanel.append(promptForm, promptActions, promptOutput,
        node("p", tag + "final-note", "不同工具的输入方式和权限不同。开始前先确认它会读取或修改哪些文件。"));
    } else if (state.activeNode === 2) {
      modulePanel.append(node("p", tag + "final-hint", "通用协作路线：先理解和查看，再小步修改、人工检查并运行。按你使用的工具调整具体操作。"));
      const workflow = node("div", tag + "final-workflow");
      const workflowStep = AI_BUILD_STEPS[state.workflowStep];
      workflow.append(node("span", tag + "final-workflow__number", "STEP " + String(state.workflowStep + 1).padStart(2, "0") + " / 06"),
        node("h3", tag + "final-workflow__title", workflowStep.title),
        node("p", tag + "final-workflow__detail", workflowStep.detail));
      const workflowNav = node("div", tag + "final-actions");
      workflowNav.append(
        button("上一步", tag + "button " + tag + "button--ghost", () => { state.previousWorkflowStep(); update(); }, { disabled: state.workflowStep === 0 }),
        button("下一步", tag + "button " + tag + "button--primary", () => { state.nextWorkflowStep(); update(); }, { disabled: state.workflowStep === AI_BUILD_STEPS.length - 1 }),
      );
      workflow.append(workflowNav);
      if (state.workflowStep === AI_BUILD_STEPS.length - 1) {
        workflow.append(button(state.workflowConfirmed ? "流程已确认" : "我已理解开发流程", tag + "button " + tag + "button--primary", () => {
          state.confirmWorkflow();
          update();
        }, { disabled: state.workflowConfirmed }));
      }
      modulePanel.append(workflow, node("p", tag + "final-note", "运行命令前先核对项目说明。AI 给出的命令也要先理解再执行；本页面不会替你运行任何命令。"));
    } else if (state.activeNode === 3) {
      modulePanel.append(node("p", tag + "final-hint", "亲自打开作品并操作，再逐项勾选。AI 说“完成”不代表项目已经通过检查。"));
      const checks = node("div", tag + "final-checks");
      FINAL_CHECK_ITEMS.forEach((item) => {
        const input = node("input");
        input.type = "checkbox";
        input.checked = state.checks[item.id];
        input.addEventListener("change", () => { state.toggleCheck(item.id); updateStatus(); });
        const label = node("label", tag + "final-check", item.label);
        label.prepend(input);
        checks.append(label);
      });
      modulePanel.append(checks, node("p", tag + "final-note", state.checksComplete
        ? "本地自检项目已勾选。若发现问题，描述具体的预期和实际结果，再进行下一轮迭代。"
        : "自检只记录你的选择，不会读取程序运行状态或控制台。"));

      const feedbackBox = node("section", tag + "final-feedback-box");
      feedbackBox.append(node("h3", tag + "final-subtitle", "反馈提示词生成器"));
      const feedbackForm = node("div", tag + "final-feedback-form");
      const fields = [
        ["issue", "遇到了什么问题", "例如：点完成后，任务还留在未完成列表。"],
        ["expected", "预期结果是什么", "例如：点击后任务应显示为完成。"],
        ["actual", "实际结果是什么", "例如：按钮变灰了，但任务文字没有变化。"],
      ] as const;
      fields.forEach(([key, labelText, placeholder]) => {
        const label = node("label", tag + "final-field-label", labelText);
        const input = node("textarea", tag + "final-textarea");
        input.rows = 2;
        input.placeholder = placeholder;
        input.value = state[key];
        input.addEventListener("input", () => {
          state.setIssueField(key, input.value);
          feedbackOutput.hidden = true;
          copyFeedbackButton.disabled = true;
        });
        label.append(input);
        feedbackForm.append(label);
      });
      const feedbackOutput = node("pre", tag + "final-output");
      feedbackOutput.hidden = !state.feedbackPrompt;
      feedbackOutput.textContent = state.feedbackPrompt;
      const feedbackMessage = node("p", tag + "final-feedback");
      const feedbackActions = node("div", tag + "final-actions");
      const makeFeedback = button("生成修改提示词", tag + "button " + tag + "button--primary", () => {
        feedbackOutput.textContent = state.createFeedbackPrompt();
        feedbackOutput.hidden = false;
        copyFeedbackButton.disabled = false;
      });
      const copyFeedbackButton = button("复制修改提示词", tag + "button " + tag + "button--copy", async () => {
        try {
          await copyFinalText(state.feedbackPrompt, (text) => navigator.clipboard.writeText(text));
          feedbackMessage.textContent = "已复制。请结合新一轮差异继续人工检查。";
        } catch { feedbackMessage.textContent = "请先生成提示词，或手动选择文本复制。"; }
      });
      copyFeedbackButton.disabled = !state.feedbackPrompt;
      feedbackActions.append(makeFeedback, copyFeedbackButton);
      feedbackBox.append(feedbackForm, feedbackActions, feedbackOutput, feedbackMessage);
      modulePanel.append(feedbackBox);
    } else {
      modulePanel.append(node("p", tag + "final-hint", "先保存一个可回看的稳定版本，再把项目放到自己新建的 GitHub 仓库。每一步都先核对目录、分支和远程仓库。"));
      const steps = node("ol", tag + "final-share-steps");
      [
        "在项目目录运行 git status，确认当前目录和待提交文件；阅读差异，排除密码、Token 和私人数据。",
        "使用 Git 保存稳定版本。先逐项暂存并查看 git status，再创建简短的 commit。",
        "在 GitHub 创建自己的新仓库。若项目已经连着其他远程仓库，不要覆盖或盲目改写它。",
        "按 GitHub 新仓库页面显示的说明配置远程地址并 Push。先检查 git remote -v 和当前分支；不要使用强制推送。",
        "添加 README.md，写清项目用途、主要功能和经核对的运行方法。",
        "填写你的 GitHub 仓库或作品演示链接。纯静态网页可以考虑 GitHub Pages；需要服务器或后端的项目不能保证直接部署到 Pages。",
      ].forEach((copy) => steps.append(node("li", undefined, copy)));
      modulePanel.append(steps);
      const commands = [
        ["查看目录状态", "git status"],
        ["查看远程地址", "git remote -v"],
        ["暂存当前项目改动（运行前先检查文件）", "git add ."],
        ["创建本地版本", 'git commit -m "Finish my first project"'],
        ["示例：推送 main 到 origin", "git push -u origin main"],
      ] as const;
      const commandList = node("div", tag + "final-commands");
      commands.forEach(([label, command]) => {
        const row = node("div", tag + "final-command");
        row.append(node("span", tag + "final-command__label", label), node("code", tag + "final-command__code", command));
        const message = node("span", tag + "final-command__feedback");
        const copy = button("复制", tag + "button " + tag + "button--copy", async () => {
          try {
            await copyFinalText(command, (text) => navigator.clipboard.writeText(text));
            message.textContent = "已复制，执行前请核对目录、远程和分支。";
          } catch { message.textContent = "剪贴板不可用，请手动选择复制。"; }
        });
        row.append(copy, message);
        commandList.append(row);
      });
      modulePanel.append(commandList);
      const newRepo = node("a", tag + "final-link", "在 GitHub 创建新仓库（手动操作）");
      newRepo.href = "https://github.com/new";
      newRepo.target = "_blank";
      newRepo.rel = "noopener noreferrer";
      modulePanel.append(newRepo);

      const urlLabel = node("label", tag + "final-field-label", "作品链接（仅保存在本页，不会向 GitHub 验证）");
      const urlInput = node("input", tag + "final-input");
      urlInput.type = "url";
      urlInput.placeholder = "https://github.com/你的用户名/你的项目";
      urlInput.value = state.projectUrl;
      urlInput.addEventListener("input", () => { state.setProjectUrl(urlInput.value); updateStatus(); });
      urlLabel.append(urlInput);
      modulePanel.append(urlLabel);

      const deliverables = node("div", tag + "final-deliverables");
      FINAL_DELIVERABLE_ITEMS.forEach((item) => {
        const input = node("input");
        input.type = "checkbox";
        input.checked = state.deliverables[item.id];
        input.disabled = item.id === "linkReady";
        input.addEventListener("change", () => { state.toggleDeliverable(item.id); updateStatus(); });
        const label = node("label", tag + "final-check", item.label);
        label.prepend(input);
        deliverables.append(label);
      });
      modulePanel.append(deliverables,
        node("p", tag + "final-note", "最终提交建议包含：GitHub 仓库链接、可选的在线演示链接、项目用途与功能、经核对的运行方法，以及一个开发中遇到并解决的问题。通用命令只是示例；Push 前先确认当前分支和远程地址，不要盲目覆盖远程记录。"));
    }
  }

  function updateStatus(): void {
    const done = state.completedNodes;
    nodeButtons.forEach((navButton, index) => {
      navButton.replaceChildren(
        node("span", tag + "final-node__number", "0" + (index + 1)),
        node("strong", tag + "final-node__title", FINAL_NODES[index].title),
        node("span", tag + "final-node__state", done[index] ? "已完成 ✓" : FINAL_NODES[index].short),
      );
      navButton.classList.toggle(tag + "final-node--current", state.activeNode === index);
      navButton.classList.toggle(tag + "final-node--done", done[index]);
      navButton.setAttribute("aria-current", state.activeNode === index ? "step" : "false");
    });
    progressCount.textContent = state.completedNodeCount + " / 5 节点";
    progress.setAttribute("aria-valuenow", String(state.completedNodeCount));
    progressFill.style.width = (state.completedNodeCount / FINAL_NODES.length * 100) + "%";
    forward.disabled = state.activeNode === FINAL_NODES.length - 1;
    back.disabled = state.activeNode === 0;
    finish.replaceChildren();
    if (state.isComplete) {
      finish.classList.add(tag + "final-finish--complete");
      finish.append(node("span", tag + "final-badge", "✦"),
        node("h2", tag + "final-finish__title", "冒险通关！"),
        node("p", tag + "final-finish__copy", "五个任务节点已由你在浏览器中手动完成自检。现在可以整理作品链接和最终提交材料。"),
        node("p", tag + "final-finish__url", state.projectUrl));
      finish.animate?.([{ transform: "translateY(8px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 420, easing: "ease-out" });
    } else {
      finish.classList.remove(tag + "final-finish--complete");
      finish.append(node("p", tag + "final-finish__pending", "完成五个节点后，将在这里点亮你的通关徽章。"));
    }
    finish.append(node("p", tag + "final-finish__disclaimer", "本地学习自检不代表老师已审核作品，也不代表 GitHub 仓库或作品链接已成功创建。网页不会验证链接、仓库状态或 Pages 部署。"));
  }

  function update(): void {
    updateStatus();
    renderNode();
  }

  update();
  return section;
}

function createPlaceholder(chapter: Chapter, index: number): HTMLElement {
  const section = node("section", `${tag}placeholder`);
  section.setAttribute("aria-labelledby", "chapter-heading");
  section.append(node("p", `${tag}eyebrow`, `CHAPTER ${String(index + 1).padStart(2, "0")} / 07 · 后续关卡`));
  const heading = node("h1", `${tag}placeholder__title`, chapter.title);
  heading.id = "chapter-heading";
  heading.tabIndex = -1;
  section.append(heading, node("p", `${tag}placeholder__lead`, chapter.theme));
  const panel = node("div", `${tag}placeholder-panel`);
  panel.append(node("span", `${tag}placeholder-panel__icon`, "◈"), node("p", `${tag}placeholder-panel__label`, "INTERACTIVE CONTENT / 互动内容"), node("h2", undefined, "互动内容将在后续阶段开发"), node("p", `${tag}placeholder-panel__copy`, "章节入口与导航已就绪。本阶段先搭好课件框架，具体讲解、演示和练习会在后续阶段逐关制作。"));
  section.append(panel);
  return section;
}

function createNavigation(index: number): HTMLElement {
  const nav = node("nav", `${tag}slide-nav`);
  nav.setAttribute("aria-label", "章节导航");
  nav.append(button("← 上一页", `${tag}button ${tag}button--ghost`, () => go({ view: "chapter", chapter: index - 1 }), { disabled: index === 0, shortcut: "ArrowLeft" }));
  nav.append(button("返回课程地图", `${tag}button ${tag}button--map`, () => go({ view: "map", chapter: 0 })));
  nav.append(button("下一页 →", `${tag}button ${tag}button--primary`, () => go({ view: "chapter", chapter: index + 1 }), { disabled: index === chapters.length - 1, shortcut: "ArrowRight" }));
  return nav;
}

let shell: HTMLElement;
let main: HTMLElement;
let status: HTMLElement;
let progress: HTMLElement;
let progressValue: HTMLElement;
let fullscreenButton: HTMLButtonElement;

function updateFullscreenButton(): void {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = active ? "退出演示" : "全屏演示";
  fullscreenButton.setAttribute("aria-label", active ? "退出全屏演示" : "进入全屏演示");
}

function focusHeading(): void {
  requestAnimationFrame(() => main.querySelector<HTMLElement>("h1")?.focus());
}

function render(): void {
  const inChapter = route.view === "chapter";
  status.textContent = route.view === "welcome" ? "新手启程" : route.view === "map" ? "课程地图" : `第 ${String(route.chapter + 1).padStart(2, "0")} 章 · ${chapters[route.chapter].title}`;
  progress.setAttribute("aria-valuenow", String(inChapter ? route.chapter + 1 : 0));
  progressValue.style.width = `${inChapter ? ((route.chapter + 1) / chapters.length) * 100 : 0}%`;
  main.replaceChildren();

  if (route.view === "welcome") {
    main.append(createWelcome());
  } else if (route.view === "map") {
    main.append(createMap());
  } else {
    const index = Math.max(0, Math.min(route.chapter, chapters.length - 1));
    route.chapter = index;
    const lesson = index === 0
      ? createPrologue()
      : index === 1
        ? createMarkdownChapter()
        : index === 2
          ? createGitSimulatorChapter()
          : index === 3
            ? createCollaborationChapter()
            : index === 4
              ? createGuildTaskChapter()
              : index === 5
                ? createAIAgentChapter()
                : index === 6
                  ? createFinalChallengeChapter()
          : createPlaceholder(chapters[index], index);
    main.append(lesson, createNavigation(index));
  }
  focusHeading();
}

if (app) {
  shell = node("div", `${tag}shell`);
  const skip = node("a", `${tag}skip-link`, "跳到课程内容");
  skip.href = "#course-content";
  const topbar = node("header", `${tag}topbar`);
  const right = node("div", `${tag}topbar__right`);
  const chapterStatus = node("span", `${tag}topbar__status`, "新手启程");
  const progressWrap = node("div", `${tag}progress`);
  progressWrap.setAttribute("role", "progressbar");
  progressWrap.setAttribute("aria-label", "课程进度");
  progressWrap.setAttribute("aria-valuemin", "0");
  progressWrap.setAttribute("aria-valuemax", String(chapters.length));
  progress = progressWrap;
  progressValue = node("span", `${tag}progress__value`);
  progressWrap.append(progressValue);
  fullscreenButton = button("全屏演示", `${tag}button ${tag}button--top`, () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen().catch(() => { chapterStatus.textContent = "浏览器未能开启全屏，请使用 F11"; });
  });
  fullscreenButton.disabled = !document.fullscreenEnabled;
  if (fullscreenButton.disabled) fullscreenButton.title = "当前浏览器不支持全屏模式";
  right.append(chapterStatus, progressWrap, fullscreenButton);
  status = chapterStatus;
  topbar.append(createGuildNavigation("course"), right);

  main = node("main", `${tag}main`);
  main.id = "course-content";
  main.tabIndex = -1;
  const footer = node("footer", `${tag}footer`);
  footer.append(node("span", `${tag}footer__brand`, "GUILD LEARNING SYSTEM"));
  const keyboard = node("span", `${tag}footer__keys`);
  keyboard.append(node("kbd", undefined, "←"), document.createTextNode(" / "), node("kbd", undefined, "→"), document.createTextNode(" 翻页　·　"), node("kbd", undefined, "Esc"), document.createTextNode(" 退出全屏"));
  footer.append(keyboard);
  shell.append(skip, topbar, main, footer);
  app.replaceChildren(shell);
  updateFullscreenButton();
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  window.addEventListener("popstate", () => { route = routeFromLocation(); render(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.fullscreenElement) {
      event.preventDefault();
      void document.exitFullscreen();
      return;
    }
    const target = event.target;
    const slideKeysBlocked = target instanceof HTMLElement && (
      target.isContentEditable
      || Boolean(target.closest("textarea, input, select, [contenteditable='true'], .guild-navigation"))
    );
    const direction = slideDirection(event.key, slideKeysBlocked, event.altKey || event.ctrlKey || event.metaKey);
    if (route.view !== "chapter" || direction === 0) return;
    if (direction > 0 && route.chapter < chapters.length - 1) {
      event.preventDefault();
      go({ view: "chapter", chapter: route.chapter + 1 });
    } else if (direction < 0 && route.chapter > 0) {
      event.preventDefault();
      go({ view: "chapter", chapter: route.chapter - 1 });
    }
  });
  render();
}
