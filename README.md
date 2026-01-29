# Shevky Plugin: RSS

Generate RSS 2.0 feeds for Shevky sites. The plugin scans published posts, builds feed items, and writes `feed.xml` to the `dist` folder (and per-language feeds when i18n is enabled).

## Features

- Builds `feed.xml` during `content:load`
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
  "plugins": [
    "@shevky/plugin-rss"
  ]
}
```

The feed will be generated at:

```
dist/feed.xml
```

With i18n enabled, each language gets its own feed:

```
dist/tr/feed.xml
dist/en/feed.xml
```

## License

MIT
