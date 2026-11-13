import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECKLIST_ITEMS,
  GITHUB_PAGES_URL,
  GITHUB_REPOSITORY_URL,
  GuildTaskState,
  TERMINAL_STEPS,
  WEB_STEPS,
  copyGuideText,
} from "../src/course/guild-task.ts";

test("入会教程指向真实仓库和 GitHub Pages 留言墙", () => {
  assert.equal(GITHUB_REPOSITORY_URL, "https://github.com/Li-Jinbu/vibecoding-guild");
  assert.equal(GITHUB_PAGES_URL, "https://li-jinbu.github.io/vibecoding-guild/");
});

test("网页路线与进阶路线可切换，并分别保留步骤位置", () => {
  const state = new GuildTaskState();
  state.goTo(3);
  state.setRoute("terminal");
  state.goTo(2);
  assert.equal(state.route, "terminal");
  assert.equal(state.currentStep, 2);
  state.setRoute("web");
  assert.equal(state.currentStep, 3);
  assert.match(WEB_STEPS[0].title, /Fork/);
  assert.match(TERMINAL_STEPS[1].command, /git clone/);
});

test("路线步骤导航和进度百分比有边界", () => {
  const state = new GuildTaskState();
  state.previous();
  assert.equal(state.currentStep, 0);
  state.next();
  assert.equal(state.currentStep, 1);
  state.goTo(100);
  assert.equal(state.currentStep, 1);
  state.goTo(WEB_STEPS.length - 1);
  assert.equal(state.progress, 100);
  state.setRoute("terminal");
  assert.equal(state.currentStep, 0);
  assert.equal(state.progress, Math.round(100 / TERMINAL_STEPS.length));
});

test("进阶命令包括真实教学所需的 Git 步骤且命令复制工具转交文本", async () => {
  const commands = TERMINAL_STEPS.map((step) => step.command).join("\n");
  for (const command of ["git clone", "git switch -c", "git add", "git commit", "git push"]) {
    assert.ok(commands.includes(command), "缺少命令：" + command);
  }
  let copied = "";
  await copyGuideText(TERMINAL_STEPS[1].command, async (text) => { copied = text; });
  assert.equal(copied, TERMINAL_STEPS[1].command);
  await assert.rejects(() => copyGuideText(" ", async () => {}), /没有可复制/);
});

test("本地自检勾选和清空工作正常，且覆盖完整验收项", () => {
  const state = new GuildTaskState();
  assert.equal(CHECKLIST_ITEMS.length, 7);
  assert.equal(state.checklistProgress, 0);
  state.toggleChecklist(0);
  state.toggleChecklist(5);
  assert.equal(state.checklistProgress, 2);
  state.toggleChecklist(0);
  assert.equal(state.checklistProgress, 1);
  state.toggleChecklist(-1);
  assert.equal(state.checklistProgress, 1);
  state.resetChecklist();
  assert.equal(state.checklistProgress, 0);
  assert.ok(CHECKLIST_ITEMS.some((item) => item.includes("管理员已审核并合并")));
});

test("真实仓库规范在教程中有可发现的文档内容，主页链接按外部安全属性处理", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/course/main.ts", import.meta.url), "utf8");
  assert.match(source, /messages\/.*\.md/);
  assert.match(source, /10 KB/);
  assert.match(source, /base repository/);
  assert.match(source, /head repository/);
  assert.match(source, /author.*github/s);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /noopener noreferrer/);
});

test("第五章路由被启用，原有章节路由仍保留", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/course/main.ts", import.meta.url), "utf8");
  assert.match(source, /index === 4[\s\S]{0,100}createGuildTaskChapter/);
  for (const chapter of ["createPrologue", "createMarkdownChapter", "createGitSimulatorChapter", "createCollaborationChapter"]) {
    assert.match(source, new RegExp(chapter));
  }
  const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /repositoryName/);
  assert.match(vite, /base,/);
});
