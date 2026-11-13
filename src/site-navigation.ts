export type GuildPage = "home" | "course";

export function siteNavigationUrls(base: string): {
  home: string;
  messages: string;
  course: string;
  guildTask: string;
  repository: string;
} {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const course = `${normalizedBase}course/`;
  return {
    home: normalizedBase,
    messages: `${normalizedBase}#wall`,
    course,
    guildTask: `${course}?chapter=guild`,
    repository: "https://github.com/Li-Jinbu/vibecoding-guild",
  };
}

export function createGuildNavigation(page: GuildPage, trailing?: HTMLElement): HTMLElement {
  const urls = siteNavigationUrls(import.meta.env.BASE_URL);
  const navigation = document.createElement("div");
  navigation.className = "guild-navigation";
  navigation.dataset.page = page;

  const brand = document.createElement("a");
  brand.className = "guild-navigation__brand";
  brand.href = urls.home;
  brand.setAttribute("aria-label", "Git 冒险者公会首页");
  const seal = document.createElement("span");
  seal.className = "guild-navigation__seal";
  seal.setAttribute("aria-hidden", "true");
  seal.textContent = "G";
  const name = document.createElement("span");
  name.className = "guild-navigation__name";
  name.textContent = "Git 冒险者公会";
  brand.append(seal, name);

  const menu = document.createElement("div");
  menu.className = "guild-navigation__menu";
  const toggle = document.createElement("button");
  toggle.className = "guild-navigation__toggle";
  toggle.type = "button";
  toggle.textContent = "导航";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "guild-navigation-links");
  const links = document.createElement("nav");
  links.className = "guild-navigation__links";
  links.id = "guild-navigation-links";
  links.setAttribute("aria-label", "公会网站导航");

  const items = [
    { label: "冒险者留言", href: urls.messages, active: page === "home" },
    { label: "互动课程", href: urls.course, active: page === "course" },
    { label: "GitHub 仓库", href: urls.repository, external: true },
  ];
  for (const item of items) {
    const link = document.createElement("a");
    link.className = "guild-navigation__link";
    link.href = item.href;
    link.textContent = item.label;
    if (item.active) link.setAttribute("aria-current", "page");
    if (item.external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    links.append(link);
  }

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("guild-navigation__menu--open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  links.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("a")) return;
    menu.classList.remove("guild-navigation__menu--open");
    toggle.setAttribute("aria-expanded", "false");
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !menu.classList.contains("guild-navigation__menu--open")) return;
    event.preventDefault();
    event.stopPropagation();
    menu.classList.remove("guild-navigation__menu--open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  });
  menu.append(toggle, links);
  navigation.append(brand, menu);
  if (trailing) {
    trailing.classList.add("guild-navigation__trailing");
    navigation.append(trailing);
  }
  return navigation;
}
