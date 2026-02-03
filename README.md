# Shevky Plugin: RSS

Generate RSS 2.0 feeds for Shevky sites. The plugin scans published posts, builds feed items, and writes `feed.xml` to the `dist` folder (and per-language feeds when i18n is enabled).

## Features

- Builds `feed.xml` during `content:ready`
- Supports multilingual feeds (`/tr/feed.xml`, etc.)
- Uses post title, description, dates, categories, and tags
- Adds Atom self/alternate links and basic metadata

## Installation

```bash
npm i @shevky/plugin-rss
```

## Usage

Add the plugin to your config:

```json
{
  "identity": {
    "url": "https://example.com",
    "author": "Jane Doe",
    "email": "jane@example.com"
  },
  "pluginConfigs": {
    "shevky-rss": {
      "feedFilename": "feed.xml",
      "feedTtl": 1440,
      "feedItemCount": 50
    }
  },
  "plugins": [
    "@shevky/plugin-rss"
  ]
}
```

The feed will be generated at:

```txt
dist/feed.xml
```

With i18n enabled, each language gets its own feed:

```txt
dist/tr/feed.xml
dist/en/feed.xml
```

To enable i18n feeds, configure `content.languages` in `site.json`:

```json
{
  "content": {
    "languages": {
      "default": "tr",
      "supported": ["tr", "en"]
    }
  }
}
```

The feed output path is derived from each language’s `canonical` URL in `content.languages.canonical`. If a canonical base is set for a language, the feed URL follows it (e.g. `/en/` -> `/en/feed.xml`).

### Config Options

- `feedFilename`: Output file name (default: `feed.xml`)
- `feedTtl`: RSS TTL value in minutes (default: `1440`)
- `feedItemCount`: Max items per feed (default: no limit)

## License

MIT
