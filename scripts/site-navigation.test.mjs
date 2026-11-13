import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { siteNavigationUrls } from "../src/site-navigation.ts";

test("站内导航根据 Vite base 生成本地与 GitHub Pages 地址", () => {
  assert.deepEqual(siteNavigationUrls("/"), {
    home: "/",
    messages: "/#wall",
    course: "/course/",
    guildTask: "/course/?chapter=guild",
    repository: "https://github.com/Li-Jinbu/vibecoding-guild",
  });
  assert.deepEqual(siteNavigationUrls("/vibecoding-guild/"), {
    home: "/vibecoding-guild/",
    messages: "/vibecoding-guild/#wall",
    course: "/vibecoding-guild/course/",
    guildTask: "/vibecoding-guild/course/?chapter=guild",
    repository: "https://github.com/Li-Jinbu/vibecoding-guild",
  });
  assert.equal(siteNavigationUrls("/vibecoding-guild").course, "/vibecoding-guild/course/");
});

test("首页导航和课程引导复用同一导航组件并保留留言区", async () => {
  const source = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(source, /createGuildNavigation\("home", status\)/);
  assert.match(source, /开启 Git 冒险之旅/);
  assert.match(source, /进入互动课程/);
  assert.match(source, /academyLink\.href = navigationUrls\.course/);
  assert.match(source, /main\.append\(navigation, hero, stats, academyEntry, wall, guide, footer\)/);
  assert.match(source, /fetch\(`\$\{import\.meta\.env\.BASE_URL\}messages\.json`/);
  assert.match(source, /search\.addEventListener\("input", renderMessages\)/);
  assert.match(source, /dataset\.filter === "first"/);
});

test("课程使用当前课程状态的共享导航，编辑器和模拟器仍阻止全局方向键翻页", async () => {
  const source = await readFile(new URL("../src/course/main.ts", import.meta.url), "utf8");
  assert.match(source, /topbar\.append\(createGuildNavigation\("course"\), right\)/);
  assert.match(source, /slideKeysBlocked[\s\S]*guild-navigation/);
  for (const chapter of ["createPrologue", "createMarkdownChapter", "createGitSimulatorChapter", "createCollaborationChapter", "createGuildTaskChapter", "createAIAgentChapter", "createFinalChallengeChapter"]) {
    assert.match(source, new RegExp(chapter));
  }
  assert.match(source, /requestFullscreen\(/);
});

test("导航标记当前页面、保护外部仓库链接并支持窄屏折叠", async () => {
  const navigation = await readFile(new URL("../src/site-navigation.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/site-navigation.css", import.meta.url), "utf8");
  assert.match(navigation, /aria-current", "page"/);
  assert.match(navigation, /noopener noreferrer/);
  assert.match(navigation, /target = "_blank"/);
  assert.match(navigation, /createElement\("button"\)/);
  assert.match(navigation, /aria-expanded/);
  assert.match(navigation, /guild-navigation__menu--open/);
  assert.match(css, /\.guild-navigation__link\[aria-current="page"\]/);
  assert.match(css, /\.guild-navigation__links \{ display: flex/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.guild-navigation__menu--open \.guild-navigation__links/);
  assert.match(css, /\.guild-navigation__links \{ display: none/);
  const courseCss = await readFile(new URL("../src/course/style.css", import.meta.url), "utf8");
  assert.match(courseCss, /\.course-topbar\s*\{[^}]*z-index:\s*20/s);
  assert.doesNotMatch(navigation, /innerHTML/);
});
