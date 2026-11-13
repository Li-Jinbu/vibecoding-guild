export type FinalPromptField = "idea" | "audience" | "features" | "style" | "acceptance";
export type FinalCheck = "runs" | "featuresWork" | "noErrors" | "matchesNeed" | "noSecrets";
export type FinalDeliverable = "stableVersion" | "repoUploaded" | "readmeReady" | "linkReady";

export const FINAL_NODES = [
  { id: "choose", title: "选择冒险任务", short: "决定想制作什么" },
  { id: "specify", title: "编写开发需求", short: "把想法说清楚" },
  { id: "build", title: "召唤 AI 开发", short: "协作完成小项目" },
  { id: "review", title: "检查与迭代", short: "运行、发现、修正" },
  { id: "share", title: "保存与展示", short: "用 Git 和 GitHub 分享" },
] as const;

export const PROJECT_IDEAS = [
  { id: "profile", title: "个人介绍网页", summary: "用一页介绍你是谁、正在学什么。", minimum: "姓名或昵称、自我介绍、至少一个兴趣或技能区域。", extension: "加入作品链接或学习时间线。" },
  { id: "todo", title: "待办事项工具", summary: "帮助自己记录和整理待办任务。", minimum: "添加任务、显示任务列表、标记完成。", extension: "加入筛选或本地保存。" },
  { id: "game", title: "简单网页小游戏", summary: "制作一个规则简单、可以马上试玩的小游戏。", minimum: "显示游戏目标、提供操作方式、给出结果反馈。", extension: "增加计分、难度或重新开始。" },
  { id: "creative", title: "创意互动网页", summary: "把一个有趣的想法做成可操作的小体验。", minimum: "说明互动目标、提供至少一种用户操作、显示对应反馈。", extension: "加入不同状态、动画或声音开关。" },
] as const;

export const FINAL_PROMPT_FIELDS: { id: FinalPromptField; label: string; placeholder: string }[] = [
  { id: "idea", label: "我要做什么", placeholder: "描述作品想解决的问题或带来的体验" },
  { id: "audience", label: "这个作品给谁使用", placeholder: "例如：刚入学的同学、喜欢解谜的玩家" },
  { id: "features", label: "至少实现哪些功能", placeholder: "按优先顺序列出必须有的功能" },
  { id: "style", label: "希望采用什么视觉风格", placeholder: "例如：清爽、深色、像素风；优先保证可读性" },
  { id: "acceptance", label: "如何判断作品完成", placeholder: "写下你能亲自操作或检查的结果" },
];

export const AI_BUILD_STEPS = [
  { title: "创建项目文件夹", detail: "选择一个新的、空的文件夹作为项目位置。先确认路径，不要把已有重要文件夹当作练习目录。" },
  { title: "使用 VS Code 打开", detail: "在 VS Code 中打开刚创建的项目文件夹，让 AI 工具能看到当前项目上下文。" },
  { title: "启动 AI 编程助手", detail: "使用你能访问的 AI 编程工具。不同工具的界面和权限不同；先了解它会读取和修改哪些内容。" },
  { title: "粘贴开发需求", detail: "把上一步整理的提示词交给 AI。先看它提出的计划和文件范围；需求不清楚时先补充或纠正。" },
  { title: "查看 AI 修改的文件", detail: "逐项阅读修改差异，确认文件在预期目录，内容符合需求，没有不理解的危险命令或敏感信息。" },
  { title: "运行项目", detail: "按照项目 README 或 AI 给出的、经你核对的说明启动。不同项目类型的运行方式可能不同。" },
] as const;

export const FINAL_CHECK_ITEMS: { id: FinalCheck; label: string }[] = [
  { id: "runs", label: "页面或程序能否正常运行？" },
  { id: "featuresWork", label: "核心功能是否可以实际操作？" },
  { id: "noErrors", label: "控制台或终端是否没有明显报错？" },
  { id: "matchesNeed", label: "内容和布局是否符合最初需求？" },
  { id: "noSecrets", label: "代码中是否没有 Token、密码或私人数据？" },
];

export const FINAL_DELIVERABLE_ITEMS: { id: FinalDeliverable; label: string }[] = [
  { id: "stableVersion", label: "我已用 Git 保存了一个稳定版本。" },
  { id: "repoUploaded", label: "我已创建自己的 GitHub 仓库并上传项目代码。" },
  { id: "readmeReady", label: "README.md 简要说明了项目用途和运行方式。" },
  { id: "linkReady", label: "我已填写作品仓库或演示链接。" },
];

const samplePrompt: Record<FinalPromptField, string> = {
  idea: "制作一个帮助新生记录每周学习目标的小网页。",
  audience: "刚入学、正在熟悉大学生活的同学。",
  features: "添加目标、查看列表、标记完成；先不做账号和云端同步。",
  style: "深蓝与金色点缀，简洁清楚，手机上也容易阅读。",
  acceptance: "我能添加并完成目标；刷新后行为符合说明；手机宽度没有横向溢出。",
};

export class FinalChallengeState {
  activeNode = 0;
  selectedIdea = "";
  customIdea = "";
  projectConfirmed = false;
  prompt: Record<FinalPromptField, string> = { ...samplePrompt };
  generatedPrompt = "";
  workflowStep = 0;
  workflowConfirmed = false;
  checks: Record<FinalCheck, boolean> = {
    runs: false, featuresWork: false, noErrors: false, matchesNeed: false, noSecrets: false,
  };
  issue = "";
  expected = "";
  actual = "";
  feedbackPrompt = "";
  deliverables: Record<FinalDeliverable, boolean> = {
    stableVersion: false, repoUploaded: false, readmeReady: false, linkReady: false,
  };
  projectUrl = "";

  chooseIdea(id: string): boolean {
    if (id !== "custom" && !PROJECT_IDEAS.some((idea) => idea.id === id)) return false;
    this.selectedIdea = id;
    this.projectConfirmed = false;
    return true;
  }
  setCustomIdea(value: string): void { this.customIdea = value; this.projectConfirmed = false; }
  get projectName(): string {
    if (this.selectedIdea === "custom") return this.customIdea.trim();
    return PROJECT_IDEAS.find((idea) => idea.id === this.selectedIdea)?.title ?? "";
  }
  confirmProject(): boolean {
    if (!this.selectedIdea || (this.selectedIdea === "custom" && !this.customIdea.trim())) return false;
    this.projectConfirmed = true;
    return true;
  }

  setPromptField(field: FinalPromptField, value: string): void {
    this.prompt[field] = value;
    this.generatedPrompt = "";
  }
  restorePromptExample(): void {
    this.prompt = { ...samplePrompt };
    this.generatedPrompt = "";
  }
  createDevelopmentPrompt(): string {
    const labels: Record<FinalPromptField, string> = {
      idea: "我要做什么", audience: "目标用户", features: "最低功能要求",
      style: "视觉风格", acceptance: "验收标准",
    };
    const project = this.projectName || this.prompt.idea.trim() || "我的第一个小项目";
    const details = FINAL_PROMPT_FIELDS.map(({ id }) => "- " + labels[id] + "：" + (this.prompt[id].trim() || "【请补充】"));
    this.generatedPrompt = [
      "请协助我在当前项目中制作「" + project + "」。",
      "",
      "我的需求：",
      ...details,
      "",
      "开始前请先查看项目文件和 README，简要说明计划及准备修改的文件。优先完成最低要求，不要加入无关依赖或重构。",
      "修改后告诉我如何运行，并给出需要人工核对的测试步骤。不要声称未实际运行的检查已经通过。",
    ].join("\n");
    return this.generatedPrompt;
  }

  nextWorkflowStep(): void { this.workflowStep = Math.min(AI_BUILD_STEPS.length - 1, this.workflowStep + 1); }
  previousWorkflowStep(): void { this.workflowStep = Math.max(0, this.workflowStep - 1); }
  confirmWorkflow(): boolean {
    if (this.workflowStep !== AI_BUILD_STEPS.length - 1) return false;
    this.workflowConfirmed = true;
    return true;
  }

  setIssueField(field: "issue" | "expected" | "actual", value: string): void {
    this[field] = value;
    this.feedbackPrompt = "";
  }
  createFeedbackPrompt(): string {
    const issue = this.issue.trim() || "【请描述遇到的问题】";
    const expected = this.expected.trim() || "【请描述预期结果】";
    const actual = this.actual.trim() || "【请描述实际结果】";
    this.feedbackPrompt = [
      "请基于当前项目帮助我定位并修复一个问题。先解释原因和准备修改的文件，再进行最小必要的修改。",
      "",
      "遇到的问题：" + issue,
      "预期结果：" + expected,
      "实际结果：" + actual,
      "",
      "完成后请说明修改内容，并告诉我应如何复测。不要把未运行的测试说成已通过。",
    ].join("\n");
    return this.feedbackPrompt;
  }

  toggleCheck(id: FinalCheck): void { this.checks[id] = !this.checks[id]; }
  toggleDeliverable(id: FinalDeliverable): void { this.deliverables[id] = !this.deliverables[id]; }
  setProjectUrl(value: string): void {
    this.projectUrl = value;
    this.deliverables.linkReady = value.trim().length > 0;
  }
  get checkedCount(): number { return Object.values(this.checks).filter(Boolean).length; }
  get checksComplete(): boolean { return FINAL_CHECK_ITEMS.every(({ id }) => this.checks[id]); }
  get deliverablesComplete(): boolean { return FINAL_DELIVERABLE_ITEMS.every(({ id }) => this.deliverables[id]); }
  get completedNodes(): boolean[] {
    return [
      this.projectConfirmed,
      Boolean(this.generatedPrompt),
      this.workflowConfirmed,
      this.checksComplete,
      this.deliverablesComplete && Boolean(this.projectUrl.trim()),
    ];
  }
  get isComplete(): boolean { return this.completedNodes.every(Boolean); }
  get completedNodeCount(): number { return this.completedNodes.filter(Boolean).length; }

  reset(): void {
    this.activeNode = 0;
    this.selectedIdea = "";
    this.customIdea = "";
    this.projectConfirmed = false;
    this.prompt = { ...samplePrompt };
    this.generatedPrompt = "";
    this.workflowStep = 0;
    this.workflowConfirmed = false;
    this.checks = { runs: false, featuresWork: false, noErrors: false, matchesNeed: false, noSecrets: false };
    this.issue = "";
    this.expected = "";
    this.actual = "";
    this.feedbackPrompt = "";
    this.deliverables = { stableVersion: false, repoUploaded: false, readmeReady: false, linkReady: false };
    this.projectUrl = "";
  }
}

export async function copyFinalText(text: string, writeText: (value: string) => Promise<void>): Promise<void> {
  if (!text.trim()) throw new Error("没有可复制的内容，请先生成提示词。");
  await writeText(text);
}
