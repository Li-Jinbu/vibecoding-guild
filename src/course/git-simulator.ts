export const INITIAL_README = `# Git 冒险者公会

欢迎来到公会！这里是我的项目介绍。`;

export type GitCommit = {
  id: number;
  hash: string;
  message: string;
  content: string;
  parentId: number | null;
};

export type FileState = "clean" | "modified" | "staged" | "staged-and-modified" | "unpushed";
export type SimulationResult = {
  command: string;
  title: string;
  changed: string;
  unchanged: string;
  next: string;
  status: string;
  success: boolean;
};
export type PracticeResult = { passed: boolean; message: string };

export const GIT_PRACTICES = [
  {
    id: "stage",
    title: "练习 01 · 备好行囊",
    requirement: "修改 README.md，并把你想提交的版本放进暂存区。",
  },
  {
    id: "commit",
    title: "练习 02 · 留下时间印记",
    requirement: "基于已暂存的修改，创建一条有意义的本地提交。",
  },
  {
    id: "push",
    title: "练习 03 · 分享冒险记录",
    requirement: "完成修改、暂存、提交，并把提交同步到模拟远程仓库。",
  },
] as const;

function makeCommit(id: number, message: string, content: string, parentId: number | null): GitCommit {
  return { id, hash: id === 0 ? "a0f31c" : `a${(0xf31c + id * 0x1021).toString(16).slice(-5)}`, message, content, parentId };
}

export class GitSimulator {
  readonly initialContent = INITIAL_README;
  workingContent = INITIAL_README;
  stagedContent = INITIAL_README;
  commits: GitCommit[] = [makeCommit(0, "Initial commit", INITIAL_README, null)];
  remoteHeadId = 0;
  lastResult: SimulationResult;
  operationHistory: SimulationResult[] = [];
  private nextCommitId = 1;

  constructor() {
    this.lastResult = this.describe("准备模拟", "模拟器已就绪。README.md 当前与初始版本一致。", "暂存区、本地仓库和模拟远程都保存着初始快照。", "试着修改 README.md，再运行 git status。");
  }

  get head(): GitCommit { return this.commits[this.commits.length - 1]; }
  get remoteHead(): GitCommit { return this.commits.find((commit) => commit.id === this.remoteHeadId) ?? this.commits[0]; }
  get localCommits(): GitCommit[] { return [...this.commits]; }
  get remoteCommits(): GitCommit[] { return this.commits.filter((commit) => commit.id <= this.remoteHeadId); }
  get commitsAhead(): number { return this.commits.length - this.remoteCommits.length; }
  get hasStagedChange(): boolean { return this.stagedContent !== this.head.content; }
  get hasUnstagedChange(): boolean { return this.workingContent !== this.stagedContent; }

  get fileState(): FileState {
    if (this.hasStagedChange && this.hasUnstagedChange) return "staged-and-modified";
    if (this.hasStagedChange) return "staged";
    if (this.hasUnstagedChange) return "modified";
    if (this.commitsAhead > 0) return "unpushed";
    return "clean";
  }

  get statusLabel(): string {
    const labels: Record<FileState, string> = {
      clean: "未修改 · 已同步",
      modified: "已修改但未暂存",
      staged: "已暂存",
      "staged-and-modified": "已暂存，且工作区又有新修改",
      unpushed: "已提交但未推送",
    };
    return labels[this.fileState];
  }

  statusTextForDisplay(): string {
    return this.statusText();
  }

  editWorkingFile(content: string): void {
    if (content === this.workingContent) return;
    this.workingContent = content;
    this.lastResult = this.describe(
      "编辑 README.md",
      "工作区里的 README.md 内容已改变。",
      "暂存区快照、本地提交和远程提交都没有改变。",
      "运行 git status 查看状态；确认内容后再 git add README.md。",
    );
  }

  recordEdit(): void {
    if (this.lastResult.command === "编辑 README.md" && this.operationHistory[0] !== this.lastResult) this.operationHistory.unshift(this.lastResult);
  }

  run(command: string): SimulationResult {
    const normalized = command.trim();
    if (/^git\s+status$/i.test(normalized)) return this.status();
    if (/^git\s+add\s+README\.md$/i.test(normalized)) return this.add();
    if (/^git\s+push$/i.test(normalized)) return this.push();
    const commit = normalized.match(/^git\s+commit\s+-m\s+(?:"([^"]*)"|'([^']*)')$/i);
    if (commit) return this.commit(commit[1] ?? commit[2] ?? "");
    return this.record(this.describe(
      normalized || "（空命令）",
      "这条命令不在本课模拟器支持的范围内，没有执行任何系统命令。",
      "工作区、暂存区、本地仓库和模拟远程仓库都没有改变。",
      "试试 git status、git add README.md、git commit -m \"说明\" 或 git push。",
      false,
    ));
  }

  status(): SimulationResult {
    const gitStatus = this.statusText();
    return this.record(this.describe(
      "git status",
      gitStatus,
      "git status 只读取并报告状态，没有修改任何区域。",
      this.nextStepForStatus(),
    ));
  }

  add(): SimulationResult {
    if (this.workingContent === this.stagedContent) {
      return this.record(this.describe(
        "git add README.md",
        "README.md 当前内容与暂存区快照相同，没有新的内容需要记录。",
        "工作区、暂存区、本地提交和远程提交均保持不变。",
        this.hasStagedChange ? "暂存区里仍有之前准备的改动，可以运行 git commit。" : "先编辑 README.md，再运行 git add README.md。",
      ));
    }
    this.stagedContent = this.workingContent;
    return this.record(this.describe(
      "git add README.md",
      "Git 已把 README.md 当前内容的快照记录到暂存区。",
      "工作区文件没有移动或改变；本地仓库和远程仓库还没有新提交。",
      "可用 git status 检查暂存状态，然后用 git commit -m \"说明这次修改\" 创建提交。",
    ));
  }

  commit(message: string): SimulationResult {
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      return this.record(this.describe(
        'git commit -m ""',
        "提交说明不能为空。",
        "暂存区、本地仓库和远程仓库均未改变。",
        "写一句简短说明，例如 git commit -m \"补充自我介绍\"。",
        false,
      ));
    }
    if (!this.hasStagedChange) {
      const hasWorktreeEdits = this.hasUnstagedChange;
      return this.record(this.describe(
        `git commit -m "${cleanMessage}"`,
        hasWorktreeEdits ? "nothing to commit：README.md 有工作区修改，但这些内容尚未暂存。" : "nothing to commit：暂存区没有相对当前提交的新内容。",
        "本地提交和远程提交没有改变；commit 不会自动把未暂存的工作区改动带进去。",
        hasWorktreeEdits ? "运行 git add README.md，再重新提交。" : "先编辑 README.md 并运行 git add README.md。",
        false,
      ));
    }

    const commit = makeCommit(this.nextCommitId++, cleanMessage, this.stagedContent, this.head.id);
    this.commits.push(commit);
    this.stagedContent = commit.content;
    const leavesUnstaged = this.workingContent !== this.stagedContent;
    return this.record(this.describe(
      `git commit -m "${cleanMessage}"`,
      `本地仓库新增提交 ${commit.hash}，提交内容来自暂存区快照。`,
      leavesUnstaged
        ? "工作区后来产生的修改没有进入这次提交；模拟远程仓库也没有改变。"
        : "工作区文件内容没有被移动；模拟远程仓库仍停留在旧提交。",
      leavesUnstaged ? "先 git add README.md 暂存剩余修改，或直接 git push 推送这条提交。" : "本地现在领先远程；运行 git push 同步提交。",
    ));
  }

  push(): SimulationResult {
    if (this.commitsAhead === 0) {
      return this.record(this.describe(
        "git push",
        "Everything up-to-date：没有新提交需要推送。",
        "工作区、暂存区、本地提交和远程提交都没有改变。",
        this.hasUnstagedChange ? "当前仍有未暂存修改；需要先 git add 和 git commit。" : "可以继续编辑新的内容，或查看 git status。",
      ));
    }
    const count = this.commitsAhead;
    this.remoteHeadId = this.head.id;
    return this.record(this.describe(
      "git push",
      `模拟远程仓库已接收 ${count} 条本地提交，当前提交 ${this.head.hash}。`,
      "push 推送的是提交记录，不是把工作区文件直接上传；工作区、暂存区和本地提交没有改变。",
      this.hasUnstagedChange ? "远程已同步提交；工作区还有未暂存修改，可继续 add / commit。" : "本地与远程已同步，可以继续下一次修改。",
    ));
  }

  checkPractice(id: string): PracticeResult {
    if (id === "stage") {
      const passed = this.hasStagedChange && this.stagedContent !== this.initialContent;
      return { passed, message: passed ? "完成！README.md 的修改已存在于暂存区。" : "先编辑 README.md，再运行 git add README.md。只改文件还没有完成暂存。" };
    }
    if (id === "commit") {
      const meaningfulCommit = this.commits.slice(1).some((commit) => commit.content !== this.initialContent && commit.message.trim().length > 0);
      return { passed: meaningfulCommit, message: meaningfulCommit ? "完成！你创建了一条包含真实暂存快照的本地提交。" : "还没有符合要求的提交。修改文件、暂存内容，再写一句有意义的提交说明。" };
    }
    if (id === "push") {
      const complete = this.commits.length > 1
        && this.head.content !== this.initialContent
        && this.remoteHeadId === this.head.id
        && !this.hasStagedChange
        && !this.hasUnstagedChange;
      return { passed: complete, message: complete ? "冒险完成！修改已暂存、提交，并同步到模拟远程仓库。" : "还没完成整条流程。检查 README.md 是否已提交并推送，且没有遗留未暂存修改。" };
    }
    return { passed: false, message: "找不到这个练习，请从练习卡片重新选择。" };
  }

  reset(): void {
    this.workingContent = this.initialContent;
    this.stagedContent = this.initialContent;
    this.commits = [makeCommit(0, "Initial commit", this.initialContent, null)];
    this.remoteHeadId = 0;
    this.nextCommitId = 1;
    this.operationHistory = [];
    this.lastResult = this.describe("重置模拟器", "所有区域已恢复到初始 README.md 快照。", "这只重置浏览器里的教学模型，不会改动你的电脑或 GitHub 仓库。", "开始编辑 README.md，观察状态如何变化。");
  }

  private statusText(): string {
    const lines = ["On branch main"];
    if (this.commitsAhead > 0) lines.push(`Your branch is ahead of 'origin/main' by ${this.commitsAhead} commit${this.commitsAhead === 1 ? "" : "s"}.`);
    if (this.hasStagedChange) lines.push("Changes to be committed: modified: README.md");
    if (this.hasUnstagedChange) lines.push("Changes not staged for commit: modified: README.md");
    if (!this.hasStagedChange && !this.hasUnstagedChange && this.commitsAhead === 0) lines.push("nothing to commit, working tree clean");
    return lines.join("\n");
  }

  private nextStepForStatus(): string {
    if (this.hasUnstagedChange) return "README.md 有未暂存修改；运行 git add README.md 后，这一版快照才会进入暂存区。";
    if (this.hasStagedChange) return "暂存区有待提交快照；写好说明后运行 git commit。";
    if (this.commitsAhead > 0) return "提交已在本地；运行 git push 将提交同步到模拟远程。";
    return "工作区干净且远程已同步；可以编辑 README.md 开始新改动。";
  }

  private describe(command: string, changed: string, unchanged: string, next: string, success = true): SimulationResult {
    return { command, title: changed.split("\n")[0], changed, unchanged, next, status: this.statusLabel, success };
  }

  private record(result: SimulationResult): SimulationResult {
    this.lastResult = result;
    this.operationHistory.unshift(result);
    this.operationHistory = this.operationHistory.slice(0, 8);
    return result;
  }
}
