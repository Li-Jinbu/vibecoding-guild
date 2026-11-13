import test from "node:test";
import assert from "node:assert/strict";
import { GIT_PRACTICES, GitSimulator } from "../src/course/git-simulator.ts";

test("编辑后显示工作区未暂存修改", () => {
  const git = new GitSimulator();
  git.editWorkingFile(git.workingContent + "\n新增一行");
  assert.equal(git.fileState, "modified");
});

test("git add 记录当前工作区快照", () => {
  const git = new GitSimulator();
  const edited = git.workingContent + "\n快照 A";
  git.editWorkingFile(edited);
  git.add();
  assert.equal(git.stagedContent, edited);
  assert.equal(git.fileState, "staged");
});

test("暂存后继续编辑会保留两个不同版本", () => {
  const git = new GitSimulator();
  git.editWorkingFile(git.workingContent + "\n已暂存版本");
  git.add();
  const staged = git.stagedContent;
  git.editWorkingFile(git.workingContent + "\n之后的工作区修改");
  assert.equal(git.stagedContent, staged);
  assert.notEqual(git.workingContent, git.stagedContent);
  assert.equal(git.fileState, "staged-and-modified");
});

test("commit 只包含暂存快照，不包含之后的工作区编辑", () => {
  const git = new GitSimulator();
  git.editWorkingFile(git.workingContent + "\n暂存的内容");
  git.add();
  const staged = git.stagedContent;
  git.editWorkingFile(git.workingContent + "\n未暂存的额外内容");
  git.commit("保存暂存快照");
  assert.equal(git.head.content, staged);
  assert.match(git.workingContent, /未暂存的额外内容/);
  assert.equal(git.fileState, "modified");
});

test("commit 后本地领先模拟远程", () => {
  const git = new GitSimulator();
  git.editWorkingFile(git.workingContent + "\n新内容");
  git.add();
  git.commit("添加新内容");
  assert.equal(git.commitsAhead, 1);
  assert.equal(git.remoteHeadId, 0);
});

test("push 同步本地提交历史到模拟远程", () => {
  const git = new GitSimulator();
  git.editWorkingFile(git.workingContent + "\n新内容");
  git.add();
  git.commit("添加新内容");
  git.push();
  assert.equal(git.commitsAhead, 0);
  assert.equal(git.remoteHeadId, git.head.id);
});

test("暂存区没有相对 HEAD 的变化时拒绝空提交", () => {
  const git = new GitSimulator();
  const result = git.commit("空提交");
  assert.equal(git.commits.length, 1);
  assert.match(result.changed, /nothing to commit/);
});

test("重复 push 显示 Everything up-to-date", () => {
  const git = new GitSimulator();
  git.editWorkingFile(git.workingContent + "\n新内容");
  git.add();
  git.commit("添加新内容");
  git.push();
  const result = git.push();
  assert.match(result.changed, /Everything up-to-date/);
});

test("reset 恢复初始快照与单条初始提交", () => {
  const git = new GitSimulator();
  git.editWorkingFile(git.workingContent + "\n修改");
  git.add();
  git.commit("修改");
  git.push();
  git.reset();
  assert.equal(git.workingContent, git.initialContent);
  assert.equal(git.stagedContent, git.initialContent);
  assert.equal(git.commits.length, 1);
  assert.equal(git.commitsAhead, 0);
});

test("三个练习根据模拟状态判定，而非操作次数", () => {
  const git = new GitSimulator();
  assert.equal(GIT_PRACTICES.length, 3);
  assert.equal(git.checkPractice("stage").passed, false);
  git.editWorkingFile(git.workingContent + "\n我的介绍");
  git.add();
  assert.equal(git.checkPractice("stage").passed, true);
  assert.equal(git.checkPractice("commit").passed, false);
  git.commit("补充我的介绍");
  assert.equal(git.checkPractice("commit").passed, true);
  assert.equal(git.checkPractice("push").passed, false);
  git.push();
  assert.equal(git.checkPractice("push").passed, true);
});

test("模拟终端拒绝未支持命令且不执行输入", () => {
  const git = new GitSimulator();
  const result = git.run("git config --global core.editor calc.exe");
  assert.equal(result.success, false);
  assert.equal(git.commits.length, 1);
  assert.match(result.changed, /没有执行任何系统命令/);
});
