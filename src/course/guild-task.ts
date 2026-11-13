export const GITHUB_REPOSITORY_URL = "https://github.com/Li-Jinbu/vibecoding-guild";
export const GITHUB_PAGES_URL = "https://li-jinbu.github.io/vibecoding-guild/";
export const REPOSITORY_NAME = "Li-Jinbu/vibecoding-guild";

export const WEB_STEPS = [
  { title: "Fork 仓库", detail: "打开公会原始仓库，点击 Fork，将远程仓库副本创建到自己的 GitHub 账号。Fork 是远程副本，不会把文件下载到电脑。", action: "Fork 原始仓库" },
  { title: "创建功能分支", detail: "打开自己的 Fork，在分支选择器输入 add-my-message 并创建分支。后面的留言提交要落在这个分支，不要直接提交到 main。", action: "在自己的 Fork 创建 add-my-message" },
  { title: "新建留言文件", detail: "在自己的 Fork 切换到 add-my-message，点 Add file → Create new file，文件路径填 messages/我的留言.md。只新增这一份文件。", action: "Add file → Create new file" },
  { title: "编写并 Commit", detail: "写好普通 Markdown 后，点 Commit changes。确认提交目标是 add-my-message 分支。文件名直接放在 messages/ 中，不能有子目录。", action: "Commit changes 到功能分支" },
  { title: "Compare & pull request", detail: "打开自己的 Fork，点 Contribute → Open pull request（或 Compare & pull request），检查 base 与 head 仓库和分支配置。", action: "Compare & pull request" },
  { title: "Create pull request", detail: "填写简短标题和说明，确认文件改动只有新增的留言 Markdown，然后点 Create pull request。等待自动检查与维护者审核。", action: "Create pull request" },
] as const;

export const TERMINAL_STEPS = [
  { title: "准备 Fork 地址", command: '$GITHUB_USER = "你的 GitHub 用户名"', explanation: "下面示例适用于 Windows PowerShell。先把占位文字换成自己的 GitHub 用户名；克隆的是你的 Fork。" },
  { title: "Clone 你的 Fork", command: 'git clone "https://github.com/$GITHUB_USER/vibecoding-guild.git"\ncd vibecoding-guild', explanation: "Clone 把远程 Fork 复制到电脑；然后进入新目录。origin 默认指向你的 Fork，因此 Push 会去你的仓库，而不是原始仓库。" },
  { title: "创建功能分支", command: "git switch -c add-my-message", explanation: "在本地仓库创建并切换到功能分支，避免直接在 main 上做这次修改。" },
  { title: "添加留言文件", command: "code messages/my-message.md", explanation: "在 VS Code 创建并编辑留言文件。也可以用文件资源管理器打开仓库，然后在 messages 目录中新建 .md 文件。" },
  { title: "暂存并 Commit", command: 'git add messages/my-message.md\ngit commit -m "Add my guild message"', explanation: "git add 记录文件快照；git commit 把暂存内容保存为本地提交。Commit 说明可按自己的留言内容调整。" },
  { title: "Push 功能分支", command: "git push -u origin add-my-message", explanation: "把本地提交推送到自己的 Fork。完成后到 GitHub 网页打开 Pull Request；Push 本身不会修改原始仓库。" },
] as const;

export const CHECKLIST_ITEMS = [
  "留言文件直接放在 messages/ 目录中，只新增一个 .md 文件",
  "文件名以字母或数字开头，只含允许的文字、空格、括号、下划线、点、连字符，且不含 ..",
  "留言不超过 10 KB，非空，使用支持的 Markdown；没有原始 HTML 或图片",
  "PR 的 base 是 Li-Jinbu/vibecoding-guild:main，head 是自己的 Fork 功能分支",
  "PR 自动检查通过，且改动只有新增留言文件",
  "管理员已审核并合并 PR",
  "留言墙显示留言；作者信息与 GitHub 用户名对应",
] as const;

export type GuideRoute = "web" | "terminal";

export class GuildTaskState {
  route: GuideRoute = "web";
  readonly steps: Record<GuideRoute, number> = { web: 0, terminal: 0 };
  readonly checklist: boolean[] = CHECKLIST_ITEMS.map(() => false);

  setRoute(route: GuideRoute): void { this.route = route; }
  get currentStep(): number { return this.steps[this.route]; }
  get currentSteps(): typeof WEB_STEPS | typeof TERMINAL_STEPS { return this.route === "web" ? WEB_STEPS : TERMINAL_STEPS; }
  get progress(): number { return Math.round(((this.currentStep + 1) / this.currentSteps.length) * 100); }

  next(): void { this.steps[this.route] = Math.min(this.currentSteps.length - 1, this.currentStep + 1); }
  previous(): void { this.steps[this.route] = Math.max(0, this.currentStep - 1); }
  goTo(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.currentSteps.length) return;
    this.steps[this.route] = index;
  }
  toggleChecklist(index: number): void {
    if (Number.isInteger(index) && index >= 0 && index < this.checklist.length) this.checklist[index] = !this.checklist[index];
  }
  get checklistProgress(): number { return this.checklist.filter(Boolean).length; }
  resetChecklist(): void { this.checklist.fill(false); }
}

export async function copyGuideText(text: string, writeText: (value: string) => Promise<void>): Promise<void> {
  if (!text.trim()) throw new Error("没有可复制的命令。");
  await writeText(text);
}
