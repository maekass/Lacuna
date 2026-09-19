import type { StorybookConfig } from "@storybook/nextjs-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const srcAlias = path.resolve(dirname, "../src");

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  viteFinal: (config) => {
    config.resolve = config.resolve ?? {};
    const current = config.resolve.alias;
    if (Array.isArray(current)) {
      config.resolve.alias = [
        ...current,
        { find: "@", replacement: srcAlias },
      ];
    } else {
      config.resolve.alias = { ...current, "@": srcAlias };
    }
    return config;
  },
};

export default config;
