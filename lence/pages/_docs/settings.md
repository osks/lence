---
title: Settings
---

# Settings

Configure Lence behavior with `settings.yaml` at your project root.

## Example

```yaml
# settings.yaml
title: Acme Analytics
docs: edit
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
| `edit` | Show docs link only in edit mode (default) |
| `always` | Always show docs link |
| `never` | Never show docs link |

**Default:** `edit`

When set to `edit` (the default), the "Docs" link appears in the header when running `lence edit` but is hidden when running `lence serve`.

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
