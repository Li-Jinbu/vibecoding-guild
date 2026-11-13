import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Actions 会自动使用实际仓库名；本地开发和未知仓库场景使用根路径。
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = repositoryName ? `/${repositoryName}/` : "/";

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        course: fileURLToPath(new URL("./course/index.html", import.meta.url)),
      },
    },
  },
});
