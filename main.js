import { i18n, plugin, format } from "@shevky/base";

const PLUGIN_NAME = "shevky-rss";
const PLUGIN_VERSION = "0.0.2";
const FEED_FILENAME = "feed.xml";
const FEED_TTL = 1440;
const GENERATOR_NAME = "Shevky Static Site Generator";

const escape = (value) => format.escape(value);
const rssDate = (value) => format.rssDate(value);
const atomDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};
const joinLines = (lines) => lines.filter(Boolean).join("\n");

const isPost = (file) =>
  file?.isValid && !file.isDraft && file.isPublished && file.isPostTemplate;

const parseDate = (date) => (date ? Date.parse(String(date)) || 0 : 0);

const uniqStrings = (items) => [
  ...new Set(
    items
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  ),
];

const getLangConfig = (lang) => i18n.build[lang] ?? i18n.build[i18n.default];

const normalizeBaseUrl = (baseUrl) =>
  baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

const withCdata = (value) => (value ? `<![CDATA[ ${value} ]]>` : "");

const buildCategoryLines = (categories, domain) =>
  uniqStrings(categories)
    .map(
      (category) =>
        `    <category domain="${escape(domain)}">${escape(category)}</category>`,
    )
    .join("\n");

const buildAlternateFeedLinks = (feedUrls, lang) =>
  Object.keys(feedUrls)
    .filter(
      (alternateLang) => alternateLang !== lang && feedUrls[alternateLang],
    )
    .map(
      (alternateLang) =>
        `    <atom:link href="${escape(feedUrls[alternateLang])}" rel="alternate" hreflang="${escape(alternateLang)}" type="application/rss+xml" />`,
    )
    .join("\n");

class RssFeedBuilder {
  async build(ctx) {
    const pluginConfig = ctx.config.get(PLUGIN_NAME) ?? {};
    const feedFilename =
      typeof pluginConfig.feedFilename === "string" &&
      pluginConfig.feedFilename.trim().length > 0
        ? pluginConfig.feedFilename.trim()
        : FEED_FILENAME;
    const feedTtl = Number.isFinite(pluginConfig.feedTtl)
      ? pluginConfig.feedTtl
      : FEED_TTL;
    const feedItemCount = Number.isFinite(pluginConfig.feedItemCount)
      ? pluginConfig.feedItemCount
      : undefined;

    const entries = this._collectEntries(ctx.contentFiles ?? [], ctx);
    if (!entries.length) {
      return;
    }

    const entriesByLang = this._groupEntriesByLang(entries);
    const languages = this._resolveLanguages();
    const feedUrls = this._buildFeedUrls(languages, ctx, feedFilename);

    for (const lang of languages) {
      const langEntries = entriesByLang[lang] ?? [];
      if (!langEntries.length) {
        continue;
      }

      const limitedEntries =
        Number.isFinite(feedItemCount) && feedItemCount > 0
          ? langEntries.slice(0, feedItemCount)
          : langEntries;

      const channel = this._buildChannelMeta(
        lang,
        feedUrls,
        limitedEntries,
        ctx,
        feedFilename,
      );
      const itemsXml = this._renderItems(limitedEntries, ctx);
      const rssXml = this._renderFeed(channel, itemsXml, ctx, feedTtl);
      await this._writeFeed(
        ctx,
        lang,
        rssXml,
        limitedEntries.length,
        feedFilename,
      );
    }
  }

  _collectEntries(contentFiles, ctx) {
    return contentFiles
      .filter(isPost)
      .map((file) => ({
        title: file.title,
        lang: file.lang,
        description: file.description,
        link: format.resolveUrl(file.canonical, ctx.config.identity.url),
        guid: format.resolveUrl(file.canonical, ctx.config.identity.url),
        date: file.date,
        updated: file.updated ?? file.date,
        category: file.category,
        categories: Array.isArray(file.tags) ? file.tags : [],
      }))
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }

  _groupEntriesByLang(entries) {
    return entries.reduce((acc, entry) => {
      const lang = entry.lang || i18n.default;
      (acc[lang] ||= []).push(entry);
      return acc;
    }, /** @type {Record<string, typeof entries>} */ ({}));
  }

  _resolveLanguages() {
    return i18n.supported.length ? i18n.supported : [i18n.default];
  }

  _buildFeedUrls(languages, ctx, feedFilename) {
    return languages.reduce((acc, lang) => {
      const langConfig = getLangConfig(lang);
      const baseUrl = (langConfig?.canonical ?? ctx.config.identity.url) || "";
      acc[lang] = `${normalizeBaseUrl(baseUrl)}${feedFilename}`;
      return acc;
    }, /** @type {Record<string, string>} */ ({}));
  }

  _buildChannelMeta(lang, feedUrls, entries, ctx, feedFilename) {
    const siteTitle = i18n.t(lang, "site.title", ctx.config.identity.author);
    const siteDescription = i18n.t(lang, "site.description", "");
    const langConfig = getLangConfig(lang);
    const channelLink = langConfig?.canonical ?? ctx.config.identity.url;
    const selfFeedLink = feedUrls[lang] ?? `${channelLink}${feedFilename}`;
    const languageCulture = i18n.culture(lang) ?? lang;
    const languageCode = languageCulture.replace("_", "-");
    const lastBuildDate = rssDate(new Date());
    const alternateFeedLinks = buildAlternateFeedLinks(feedUrls, lang);
    const oldestEntry = entries.length ? entries[entries.length - 1] : null;
    const pubDate = oldestEntry?.date ? rssDate(oldestEntry.date) : "";
    const currentYear = new Date().getFullYear();
    const oldestDate = oldestEntry?.date ? new Date(oldestEntry.date) : null;
    const startYear =
      oldestDate && !Number.isNaN(oldestDate.getTime())
        ? oldestDate.getFullYear()
        : currentYear;
    const authorName = ctx.config.identity.author || "";
    const rightsText =
      String(lang).toLowerCase().startsWith("en") ||
      String(languageCulture).toLowerCase().startsWith("en")
        ? "All rights reserved."
        : "Tüm hakları saklıdır.";
    const copyright = authorName
      ? `© ${startYear} - ${currentYear} ${authorName}. ${rightsText}`
      : `© ${startYear} - ${currentYear}. ${rightsText}`;

    return {
      siteTitle,
      siteDescription,
      channelLink,
      selfFeedLink,
      languageCode,
      lastBuildDate,
      alternateFeedLinks,
      pubDate,
      copyright,
    };
  }

  _renderItems(entries, ctx) {
    const authorField =
      ctx.config.identity.email && ctx.config.identity.author
        ? `${ctx.config.identity.email} (${ctx.config.identity.author})`
        : ctx.config.identity.email || ctx.config.identity.author || "";

    return entries
      .map((entry) => this._renderItem(entry, authorField))
      .join("\n");
  }

  _renderItem(entry, authorField) {
    const description = entry.description?.trim() || "";
    const descriptionCdata = withCdata(description);
    const categoryLines = buildCategoryLines([entry.category], "category");
    const tagLines = buildCategoryLines(
      Array.isArray(entry.categories) ? entry.categories : [],
      "tag",
    );

    return joinLines([
      "  <item>",
      `    <title>${escape(entry.title)}</title>`,
      `    <link>${escape(entry.link)}</link>`,
      `    <guid isPermaLink=\"true\">${escape(entry.guid)}</guid>`,
      entry.date ? `    <pubDate>${rssDate(entry.date)}</pubDate>` : "",
      entry.updated
        ? `    <atom:updated>${atomDate(entry.updated)}</atom:updated>`
        : "",
      descriptionCdata
        ? `    <description>${descriptionCdata}</description>`
        : "",
      authorField ? `    <author>${escape(authorField)}</author>` : "",
      categoryLines,
      tagLines,
      "  </item>",
    ]);
  }

  _renderFeed(channel, itemsXml, ctx, feedTtl) {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?xml-stylesheet type="text/xsl" href="/assets/rss.xsl"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      "  <channel>",
      `    <title>${escape(channel.siteTitle)}</title>`,
      `    <link>${escape(channel.channelLink)}</link>`,
      `    <atom:link href="${escape(channel.selfFeedLink)}" rel="self" type="application/rss+xml" />`,
      ...(channel.alternateFeedLinks ? [channel.alternateFeedLinks] : []),
      `    <description>${escape(channel.siteDescription)}</description>`,
      `    <language>${escape(channel.languageCode)}</language>`,
      `    <lastBuildDate>${channel.lastBuildDate}</lastBuildDate>`,
      channel.pubDate ? `    <pubDate>${channel.pubDate}</pubDate>` : "",
      `    <copyright>${escape(channel.copyright)}</copyright>`,
      `    <generator>${GENERATOR_NAME}</generator>`,
      `    <managingEditor>${ctx.config.identity.email} (${ctx.config.identity.author})</managingEditor>`,
      `    <ttl>${feedTtl}</ttl>`,
      itemsXml,
      "  </channel>",
      "</rss>",
      "",
    ].join("\n");
  }

  async _writeFeed(ctx, lang, rssXml, itemCount, feedFilename) {
    const relativePath =
      lang === i18n.default
        ? feedFilename
        : ctx.path.combine(lang, feedFilename);
    const targetPath = ctx.path.combine(ctx.paths.dist, relativePath);
    await ctx.directory.create(ctx.path.name(targetPath));
    await ctx.file.write(targetPath, rssXml);
    ctx.log.debug(`[${PLUGIN_NAME}] RSS '${lang}' feed has been created.`);
  }
}

const rssBuilder = new RssFeedBuilder();

/** @type {import("@shevky/base").PluginHooks} */
const hooks = {
  [plugin.hooks.CONTENT_READY]: async function (ctx) {
    await rssBuilder.build(ctx);
  },
};

const PLUGIN = { name: PLUGIN_NAME, version: PLUGIN_VERSION, hooks };
export default PLUGIN;
