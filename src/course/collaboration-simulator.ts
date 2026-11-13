export const UPSTREAM = "Li-Jinbu/vibecoding-guild";
export const DEFAULT_PULL_REQUEST = {
  baseRepository: UPSTREAM,
  baseBranch: "main",
  headRepository: "contributor/vibecoding-guild",
  compareBranch: "add-my-message",
};

export type CollaborationRole = "contributor" | "maintainer";
export type PullRequestStatus = "none" | "open" | "changes-requested" | "approved" | "merged";
export type PullRequestConfig = { baseRepository: string; baseBranch: string; headRepository: string; compareBranch: string };
export type CollaborationResult = { ok: boolean; title: string; detail: string };
export type CollaborationExercise = "concepts" | "open-pr" | "merge";

const starter = "# 我的公会留言\n\n大家好！我正在学习 Git 和 GitHub。";

export class CollaborationSimulator {
  role: CollaborationRole = "contributor";
  step = 0;
  forkCreated = false;
  cloned = false;
  branchCreated = false;
  branchName = "add-my-message";
  workingMessage = starter;
  commitMessage = "";
  localCommit = false;
  pushed = false;
  prStatus: PullRequestStatus = "none";
  prConfig: PullRequestConfig = { ...DEFAULT_PULL_REQUEST };
  prUpdateCount = 0;
  reviewComment = "";
  checksPassed = false;
  upstreamHasMessage = false;
  conceptsCorrect = false;
  operationHistory: string[] = [];
  lastResult: CollaborationResult = { ok: true, title: "副本已准备", detail: "先从原始仓库 Fork 出自己的远程副本。" };

  get canOpenPullRequest(): boolean {
    return this.localCommit && this.pushed && this.prConfig.baseRepository === UPSTREAM
      && this.prConfig.baseBranch === "main" && this.prConfig.headRepository === "contributor/vibecoding-guild"
      && this.prConfig.compareBranch === this.branchName && this.prStatus === "none";
  }

  fork(): CollaborationResult {
    if (this.forkCreated) return this.record(false, "已经有 Fork 副本", "Fork 是远程仓库副本；本次模拟已创建，无需重复。");
    this.forkCreated = true;
    return this.record(true, "Fork 已创建", "贡献者获得了独立的远程仓库副本。Fork 不会在电脑上创建本地文件。");
  }

  clone(): CollaborationResult {
    if (!this.forkCreated) return this.record(false, "还没有可 Clone 的 Fork", "先 Fork 得到自己的远程副本，再把它 Clone 到本地。");
    if (this.cloned) return this.record(false, "已经 Clone", "本地仓库已经连接到贡献者的 Fork。Fork 是远程复制，Clone 是复制到本地。");
    this.cloned = true;
    return this.record(true, "Fork 已 Clone 到本地", "本地仓库现在与贡献者 Fork 建立关系；原始仓库 main 没有变化。");
  }

  createBranch(name = "add-my-message"): CollaborationResult {
    if (!this.cloned) return this.record(false, "请先 Clone", "功能分支是在本地仓库内创建的；先 Clone 自己的 Fork。");
    if (this.branchCreated) return this.record(false, "功能分支已存在", "本次任务已在功能分支上，无需重复创建。");
    const clean = name.trim();
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(clean)) return this.record(false, "分支名称不合适", "使用简短的小写英文、数字和连字符，例如 add-my-message。");
    this.branchName = clean;
    this.branchCreated = true;
    return this.record(true, "功能分支已创建", clean + " 是本地仓库里独立的开发线，可以让 main 保持稳定。");
  }

  editMessage(content: string): void { this.workingMessage = content; }

  commit(message = "Add my guild message"): CollaborationResult {
    if (!this.branchCreated) return this.record(false, "还没有功能分支", "先创建功能分支，再在分支上修改留言。");
    if (!this.workingMessage.trim()) return this.record(false, "留言内容还是空的", "在 messages/my-message.md 写几行 Markdown，再创建提交。");
    if (!this.workingMessage.trim().startsWith("#")) return this.record(false, "留言还缺少标题", "试着用 # 写一个留言标题，再提交。");
    if (!message.trim()) return this.record(false, "提交说明不能为空", "写一句简短说明，例如 Add my guild message。");
    this.commitMessage = message.trim();
    this.localCommit = true;
    this.pushed = false;
    return this.record(true, "本地提交已创建", "提交记录保存在本地功能分支；Fork 远程分支和原始仓库尚未更新。");
  }

  push(target: "fork" | "upstream" = "fork"): CollaborationResult {
    if (target === "upstream") return this.record(false, "没有原始仓库写入权限", "贡献者通常不能直接 Push 到原始仓库。请推送到自己的 Fork，再通过 PR 请求合并。");
    if (!this.forkCreated) return this.record(false, "Push 目标不存在", "还没有 Fork，不能推送到贡献者的远程副本。");
    if (!this.cloned || !this.branchCreated) return this.record(false, "没有可推送的功能分支", "先 Clone Fork 并创建功能分支。");
    if (!this.localCommit) return this.record(false, "本地修改尚未 Commit", "Push 推送提交记录，不会自动上传未提交的编辑。先 Commit，再 Push。");
    this.pushed = true;
    if (this.prStatus === "changes-requested") this.prStatus = "open";
    if (this.prStatus === "open" || this.prStatus === "approved") this.prUpdateCount += 1;
    return this.record(true, "功能分支已推送到 Fork", "贡献者 Fork 的功能分支已更新；原始仓库 main 没变，已有 PR 会自动包含新提交。");
  }

  setPullRequestConfig(config: PullRequestConfig): void { this.prConfig = { ...config }; }

  openPullRequest(): CollaborationResult {
    if (!this.localCommit || !this.pushed) return this.record(false, "还不能创建 PR", "先在功能分支 Commit 并 Push 到自己的 Fork。");
    if (this.prConfig.baseRepository !== UPSTREAM) return this.record(false, "目标仓库选错了", "base repository 应选择原始仓库 " + UPSTREAM + "；Fork 是 head 来源，不是合并目标。");
    if (this.prConfig.baseBranch !== "main") return this.record(false, "目标分支选错了", "本次入会留言应请求合并到原始仓库 main。");
    if (this.prConfig.headRepository !== "contributor/vibecoding-guild") return this.record(false, "来源仓库选错了", "head repository 应选择贡献者自己的 Fork。");
    if (this.prConfig.compareBranch !== this.branchName) return this.record(false, "来源分支选错了", "请选择包含留言提交的 " + this.branchName + " 功能分支。");
    if (this.prStatus !== "none") return this.record(false, "Pull Request 已存在", "同一功能分支的 PR 已打开；之后的提交会更新这条 PR。");
    this.prStatus = "open";
    this.checksPassed = true;
    return this.record(true, "Pull Request 已创建", "PR #1 请求将贡献者 Fork 的功能分支合并到原始仓库 main。PR 是审核请求，尚未修改原始仓库。");
  }

  requestChanges(comment = "请在留言中补充一句你想学习的内容。"): CollaborationResult {
    if (this.role !== "maintainer") return this.record(false, "请切换到管理员视角", "Review 由原始仓库管理员完成。");
    if (this.prStatus !== "open") return this.record(false, "当前 PR 不能请求修改", "需要先有一条等待审核的 PR。");
    this.reviewComment = comment.trim() || "请根据建议更新留言。";
    this.prStatus = "changes-requested";
    return this.record(true, "已请求修改", this.reviewComment + " PR 仍然存在，贡献者可更新分支。");
  }

  updateAfterReview(content: string, message = "Update guild message"): CollaborationResult {
    if (this.role !== "contributor") return this.record(false, "请切换到贡献者视角", "只有贡献者能更新自己的功能分支。");
    if (this.prStatus !== "changes-requested") return this.record(false, "当前没有待处理修改意见", "管理员请求修改后，再根据意见更新分支。");
    this.editMessage(content);
    const result = this.commit(message);
    if (result.ok) {
      const pushed = this.push("fork");
      if (!pushed.ok) return pushed;
    }
    return result;
  }

  approve(): CollaborationResult {
    if (this.role !== "maintainer") return this.record(false, "请切换到管理员视角", "只有管理员可以审核并批准 PR。");
    if (this.prStatus !== "open") return this.record(false, "当前 PR 不能批准", "PR 必须处于等待审核状态。");
    if (!this.checksPassed) return this.record(false, "自动检查未通过", "检查失败时要先修复留言并更新 PR。");
    this.prStatus = "approved";
    return this.record(true, "Review 已批准", "管理员已批准，但 PR 还没有合并；批准和 Merge 是两个独立动作。");
  }

  merge(): CollaborationResult {
    if (this.role !== "maintainer") return this.record(false, "请切换到管理员视角", "合并原始仓库 PR 需要管理员权限。");
    if (this.prStatus !== "approved") return this.record(false, "PR 尚不能合并", "先由管理员批准，再单独执行 Merge。批准不会自动合并。");
    if (!this.checksPassed) return this.record(false, "检查未通过，暂不能合并", "真实仓库还可能因检查失败、冲突或权限限制阻止合并。");
    this.prStatus = "merged";
    this.upstreamHasMessage = true;
    return this.record(true, "PR 已合并到原始仓库 main", "现在原始仓库 main 才包含 messages/my-message.md；合并前没有这条留言。");
  }

  checkConceptExercise(answers: { fork: string; clone: string; branch: string }): CollaborationResult {
    this.conceptsCorrect = answers.fork === "remote-copy" && answers.clone === "local-copy" && answers.branch === "repo-branch";
    return this.record(this.conceptsCorrect, this.conceptsCorrect ? "概念匹配正确" : "再检查三个概念的作用对象",
      this.conceptsCorrect ? "Fork 是远程副本，Clone 是复制到本地，Branch 是仓库内的开发分支。" : "想想哪一步得到远程副本、哪一步复制到电脑，哪一步是在仓库中建立开发线。");
  }

  checkExercise(id: CollaborationExercise): CollaborationResult {
    if (id === "concepts") return this.conceptsCorrect
      ? { ok: true, title: "练习完成", detail: "你正确区分了 Fork、Clone 和 Branch。" }
      : { ok: false, title: "练习尚未完成", detail: "先正确匹配三个操作的作用对象。" };
    if (id === "open-pr") return this.prStatus !== "none"
      ? { ok: true, title: "练习完成", detail: "你已从贡献者 Fork 的功能分支创建面向原始仓库的 PR。" }
      : { ok: false, title: "练习尚未完成", detail: "检查提交和 Push 状态，并确认 PR 的 base 与 head 仓库、分支。" };
    return this.prStatus === "merged" && this.upstreamHasMessage
      ? { ok: true, title: "协作副本通关", detail: "贡献者提交 PR，管理员 Review 并 Merge；原始仓库现在包含留言。" }
      : { ok: false, title: "合并流程尚未完成", detail: "让贡献者提交和推送修改，再由管理员 Review、批准并手动 Merge。" };
  }

  reset(): void {
    this.role = "contributor";
    this.step = 0;
    this.forkCreated = false;
    this.cloned = false;
    this.branchCreated = false;
    this.branchName = "add-my-message";
    this.workingMessage = starter;
    this.commitMessage = "";
    this.localCommit = false;
    this.pushed = false;
    this.prStatus = "none";
    this.prConfig = { ...DEFAULT_PULL_REQUEST };
    this.prUpdateCount = 0;
    this.reviewComment = "";
    this.checksPassed = false;
    this.upstreamHasMessage = false;
    this.conceptsCorrect = false;
    this.operationHistory = [];
    this.lastResult = { ok: true, title: "副本已准备", detail: "先从原始仓库 Fork 出自己的远程副本。" };
  }

  private record(ok: boolean, title: string, detail: string): CollaborationResult {
    this.lastResult = { ok, title, detail };
    this.operationHistory.unshift(title);
    this.operationHistory = this.operationHistory.slice(0, 10);
    return this.lastResult;
  }
}
