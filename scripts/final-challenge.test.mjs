import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AI_BUILD_STEPS,
  FINAL_CHECK_ITEMS,
  FINAL_DELIVERABLE_ITEMS,
  FINAL_NODES,
  PROJECT_IDEAS,
  FinalChallengeState,
  copyFinalText,
} from "../src/course/final-challenge.ts";

test("五个任务节点与四种项目灵感完整，支持预设和自定义创意", () => {
  const state = new FinalChallengeState();
  assert.equal(FINAL_NODES.length, 5);
  assert.equal(PROJECT_IDEAS.length, 4);
  assert.equal(state.chooseIdea("todo"), true);
  assert.equal(state.projectName, "待办事项工具");
  assert.equal(state.confirmProject(), true);
  state.chooseIdea("custom");
  state.setCustomIdea("校园寻宝地图");
  assert.equal(state.projectName, "校园寻宝地图");
  assert.equal(state.confirmProject(), true);
  assert.equal(state.chooseIdea("unknown"), false);
});

test("开发需求提示词组合所有字段，可编辑、恢复示例并通过注入接口复制", async () => {
  const state = new FinalChallengeState();
  state.chooseIdea("profile");
  state.setPromptField("idea", "制作我的作品集");
  state.setPromptField("audience", "实习招聘者");
  const prompt = state.createDevelopmentPrompt();
  assert.match(prompt, /个人介绍网页/);
  assert.match(prompt, /制作我的作品集/);
  assert.match(prompt, /实习招聘者/);
  assert.match(prompt, /验收标准/);
  let copied = "";
  await copyFinalText(prompt, async (value) => { copied = value; });
  assert.equal(copied, prompt);
  state.restorePromptExample();
  assert.equal(state.generatedPrompt, "");
  assert.match(state.prompt.idea, /新生/);
  await assert.rejects(copyFinalText("  ", async () => {}), /没有可复制的内容/);
});

test("反馈提示词包含问题、预期和实际结果，且输入更新会使旧结果失效", () => {
  const state = new FinalChallengeState();
  state.setIssueField("issue", "页面按钮无响应");
  state.setIssueField("expected", "点击后显示结果");
  state.setIssueField("actual", "点击后没有变化");
  const prompt = state.createFeedbackPrompt();
  assert.match(prompt, /页面按钮无响应/);
  assert.match(prompt, /预期结果：点击后显示结果/);
  assert.match(prompt, /实际结果：点击后没有变化/);
  state.setIssueField("issue", "更新后的问题");
  assert.equal(state.feedbackPrompt, "");
});

test("流程演示有边界，只在末步确认后完成该节点", () => {
  const state = new FinalChallengeState();
  assert.equal(AI_BUILD_STEPS.length, 6);
  assert.equal(state.confirmWorkflow(), false);
  state.previousWorkflowStep();
  assert.equal(state.workflowStep, 0);
  for (let index = 1; index < AI_BUILD_STEPS.length; index += 1) state.nextWorkflowStep();
  state.nextWorkflowStep();
  assert.equal(state.workflowStep, AI_BUILD_STEPS.length - 1);
  assert.equal(state.confirmWorkflow(), true);
  assert.equal(state.completedNodes[2], true);
});

test("验收清单和最终材料状态决定通关，不验证链接真实性", () => {
  const state = new FinalChallengeState();
  state.chooseIdea("game"); state.confirmProject();
  state.createDevelopmentPrompt();
  state.workflowStep = AI_BUILD_STEPS.length - 1; state.confirmWorkflow();
  for (const { id } of FINAL_CHECK_ITEMS) state.toggleCheck(id);
  assert.equal(state.checksComplete, true);
  for (const { id } of FINAL_DELIVERABLE_ITEMS) {
    if (id !== "linkReady") state.toggleDeliverable(id);
  }
  state.setProjectUrl("not verified by GitHub");
  assert.equal(state.isComplete, true);
  assert.equal(state.completedNodeCount, 5);
  state.setProjectUrl("");
  assert.equal(state.isComplete, false);
});

test("重置恢复全部五节点初始状态", () => {
  const state = new FinalChallengeState();
  state.chooseIdea("creative"); state.confirmProject();
  state.workflowStep = 3;
  state.setProjectUrl("https://example.invalid/project");
  state.reset();
  assert.equal(state.activeNode, 0);
  assert.deepEqual(state.completedNodes, [false, false, false, false, false]);
  assert.equal(state.projectUrl, "");
  assert.equal(state.workflowStep, 0);
});

test("第七章路由接入且旧章节和窄屏布局保留", async () => {
  const [main, style] = await Promise.all([
    readFile(new URL("../src/course/main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/course/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(main, /index === 5[\s\S]{0,90}createAIAgentChapter\(\)/);
  assert.match(main, /index === 6[\s\S]{0,90}createFinalChallengeChapter\(\)/);
  assert.match(main, /function createFinalChallengeChapter\(\)/);
  assert.match(style, /\.course-final-node-map/);
  assert.match(style, /@media \(max-width: 760px\)[\s\S]*\.course-final-project-grid/);
});
