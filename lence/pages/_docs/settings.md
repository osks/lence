---
title: Settings
---

# Settings

Configure Lence behavior with `settings.yaml` at your project root.

## Example

```yaml
# settings.yaml
title: Acme Analytics
docs: dev
showSource: true
```

## Options

### `title`

Site title shown in the header.

**Default:** `Lence`

### `docs`

Controls visibility of the documentation link in the header.

| Value | Description |
|-------|-------------|
| `dev` | Show docs link only in development mode (default) |
| `always` | Always show docs link |
| `never` | Never show docs link, `/_docs/` returns 404 |

**Default:** `dev`

When set to `dev` (the default), the "Docs" link appears in the header when running `lence dev` but is hidden when running `lence serve`.

### `showSource`

Show a "Source" button on pages that lets users view the raw markdown.

**Default:** `false`

## File Location

Place `settings.yaml` in your project root:

```
my-project/
├── settings.yaml    ← Settings file
├── sources.yaml
├── sources/
└── pages/
```
