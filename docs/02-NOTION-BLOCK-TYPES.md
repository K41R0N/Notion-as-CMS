# Notion Block Types Reference

Complete reference guide for all Notion block types supported by the Notion-as-CMS implementation, including how they convert to HTML and how to style them.

## Table of Contents

1. [Supported Block Types](#supported-block-types)
2. [Text Blocks](#text-blocks)
3. [Heading Blocks](#heading-blocks)
4. [List Blocks](#list-blocks)
5. [Media Blocks](#media-blocks)
6. [Quote Blocks](#quote-blocks)
7. [Code Blocks](#code-blocks)
8. [Layout Blocks](#layout-blocks)
9. [Text Formatting](#text-formatting)
10. [Unsupported Block Types](#unsupported-block-types)
11. [Workarounds and Tips](#workarounds-and-tips)

---

## Supported Block Types

### Currently Supported ✅

| Notion Block | HTML Output | CSS Class | Notes |
|-------------|-------------|-----------|-------|
| Paragraph | `<p>` | - | Basic text block |
| Heading 1 | `<h1>` | - | Page title |
| Heading 2 | `<h2>` | - | Section headers |
| Heading 3 | `<h3>` | - | Subsection headers |
| Bulleted List | `<ul><li>` | - | Unordered list |
| Numbered List | `<ol><li>` | - | Ordered list |
| Image | `<figure>` | `.blog-image` | Supports captions |
| Quote | `<blockquote>` | - | Blockquote styling |
| Code | `<pre><code>` | `.language-*` | Syntax highlighting ready |
| Divider | `<hr>` | - | Horizontal rule |

### Not Yet Supported ⚠️

- Toggle blocks
- Callout blocks
- Tables
- Embed blocks (YouTube, Twitter, etc.)
- File attachments (PDFs, documents)
- Columns/multi-column layouts
- Synced blocks
- Database views
- Child pages (except as blog post sources)

See [Unsupported Block Types](#unsupported-block-types) for workarounds.

---

## Text Blocks

### Paragraph

**Notion Block:**
```
Just regular text in Notion.
```

**HTML Output:**
```html
<p>Just regular text in Notion.</p>
```

**API Response:**
```json
{
  "type": "paragraph",
  "paragraph": {
    "rich_text": [
      {
        "plain_text": "Just regular text in Notion.",
        "annotations": {}
      }
    ]
  }
}
```

**Conversion Code Location:**
`netlify/functions/blog-detail.js:183-188`

**Usage Tips:**
- Empty paragraphs are automatically skipped
- Line breaks within a paragraph are preserved
- Use for body text, descriptions, and general content

**Styling:**
```css
/* Inherits from blog post content container */
.post-content p {
    line-height: 1.8;
    margin-bottom: 1.5rem;
    color: #2d3748;
}
```

---

## Heading Blocks

### Heading 1

**Notion Block:**
```
# Main Title
```

**HTML Output:**
```html
<h1>Main Title</h1>
```

**Best Practices:**
- Use sparingly (typically once per post)
- Reserved for main post title or major sections
- Automatically SEO-optimized

**Styling:**
```css
.post-content h1 {
    font-size: clamp(2rem, 4vw, 2.5rem);
    font-weight: 800;
    margin: 2.5rem 0 1.5rem;
    color: #000;
    line-height: 1.2;
}
```

### Heading 2

**Notion Block:**
```
## Section Title
```

**HTML Output:**
```html
<h2>Section Title</h2>
```

**Best Practices:**
- Use for major sections
- Creates natural content hierarchy
- Improves SEO and readability

**Styling:**
```css
.post-content h2 {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 700;
    margin: 2rem 0 1rem;
    color: #000;
    border-bottom: 2px solid #FCCB00;
    padding-bottom: 0.5rem;
}
```

### Heading 3

**Notion Block:**
```
### Subsection Title
```

**HTML Output:**
```html
<h3>Subsection Title</h3>
```

**Best Practices:**
- Use for subsections under H2
- Keep hierarchy logical (H1 → H2 → H3)
- Don't skip levels

**Styling:**
```css
.post-content h3 {
    font-size: clamp(1.25rem, 2.5vw, 1.5rem);
    font-weight: 600;
    margin: 1.5rem 0 1rem;
    color: #2d3748;
}
```

---

## List Blocks

### Bulleted List

**Notion Block:**
```
• First item
• Second item
• Third item
```

**HTML Output:**
```html
<ul>
  <li>First item</li>
</ul>
<ul>
  <li>Second item</li>
</ul>
<ul>
  <li>Third item</li>
</ul>
```

⚠️ **Note:** Current implementation creates separate `<ul>` for each item. For proper list grouping, you may need to post-process the HTML.

**Workaround for Grouped Lists:**
```javascript
// In blog-detail.js, after blocksToHtml():
html = html.replace(/<\/ul>\s*<ul>/g, '');
```

**Styling:**
```css
.post-content ul {
    margin: 1rem 0 1rem 1.5rem;
    padding: 0;
}

.post-content ul li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
    color: #4a5568;
}

.post-content ul li::marker {
    color: #FCCB00;  /* Yellow bullet points */
}
```

### Numbered List

**Notion Block:**
```
1. First step
2. Second step
3. Third step
```

**HTML Output:**
```html
<ol>
  <li>First step</li>
</ol>
<ol>
  <li>Second step</li>
</ol>
<ol>
  <li>Third step</li>
</ol>
```

⚠️ **Note:** Same limitation as bulleted lists - creates separate `<ol>` tags.

**Styling:**
```css
.post-content ol {
    margin: 1rem 0 1rem 1.5rem;
    padding: 0;
    counter-reset: item;
}

.post-content ol li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
    color: #4a5568;
}

.post-content ol li::marker {
    color: #000;
    font-weight: 600;
}
```

**Nested Lists:**

Nested lists are not currently supported by the implementation. Lists will be flattened.

**Workaround:** Use indentation with em dashes:
```
• Main point
  — Sub-point (use em dash manually)
  — Another sub-point
• Another main point
```

---

## Media Blocks

### Image Block

**Notion Block:**
```
[Image uploaded or linked]
Caption: Beautiful sunset
```

**HTML Output:**
```html
<figure class="blog-image">
  <img src="https://notion-hosted-url.com/image.jpg" alt="Beautiful sunset" loading="lazy">
  <figcaption>Beautiful sunset</figcaption>
</figure>
```

**API Response:**
```json
{
  "type": "image",
  "image": {
    "file": {
      "url": "https://...",
      "expiry_time": "2024-01-16T00:00:00.000Z"
    },
    "caption": [
      {
        "plain_text": "Beautiful sunset"
      }
    ]
  }
}
```

**Conversion Code Location:**
`netlify/functions/blog-detail.js:215-224`

**Image Sources:**

1. **Uploaded to Notion (file.url):**
   - ✅ Works immediately
   - ⚠️ URLs expire after 1 hour
   - 🔄 URLs refresh on each API call
   - Best for: Development, low-traffic sites

2. **External links (external.url):**
   - ✅ Permanent URLs
   - ✅ No expiration
   - ⚠️ Must be publicly accessible
   - Best for: Production sites, high traffic

**Recommended Workflow:**
- Development: Upload directly to Notion
- Production: Host images on CDN (Cloudinary, Imgix) and use external links

**Styling:**
```css
.blog-image {
    margin: 2rem 0;
    text-align: center;
}

.blog-image img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.blog-image figcaption {
    margin-top: 0.75rem;
    font-size: 0.9rem;
    color: #6b7280;
    font-style: italic;
}
```

**Advanced: Responsive Images**
```css
.blog-image img {
    width: 100%;
    height: auto;
    object-fit: cover;
}

@media (max-width: 768px) {
    .blog-image {
        margin: 1.5rem -1rem;  /* Full bleed on mobile */
    }
}
```

---

## Quote Blocks

### Blockquote

**Notion Block:**
```
> This is a quote from someone important.
```

**HTML Output:**
```html
<blockquote>This is a quote from someone important.</blockquote>
```

**Conversion Code Location:**
`netlify/functions/blog-detail.js:226-229`

**Usage Tips:**
- Great for testimonials
- Pull quotes from the text
- External citations
- Emphasis on key points

**Styling:**
```css
.post-content blockquote {
    margin: 2rem 0;
    padding: 1.5rem 1.5rem 1.5rem 2rem;
    border-left: 4px solid #FCCB00;  /* Yellow accent */
    background: #f8fafc;
    border-radius: 4px;
    font-size: 1.1rem;
    font-style: italic;
    color: #2d3748;
}

.post-content blockquote::before {
    content: '"';
    font-size: 3rem;
    color: #FCCB00;
    line-height: 0;
    margin-right: 0.5rem;
}
```

**Alternative Style (Card-based):**
```css
.post-content blockquote {
    margin: 2rem auto;
    padding: 2rem;
    max-width: 600px;
    background: linear-gradient(135deg, #000 0%, #2d3748 100%);
    color: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    position: relative;
}
```

---

## Code Blocks

### Code Block

**Notion Block:**
````
```javascript
const message = "Hello, World!";
console.log(message);
```
````

**HTML Output:**
```html
<pre><code class="language-javascript">const message = &quot;Hello, World!&quot;;
console.log(message);</code></pre>
```

**API Response:**
```json
{
  "type": "code",
  "code": {
    "language": "javascript",
    "rich_text": [
      {
        "plain_text": "const message = \"Hello, World!\";\nconsole.log(message);"
      }
    ]
  }
}
```

**Conversion Code Location:**
`netlify/functions/blog-detail.js:231-235`

**Supported Languages:**

Notion supports 70+ languages. Common ones:
- JavaScript, TypeScript, Python, Java, C, C++, C#
- HTML, CSS, SCSS, JSON, YAML, XML
- Bash, Shell, SQL, Ruby, Go, Rust, Swift
- PHP, Perl, R, Kotlin, Dart, Lua

Full list: https://developers.notion.com/reference/block#code

**Styling:**
```css
.post-content pre {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: #1e293b;  /* Dark background */
    border-radius: 8px;
    overflow-x: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.post-content code {
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #e2e8f0;
}

/* Inline code (different styling) */
.post-content p code,
.post-content li code {
    background: #f1f5f9;
    color: #dc2626;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.875em;
}
```

**Syntax Highlighting:**

The HTML includes `language-*` class for syntax highlighting libraries:

**Option 1: Prism.js**
```html
<!-- Add to blog-post.html -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
```

**Option 2: Highlight.js**
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
```

**Copy Button for Code Blocks:**
```javascript
// Add to blog-post.js
document.querySelectorAll('pre code').forEach(block => {
  const button = document.createElement('button');
  button.textContent = 'Copy';
  button.className = 'copy-code-button';
  button.onclick = () => {
    navigator.clipboard.writeText(block.textContent);
    button.textContent = 'Copied!';
    setTimeout(() => button.textContent = 'Copy', 2000);
  };
  block.parentElement.appendChild(button);
});
```

---

## Layout Blocks

### Divider

**Notion Block:**
```
---
```

**HTML Output:**
```html
<hr>
```

**Conversion Code Location:**
`netlify/functions/blog-detail.js:237-239`

**Usage Tips:**
- Separate major sections
- Create visual breaks
- Improve readability
- Mark topic transitions

**Styling:**
```css
.post-content hr {
    margin: 3rem 0;
    border: none;
    border-top: 2px solid #e2e8f0;
}

/* Alternative: Decorative divider */
.post-content hr {
    margin: 3rem auto;
    width: 100px;
    border: none;
    border-top: 4px solid #FCCB00;
}

/* Alternative: Gradient divider */
.post-content hr {
    margin: 3rem 0;
    height: 2px;
    border: none;
    background: linear-gradient(to right, transparent, #FCCB00, transparent);
}
```

---

## Text Formatting

All text blocks support rich text formatting (inline styles).

### Bold

**Notion:** `**bold text**` or Cmd/Ctrl+B

**HTML:** `<strong>bold text</strong>`

**Code Location:** `netlify/functions/blog-detail.js:259-261`

### Italic

**Notion:** `*italic text*` or Cmd/Ctrl+I

**HTML:** `<em>italic text</em>`

**Code Location:** `netlify/functions/blog-detail.js:262-264`

### Strikethrough

**Notion:** `~~strikethrough~~` or Cmd/Ctrl+Shift+S

**HTML:** `<del>strikethrough</del>`

**Code Location:** `netlify/functions/blog-detail.js:265-267`

### Underline

**Notion:** Cmd/Ctrl+U

**HTML:** `<u>underline</u>`

**Code Location:** `netlify/functions/blog-detail.js:268-270`

### Inline Code

**Notion:** `` `code` `` or Cmd/Ctrl+E

**HTML:** `<code>code</code>`

**Code Location:** `netlify/functions/blog-detail.js:271-273`

### Links

**Notion:** Cmd/Ctrl+K or paste URL

**HTML:** `<a href="https://..." target="_blank" rel="noopener noreferrer">link text</a>`

**Code Location:** `netlify/functions/blog-detail.js:276-278`

**Styling Example:**
```css
.post-content strong {
    font-weight: 700;
    color: #000;
}

.post-content em {
    font-style: italic;
}

.post-content del {
    text-decoration: line-through;
    color: #9ca3af;
}

.post-content u {
    text-decoration: underline;
    text-decoration-color: #FCCB00;
}

.post-content a {
    color: #FCCB00;
    text-decoration: none;
    border-bottom: 1px solid #FCCB00;
    transition: all 0.2s;
}

.post-content a:hover {
    color: #000;
    border-bottom-color: #000;
}
```

---

## Unsupported Block Types

The following Notion blocks are not currently supported. Here are workarounds:

### Toggle Blocks

**Workaround:**
- Use Heading + Paragraph combination
- Or implement custom toggle with JavaScript

```javascript
// Add toggle functionality
document.querySelectorAll('.toggle-heading').forEach(heading => {
  heading.addEventListener('click', () => {
    const content = heading.nextElementSibling;
    content.classList.toggle('hidden');
  });
});
```

### Callout Blocks

**Workaround:** Use Quote block with emoji

**Notion:**
```
> 💡 Tip: This is useful information!
```

**Styling:**
```css
.post-content blockquote:has(img[alt*="💡"]) {
    background: #dbeafe;
    border-left-color: #3b82f6;
}
```

### Tables

**Workaround:** Use Markdown-style tables in a code block, then parse client-side

**Or:** Use Sveltia CMS for tabular data (see [Sveltia Integration](./05-SVELTIA-CMS-INTEGRATION.md))

### Embed Blocks (YouTube, Twitter, etc.)

**Workaround:** Use external embed services

```javascript
// Client-side embed conversion
function convertEmbedsToIframes() {
  document.querySelectorAll('a[href*="youtube.com"]').forEach(link => {
    const videoId = new URL(link.href).searchParams.get('v');
    const iframe = `<iframe width="560" height="315"
      src="https://www.youtube.com/embed/${videoId}"
      frameborder="0" allowfullscreen></iframe>`;
    link.outerHTML = iframe;
  });
}
```

### File Attachments

**Workaround:** Upload files to cloud storage (S3, Cloudinary) and link

### Columns

**Workaround:** Use CSS Grid in custom HTML

**Or:** Create column layout with CSS classes:
```css
.two-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
}
```

### Database Views

**Workaround:** Use separate Netlify Function to query database

---

## Workarounds and Tips

### Best Practices

1. **Keep it Simple**
   - Use supported blocks whenever possible
   - Complex layouts are harder to maintain
   - Simpler content is more accessible

2. **Image Management**
   - Use external CDN for production
   - Notion-hosted images expire after 1 hour
   - Recommended: Cloudinary, Imgix, or S3

3. **List Formatting**
   - Add post-processing to group list items
   - Or accept separate `<ul>` tags (browsers render correctly)

4. **Code Blocks**
   - Always specify language for syntax highlighting
   - Keep code snippets concise (<50 lines)
   - Use external Gist for long code examples

5. **Performance**
   - Limit images per post (5-10 recommended)
   - Compress images before uploading
   - Use lazy loading (already implemented: `loading="lazy"`)

### Testing Block Types

Create a test blog post with all block types:

```
Test Blog Post: All Block Types

This is a paragraph.

# Heading 1
## Heading 2
### Heading 3

• Bulleted list item 1
• Bulleted list item 2

1. Numbered list item 1
2. Numbered list item 2

[Image with caption]

> This is a quote

```javascript
const code = "example";
```

---

Test **bold**, *italic*, ~~strikethrough~~, and [links](https://example.com).
```

---

## Next Steps

Now that you understand Notion block types:

1. **Style your components** → [Component Styling Guide](./03-COMPONENT-STYLING.md)
2. **Create programmatic pages** → [Programmatic Pages Guide](./04-PROGRAMMATIC-PAGES.md)
3. **Extend functionality** → [Agent Prompts](./06-AGENT-PROMPTS.md)

---

## Quick Reference

**Supported Blocks:**
- Paragraph, Headings (1-3), Lists (bulleted/numbered)
- Images, Quotes, Code, Dividers

**Text Formatting:**
- Bold, Italic, Strikethrough, Underline, Code, Links

**Conversion Function:**
`netlify/functions/blog-detail.js` → `blocksToHtml()`

**Styling Location:**
`css/blog.css` → `.post-content` selectors

**Common Gotchas:**
- Image URLs expire (use external CDN)
- Lists create separate `<ul>`/`<ol>` tags
- Unsupported blocks are silently skipped
