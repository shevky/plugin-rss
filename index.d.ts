import type { PluginDefinition, PluginHooks } from "@shevky/base";

export type RssPluginConfig = {
  feedFilename?: string;
  feedTtl?: number;
  feedItemCount?: number;
};

declare const plugin: PluginDefinition & { hooks: PluginHooks };

export default plugin;
