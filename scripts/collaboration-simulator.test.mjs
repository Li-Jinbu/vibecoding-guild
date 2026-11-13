import test from "node:test";
import assert from "node:assert/strict";
import { CollaborationSimulator, DEFAULT_PULL_REQUEST, UPSTREAM } from "../src/course/collaboration-simulator.ts";

function preparePR(sim) {
  sim.fork();
  sim.clone();
  sim.createBranch();
  sim.editMessage(sim.workingMessage + "\n\n我期待学习协作开发。");
  sim.commit();
  sim.push();
}

test("Fork 创建贡献者远程副本，不会直接修改原始仓库", () => {
  const sim = new CollaborationSimulator();
  assert.equal(sim.fork().ok, true);
  assert.equal(sim.forkCreated, true);
  assert.equal(sim.upstreamHasMessage, false);
});

test("Clone 必须在 Fork 后执行并建立本地关系", () => {
  const sim = new CollaborationSimulator();
  assert.equal(sim.clone().ok, false);
  sim.fork();
  assert.equal(sim.clone().ok, true);
  assert.equal(sim.cloned, true);
});

test("Branch 是 Clone 后本地仓库内的开发线", () => {
  const sim = new CollaborationSimulator();
  assert.equal(sim.createBranch().ok, false);
  sim.fork();
  sim.clone();
  assert.equal(sim.createBranch("add-my-message").ok, true);
  assert.equal(sim.branchName, "add-my-message");
});

test("修改、Commit、Push 依次更新本地提交与 Fork 远程分支", () => {
  const sim = new CollaborationSimulator();
  sim.fork(); sim.clone(); sim.createBranch();
  sim.editMessage("# 我的留言\n学习协作");
  assert.equal(sim.commit("Add message").ok, true);
  assert.equal(sim.localCommit, true);
  assert.equal(sim.pushed, false);
  assert.equal(sim.push().ok, true);
  assert.equal(sim.pushed, true);
  assert.equal(sim.upstreamHasMessage, false);
});

test("PR 检查目标仓库，正确配置只创建请求而不修改原始 main", () => {
  const sim = new CollaborationSimulator();
  preparePR(sim);
  sim.setPullRequestConfig({ ...DEFAULT_PULL_REQUEST, baseRepository: "contributor/vibecoding-guild" });
  assert.equal(sim.openPullRequest().ok, false);
  sim.setPullRequestConfig({ ...DEFAULT_PULL_REQUEST });
  assert.equal(sim.openPullRequest().ok, true);
  assert.equal(sim.prConfig.baseRepository, UPSTREAM);
  assert.equal(sim.prStatus, "open");
  assert.equal(sim.upstreamHasMessage, false);
});

test("管理员可以 Request changes，PR 进入待修改状态", () => {
  const sim = new CollaborationSimulator();
  preparePR(sim); sim.openPullRequest(); sim.role = "maintainer";
  assert.equal(sim.requestChanges("请补充学习目标。").ok, true);
  assert.equal(sim.prStatus, "changes-requested");
  assert.match(sim.reviewComment, /学习目标/);
});

test("贡献者根据意见更新分支，新提交会更新原 PR", () => {
  const sim = new CollaborationSimulator();
  preparePR(sim); sim.openPullRequest(); sim.role = "maintainer"; sim.requestChanges();
  sim.role = "contributor";
  const updated = sim.updateAfterReview(sim.workingMessage + "\n补充的学习目标");
  assert.equal(updated.ok, true);
  assert.equal(sim.prStatus, "open");
  assert.equal(sim.prUpdateCount, 1);
  assert.equal(sim.pushed, true);
});

test("管理员批准不等于 Merge，原始仓库在合并前仍没有留言", () => {
  const sim = new CollaborationSimulator();
  preparePR(sim); sim.openPullRequest(); sim.role = "maintainer";
  assert.equal(sim.approve().ok, true);
  assert.equal(sim.prStatus, "approved");
  assert.equal(sim.upstreamHasMessage, false);
});

test("Merge 后才将留言计入原始仓库 main", () => {
  const sim = new CollaborationSimulator();
  preparePR(sim); sim.openPullRequest(); sim.role = "maintainer"; sim.approve();
  assert.equal(sim.merge().ok, true);
  assert.equal(sim.prStatus, "merged");
  assert.equal(sim.upstreamHasMessage, true);
});

test("错误场景：没有 Fork 时尝试 Push 到 upstream 会被拒绝", () => {
  const sim = new CollaborationSimulator();
  const result = sim.push("upstream");
  assert.equal(result.ok, false);
  assert.match(result.detail, /不能直接 Push/);
});

test("错误场景：未 Commit 的修改不能 Push", () => {
  const sim = new CollaborationSimulator();
  sim.fork(); sim.clone(); sim.createBranch(); sim.editMessage("# 未提交");
  const result = sim.push();
  assert.equal(result.ok, false);
  assert.match(result.detail, /不会自动上传未提交/);
});

test("PR 目标分支配置错误时拒绝创建", () => {
  const sim = new CollaborationSimulator();
  preparePR(sim);
  sim.setPullRequestConfig({ ...DEFAULT_PULL_REQUEST, baseBranch: "add-my-message" });
  assert.equal(sim.openPullRequest().ok, false);
  assert.equal(sim.prStatus, "none");
});

test("练习状态来自概念答案和真实 PR/合并状态", () => {
  const sim = new CollaborationSimulator();
  assert.equal(sim.checkExercise("concepts").ok, false);
  assert.equal(sim.checkConceptExercise({ fork: "remote-copy", clone: "local-copy", branch: "repo-branch" }).ok, true);
  assert.equal(sim.checkExercise("concepts").ok, true);
  assert.equal(sim.checkExercise("open-pr").ok, false);
  preparePR(sim); sim.openPullRequest();
  assert.equal(sim.checkExercise("open-pr").ok, true);
  assert.equal(sim.checkExercise("merge").ok, false);
  sim.role = "maintainer"; sim.approve(); sim.merge();
  assert.equal(sim.checkExercise("merge").ok, true);
});

test("重复操作有明确反馈，重置恢复干净的全新副本", () => {
  const sim = new CollaborationSimulator();
  sim.fork();
  assert.equal(sim.fork().ok, false);
  preparePR(sim); sim.openPullRequest(); sim.role = "maintainer"; sim.approve(); sim.merge();
  sim.reset();
  assert.equal(sim.forkCreated, false);
  assert.equal(sim.cloned, false);
  assert.equal(sim.prStatus, "none");
  assert.equal(sim.upstreamHasMessage, false);
  assert.equal(sim.operationHistory.length, 0);
});
