export type AILessonModule = "teammate" | "tools" | "comparison" | "prompt" | "cycle";
export type PromptField = "purpose" | "audience" | "features" | "style" | "constraints" | "acceptance";

export const AI_LESSON_MODULES: { id: AILessonModule; title: string }[] = [
  { id: "teammate", title: "认识 AI 队友" },
  { id: "tools", title: "工具小队" },
  { id: "comparison", title: "聊天 vs Agent" },
  { id: "prompt", title: "Prompt 训练营" },
  { id: "cycle", title: "开发循环" },
];

export const AGENT_STEPS = [
  { title: "理解需求", detail: "Agent 先整理目标与限制，例如页面需要介绍个人、展示技能，并适配手机。理解错了就应该先澄清。" },
  { title: "查看项目", detail: "在获准的工作区里读取项目结构和配置，找到适合新增页面的位置；不会凭空假设项目架构。" },
  { title: "创建或修改文件", detail: "提出小而明确的改动，说明将创建或编辑哪些文件。开发者可以先检查计划，再决定是否继续。" },
  { title: "运行检查", detail: "根据项目已有脚本运行测试或构建，观察真实结果；不能只根据代码看起来正确就宣告成功。" },
  { title: "汇报结果", detail: "说明改了什么、检查结果和仍需确认的部分。开发者审核差异并决定下一轮反馈。" },
] as const;

export const DEVELOPMENT_CYCLE = [
  { title: "提出需求", detail: "说明目标、使用者、限制和验收方式，让任务有清楚边界。" },
  { title: "AI 制定方案", detail: "先讨论步骤与影响文件；复杂或风险较高的修改先确认方案。" },
  { title: "AI 修改代码", detail: "让 Agent 一次完成一个可检查的小任务，不把无关重构混进来。" },
  { title: "人工检查", detail: "阅读差异，核对行为、安全性和修改范围；AI 生成的代码也要由人负责。" },
  { title: "运行测试", detail: "运行项目已有的测试、校验与构建，确认结果，而不是相信口头说明。" },
  { title: "反馈问题", detail: "把观察到的错误、复现步骤和预期结果告诉 AI，避免只说“再改好一点”。" },
  { title: "继续迭代", detail: "依据检查结果继续小步修正。重要修改前可用 Git 保存一个可回退的版本。" },
] as const;

export const PROMPT_FIELDS: { id: PromptField; label: string; placeholder: string }[] = [
  { id: "purpose", label: "网页用途", placeholder: "例如：展示我的学习经历和作品" },
  { id: "audience", label: "目标用户", placeholder: "例如：课程同学和实习招聘者" },
  { id: "features", label: "页面功能", placeholder: "例如：个人简介、技能列表、作品链接、联系方式" },
  { id: "style", label: "视觉风格", placeholder: "例如：深色、简洁、偏技术感，文字清楚" },
  { id: "constraints", label: "技术或运行限制", placeholder: "例如：使用当前项目的原生 HTML/CSS，不安装新依赖，适配手机" },
  { id: "acceptance", label: "验收标准", placeholder: "例如：链接可点击、手机宽度不横向溢出、npm run build 通过" },
];

export class AIAgentLessonState {
  activeModule: AILessonModule = "teammate";
  agentStep = 0;
  cycleStep = 0;
  prompt: Record<PromptField, string> = {
    purpose: "", audience: "", features: "", style: "", constraints: "", acceptance: "",
  };

  setModule(id: AILessonModule): void { this.activeModule = id; }
  nextAgentStep(): void { this.agentStep = Math.min(AGENT_STEPS.length - 1, this.agentStep + 1); }
  previousAgentStep(): void { this.agentStep = Math.max(0, this.agentStep - 1); }
  resetAgent(): void { this.agentStep = 0; }
  setCycleStep(index: number): void {
    if (Number.isInteger(index) && index >= 0 && index < DEVELOPMENT_CYCLE.length) this.cycleStep = index;
  }
  setPromptField(field: PromptField, value: string): void { this.prompt[field] = value; }
  createPrompt(): string {
    const labels: Record<PromptField, string> = {
      purpose: "网页用途", audience: "目标用户", features: "页面功能",
      style: "视觉风格", constraints: "技术或运行限制", acceptance: "验收标准",
    };
    const details = PROMPT_FIELDS.map(({ id }) => "- " + labels[id] + "：" + (this.prompt[id].trim() || "【请补充】"));
    return [
      "请先阅读当前项目，再根据以下需求完成网页任务。",
      "",
      "需求说明：",
      ...details,
      "",
      "请先简要说明实现方案与准备修改的文件，再开始修改。完成后运行合适的检查，并汇报修改内容、测试结果和未解决的问题。不要把未验证的结果说成已通过。",
    ].join("\n");
  }
}

export async function copyPrompt(text: string, writeText: (value: string) => Promise<void>): Promise<void> {
  if (!text.trim()) throw new Error("请先生成提示词。");
  await writeText(text);
}
