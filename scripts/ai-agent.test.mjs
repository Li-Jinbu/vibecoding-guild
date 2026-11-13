import test from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_STEPS,
  AI_LESSON_MODULES,
  AIAgentLessonState,
  DEVELOPMENT_CYCLE,
  PROMPT_FIELDS,
  copyPrompt,
} from "../src/course/ai-agent.ts";

test("章节包含五个清晰可切换的 AI 教学模块", () => {
  const state = new AIAgentLessonState();
  assert.deepEqual(AI_LESSON_MODULES.map((item) => item.id), ["teammate", "tools", "comparison", "prompt", "cycle"]);
  state.setModule("prompt");
  assert.equal(state.activeModule, "prompt");
});

test("Agent 演示逐步推进、停止在边界并可重新开始", () => {
  const state = new AIAgentLessonState();
  assert.equal(AGENT_STEPS.length, 5);
  state.previousAgentStep();
  assert.equal(state.agentStep, 0);
  state.nextAgentStep();
  state.nextAgentStep();
  assert.equal(state.agentStep, 2);
  state.agentStep = AGENT_STEPS.length - 1;
  state.nextAgentStep();
  assert.equal(state.agentStep, AGENT_STEPS.length - 1);
  state.resetAgent();
  assert.equal(state.agentStep, 0);
});

test("Prompt 训练营保存六类学生输入并组合为可复用提示词", () => {
  const state = new AIAgentLessonState();
  assert.equal(PROMPT_FIELDS.length, 6);
  state.setPromptField("purpose", "介绍我的学习项目");
  state.setPromptField("audience", "课程同学");
  state.setPromptField("features", "个人介绍、作品链接");
  state.setPromptField("style", "深蓝简洁");
  state.setPromptField("constraints", "原生 CSS、适配手机");
  state.setPromptField("acceptance", "构建通过且页面无横向滚动");
  const result = state.createPrompt();
  for (const value of ["介绍我的学习项目", "课程同学", "个人介绍、作品链接", "深蓝简洁", "原生 CSS、适配手机", "构建通过且页面无横向滚动"]) {
    assert.ok(result.includes(value));
  }
  assert.match(result, /准备修改的文件/);
  assert.match(result, /测试结果/);
});

test("未填写的需求保留提示，不作关键词评分或伪造模型回答", () => {
  const result = new AIAgentLessonState().createPrompt();
  assert.equal((result.match(/【请补充】/g) || []).length, 6);
  assert.doesNotMatch(result, /评分|得分|生成代码/);
});

test("可点击的开发循环选择有效节点并拒绝越界索引", () => {
  const state = new AIAgentLessonState();
  assert.equal(DEVELOPMENT_CYCLE.length, 7);
  state.setCycleStep(4);
  assert.equal(state.cycleStep, 4);
  state.setCycleStep(99);
  assert.equal(state.cycleStep, 4);
});

test("复制辅助函数调用浏览器提供的剪贴板接口并拒绝空内容", async () => {
  const expected = new AIAgentLessonState().createPrompt();
  let copied = "";
  await copyPrompt(expected, async (value) => { copied = value; });
  assert.equal(copied, expected);
  await assert.rejects(() => copyPrompt("", async () => {}), /请先生成提示词/);
});

test("第六章路由已启用，旧章节与响应式布局保留", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/course/main.ts", import.meta.url), "utf8");
  assert.match(source, /index === 5[\s\S]{0,100}createAIAgentChapter/);
  for (const chapter of ["createPrologue", "createMarkdownChapter", "createGitSimulatorChapter", "createCollaborationChapter", "createGuildTaskChapter"]) {
    assert.match(source, new RegExp(chapter));
  }
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /stopPropagation\(\)/);
  const css = await readFile(new URL("../src/course/style.css", import.meta.url), "utf8");
  assert.match(css, /course-ai-compare/);
  assert.match(css, /@media \(max-width: 480px\)/);
});
