# Notion Block Types Reference

Complete reference for all Notion block types supported by this CMS.

## Table of Contents

1. [Supported Block Types](#supported-block-types)
2. [Text Blocks](#text-blocks)
3. [List Blocks](#list-blocks)
4. [Media Blocks](#media-blocks)
5. [Layout Blocks](#layout-blocks)
6. [Interactive Blocks](#interactive-blocks)
7. [Embed Blocks](#embed-blocks)
8. [Advanced Blocks](#advanced-blocks)
9. [Text Formatting](#text-formatting)
10. [Colors](#colors)

---

## Supported Block Types

### All Supported Blocks ✅

| Block Type | HTML Element | CSS Class | Notes |
|------------|--------------|-----------|-------|
| Paragraph | `<p>` | `.notion-paragraph` | Basic text |
| Heading 1 | `<h1>` | `.notion-h1` | Auto-generates anchor ID |
| Heading 2 | `<h2>` | `.notion-h2` | Auto-generates anchor ID |
| Heading 3 | `<h3>` | `.notion-h3` | Auto-generates anchor ID |
| Bulleted List | `<ul><li>` | `.notion-list` | Properly grouped |
| Numbered List | `<ol><li>` | `.notion-list` | Properly grouped |
| To-Do | `<div>` | `.notion-todo` | Checkbox items |
| Quote | `<blockquote>` | `.notion-quote` | Block quotes |
| Callout | `<div>` | `.notion-callout` | With icon and colors |
| Code | `<pre><code>` | `.notion-code` | 70+ languages |
| Divider | `<hr>` | `.notion-divider` | Horizontal rule |
| Image | `<figure>` | `.notion-image` | With captions |
| Video | `<figure>` | `.notion-video` | YouTube/Vimeo/direct |
| Audio | `<figure>` | `.notion-audio` | Audio player |
| File | `<div>` | `.notion-file` | Download link |
| PDF | `<figure>` | `.notion-pdf` | Embedded viewer |
| Embed | `<figure>` | `.notion-embed` | Generic iframes |
| Bookmark | `<div>` | `.notion-bookmark` | URL bookmarks |
| Link Preview | `<div>` | `.notion-link-preview` | URL previews |
| Table | `<table>` | `.notion-table` | Full table support |
| Toggle | `<details>` | `.notion-toggle` | Collapsible content |
| Columns | `<div>` | `.notion-columns` | Multi-column layout |
| Child Page | `<div>` | `.notion-child-page` | Links to pages |
| Link to Page | `<div>` | `.notion-page-link` | Page references |
| Equation | `<div>` | `.notion-equation` | Math expressions |
| Synced Block | - | - | Renders synced content |
| Table of Contents | `<nav>` | `.notion-toc` | Auto-generated TOC |

---

## Text Blocks

### Paragraph

**Type:** `paragraph`

```html
<p class="notion-paragraph">Your text content here.</p>
```

Empty paragraphs are automatically skipped.

---

### Headings

**Types:** `heading_1`, `heading_2`, `heading_3`

```html
<h1 id="auto-generated-slug" class="notion-h1">Heading 1</h1>
<h2 id="auto-generated-slug" class="notion-h2">Heading 2</h2>
<h3 id="auto-generated-slug" class="notion-h3">Heading 3</h3>
```

IDs are auto-generated for anchor linking.

---

### Quote

**Type:** `quote`

```html
<blockquote class="notion-quote">Quote text here.</blockquote>
```

---

### Callout

**Type:** `callout`

```html
<div class="notion-callout notion-callout--blue">
  <span class="notion-callout-icon">💡</span>
  <div class="notion-callout-content">Callout content</div>
</div>
```

Color variants: `--gray`, `--brown`, `--orange`, `--yellow`, `--green`, `--blue`, `--purple`, `--pink`, `--red`

---

### Code

**Type:** `code`

```html
<pre class="notion-code"><code class="language-javascript">const x = 1;</code></pre>
```

With caption:
```html
<figure class="notion-code-figure">
  <pre class="notion-code"><code class="language-javascript">code</code></pre>
  <figcaption class="notion-code-caption">Caption</figcaption>
</figure>
```

Supports 70+ languages. Code is HTML-escaped for security.

---

### Divider

**Type:** `divider`

```html
<hr class="notion-divider" />
```

---

## List Blocks

### Bulleted List

**Type:** `bulleted_list_item`

```html
<ul class="notion-list">
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

Consecutive list items are properly grouped into a single `<ul>`.

---

### Numbered List

**Type:** `numbered_list_item`

```html
<ol class="notion-list">
  <li>Item 1</li>
  <li>Item 2</li>
</ol>
```

Consecutive list items are properly grouped into a single `<ol>`.

---

### To-Do

**Type:** `to_do`

```html
<div class="notion-todo">
  <input type="checkbox" checked disabled />
  <span class="notion-todo--checked">Completed item</span>
</div>
```

---

## Media Blocks

### Image

**Type:** `image`

```html
<figure class="notion-image">
  <img src="url" alt="caption" loading="lazy" />
  <figcaption>Caption text</figcaption>
</figure>
```

Supports both Notion-hosted (`file.url`) and external (`external.url`) images.

**Note:** Notion-hosted images expire after 1 hour. Use external hosting for production.

---

### Video

**Type:** `video`

YouTube embed:
```html
<figure class="notion-video">
  <div class="notion-video-wrapper">
    <iframe src="https://www.youtube.com/embed/VIDEO_ID" allowfullscreen></iframe>
  </div>
</figure>
```

Direct video:
```html
<figure class="notion-video">
  <video controls preload="metadata">
    <source src="video-url" />
  </video>
</figure>
```

Supports YouTube, Vimeo, and direct video files.

---

### Audio

**Type:** `audio`

```html
<figure class="notion-audio">
  <audio controls preload="metadata">
    <source src="audio-url" />
  </audio>
</figure>
```

---

### File

**Type:** `file`

```html
<div class="notion-file">
  <a href="url" class="notion-file-link" target="_blank">
    <span class="notion-file-icon">📎</span>
    <span class="notion-file-name">filename.pdf</span>
  </a>
</div>
```

---

### PDF

**Type:** `pdf`

```html
<figure class="notion-pdf">
  <iframe src="pdf-url" class="notion-pdf-embed"></iframe>
</figure>
```

---

## Layout Blocks

### Columns

**Type:** `column_list` + `column`

```html
<div class="notion-columns">
  <div class="notion-column">Column 1 content</div>
  <div class="notion-column">Column 2 content</div>
</div>
```

Uses CSS Grid with `auto-fit` for responsive columns.

---

### Table

**Type:** `table` + `table_row`

```html
<table class="notion-table">
  <thead>
    <tr><th>Header 1</th><th>Header 2</th></tr>
  </thead>
  <tbody>
    <tr><td>Cell 1</td><td>Cell 2</td></tr>
  </tbody>
</table>
```

Supports column headers, row headers, and alternating row colors.

---

## Interactive Blocks

### Toggle

**Type:** `toggle`

```html
<details class="notion-toggle">
  <summary>Toggle title</summary>
  <div class="notion-toggle-content">
    Hidden content
  </div>
</details>
```

Uses native HTML `<details>` element for no-JS functionality.

---

### Table of Contents

**Type:** `table_of_contents`

```html
<nav class="notion-toc" data-toc="true"></nav>
```

JavaScript populates this with links to all headings on the page.

---

## Embed Blocks

### Embed

**Type:** `embed`

```html
<figure class="notion-embed">
  <iframe src="url" class="notion-embed-iframe" allowfullscreen></iframe>
</figure>
```

---

### Bookmark

**Type:** `bookmark`

```html
<div class="notion-bookmark">
  <a href="url" class="notion-bookmark-link">
    <span class="notion-bookmark-url">https://example.com</span>
  </a>
</div>
```

---

### Link Preview

**Type:** `link_preview`

```html
<div class="notion-link-preview">
  <a href="url">https://example.com</a>
</div>
```

---

## Advanced Blocks

### Child Page

**Type:** `child_page`

```html
<div class="notion-child-page">
  <a href="/page/page-slug">📄 Page Title</a>
</div>
```

---

### Link to Page

**Type:** `link_to_page`

```html
<div class="notion-page-link">
  <a href="/page/page-slug">↗ Page Title</a>
</div>
```

---

### Equation

**Type:** `equation`

```html
<div class="notion-equation" data-equation="E = mc^2">E = mc^2</div>
```

For proper rendering, integrate KaTeX or MathJax.

---

### Synced Block

**Type:** `synced_block`

Renders the synced content directly without a wrapper. Works for both original and synced references.

---

## Text Formatting

All text blocks support rich text annotations:

| Annotation | HTML | CSS Class |
|------------|------|-----------|
| Bold | `<strong>` | - |
| Italic | `<em>` | - |
| Strikethrough | `<del>` | - |
| Underline | `<u>` | - |
| Inline Code | `<code>` | `.notion-inline-code` |
| Link | `<a>` | - |

### Mentions

| Type | HTML | CSS Class |
|------|------|-----------|
| User | `<span>` | `.notion-mention--user` |
| Date | `<span>` | `.notion-mention--date` |
| Page | `<a>` | `.notion-mention--page` |

### Inline Equation

```html
<span class="notion-equation-inline" data-equation="x^2">x^2</span>
```

---

## Colors

### Text Colors

| Color | CSS Class |
|-------|-----------|
| Gray | `.notion-color-gray` |
| Brown | `.notion-color-brown` |
| Orange | `.notion-color-orange` |
| Yellow | `.notion-color-yellow` |
| Green | `.notion-color-green` |
| Blue | `.notion-color-blue` |
| Purple | `.notion-color-purple` |
| Pink | `.notion-color-pink` |
| Red | `.notion-color-red` |

### Background Colors

| Color | CSS Class |
|-------|-----------|
| Gray | `.notion-bg-gray` |
| Brown | `.notion-bg-brown` |
| Orange | `.notion-bg-orange` |
| Yellow | `.notion-bg-yellow` |
| Green | `.notion-bg-green` |
| Blue | `.notion-bg-blue` |
| Purple | `.notion-bg-purple` |
| Pink | `.notion-bg-pink` |
| Red | `.notion-bg-red` |

---

## Best Practices

1. **Use semantic headings** - H1 for page title, H2 for sections, H3 for subsections
2. **Add image captions** - Improves accessibility and SEO
3. **Use callouts for important info** - Different colors for tips, warnings, notes
4. **Host images externally** - Notion URLs expire after 1 hour
5. **Test toggles** - Ensure content is discoverable
6. **Keep tables simple** - Complex nested tables may not render well

---

## Conversion Functions

**Main converter:** `netlify/functions/page-detail.js` → `blocksToHtml()`

**Blog-specific:** `netlify/functions/blog-detail.js` → `blocksToHtml()`

**Styling:** `css/blog.css` → `.notion-*` classes

---

## Next Steps

- [Styling Guide](./03-COMPONENT-STYLING.md) - Customize appearance
- [API Reference](./07-API-REFERENCE.md) - Endpoint documentation
- [Advanced Patterns](./09-ADVANCED-PATTERNS.md) - Custom block handlers
