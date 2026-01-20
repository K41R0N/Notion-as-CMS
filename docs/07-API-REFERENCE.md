# API Reference

Complete API documentation for all Netlify Functions that power your Notion-CMS website.

## Table of Contents

1. [Overview](#overview)
2. [blog-list](#blog-list)
3. [blog-detail](#blog-detail)
4. [submit-to-notion](#submit-to-notion)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Caching Strategy](#caching-strategy)

---

## Overview

All Netlify Functions are located in `netlify/functions/` and accessible via:
- Local: `http://localhost:8888/.netlify/functions/[function-name]`
- Production: `https://yoursite.com/.netlify/functions/[function-name]`

### Common Headers

All functions return these headers:

```javascript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}
```

### Environment Variables Required

```bash
NOTION_TOKEN=secret_xxxxx          # Notion API token
NOTION_DATABASE_ID=xxxxx           # Lead database ID (32 chars)
NOTION_BLOG_PAGE_ID=xxxxx          # Blog parent page ID (32 chars)
NODE_ENV=production|development    # Environment mode
```

---

## blog-list

Fetches all blog posts from Notion blog page.

### Endpoint

```
GET /.netlify/functions/blog-list
```

### Request

No parameters required.

**Example:**
```bash
curl https://yoursite.com/.netlify/functions/blog-list
```

### Response

**Status: 200 OK**

```json
{
  "posts": [
    {
      "id": "abc123-def456-ghi789",
      "title": "Getting Started with Notion CMS",
      "description": "Learn how to use Notion as a content management system for your website. This guide covers setup, configuration, and best practices...",
      "heroImage": "https://s3.us-west-2.amazonaws.com/secure.notion-static.com/...",
      "slug": "getting-started-with-notion-cms",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "lastEditedDate": "2024-01-15T14:20:00.000Z",
      "url": "/blog/getting-started-with-notion-cms"
    },
    {
      "id": "xyz789-uvw456-rst123",
      "title": "Advanced Notion Features",
      "description": "Explore advanced features and techniques for building complex sites with Notion...",
      "heroImage": null,
      "slug": "advanced-notion-features",
      "publishedDate": "2024-01-10T08:00:00.000Z",
      "lastEditedDate": "2024-01-12T16:45:00.000Z",
      "url": "/blog/advanced-notion-features"
    }
  ],
  "total": 2,
  "lastUpdated": "2024-01-15T15:00:00.000Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `posts` | Array | Array of blog post objects |
| `posts[].id` | String | Notion page ID |
| `posts[].title` | String | Blog post title |
| `posts[].description` | String | First 200 characters of post content |
| `posts[].heroImage` | String\|null | URL of first image in post (expires in 1 hour) |
| `posts[].slug` | String | URL-friendly identifier (lowercase, hyphenated) |
| `posts[].publishedDate` | String (ISO8601) | Page creation date |
| `posts[].lastEditedDate` | String (ISO8601) | Last edit date |
| `posts[].url` | String | Relative URL path to post |
| `total` | Number | Total number of posts |
| `lastUpdated` | String (ISO8601) | Time of API call |

### Error Responses

**Status: 503 Service Unavailable**

```json
{
  "error": "Blog not configured",
  "message": "NOTION_BLOG_PAGE_ID environment variable not set"
}
```

**Status: 503 Service Unavailable**

```json
{
  "error": "Blog integration not configured properly"
}
```
*Cause: Invalid or expired NOTION_TOKEN*

**Status: 500 Internal Server Error**

```json
{
  "error": "Failed to fetch blog posts",
  "details": "Error message (only in development)"
}
```

### Caching

- **Cache-Control:** `public, max-age=300` (5 minutes)
- Blog list is cached for 5 minutes
- Updates in Notion appear within 5 minutes

### Implementation Details

**Location:** `netlify/functions/blog-list.js`

**Process:**
1. Fetches child pages from `NOTION_BLOG_PAGE_ID`
2. Retrieves metadata for each page
3. Extracts first paragraph as description (200 char limit)
4. Extracts first image as hero image
5. Generates URL-friendly slug from title
6. Sorts by `created_time` (newest first)

**Code Reference:** `netlify/functions/blog-list.js:52-139`

---

## blog-detail

Fetches a single blog post by slug with full HTML content.

### Endpoint

```
GET /.netlify/functions/blog-detail?slug={slug}
```

### Request

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | String | Yes | URL-friendly post identifier |

**Example:**
```bash
curl "https://yoursite.com/.netlify/functions/blog-detail?slug=getting-started-with-notion-cms"
```

### Response

**Status: 200 OK**

```json
{
  "id": "abc123-def456-ghi789",
  "title": "Getting Started with Notion CMS",
  "content": "<p>Welcome to our guide on using Notion as a CMS!</p>\n<h2>Why Notion as CMS?</h2>\n<p>Notion offers several advantages...</p>\n<ul><li>Intuitive editing</li></ul>\n<figure class=\"blog-image\">\n  <img src=\"https://...\" alt=\"Screenshot\" loading=\"lazy\">\n  <figcaption>Caption text</figcaption>\n</figure>\n<blockquote>This is a quote</blockquote>\n<pre><code class=\"language-javascript\">const x = 1;</code></pre>\n<hr>\n",
  "publishedDate": "2024-01-15T10:30:00.000Z",
  "lastEditedDate": "2024-01-15T14:20:00.000Z",
  "slug": "getting-started-with-notion-cms"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Notion page ID |
| `title` | String | Blog post title |
| `content` | String | HTML-rendered content |
| `publishedDate` | String (ISO8601) | Page creation date |
| `lastEditedDate` | String (ISO8601) | Last edit date |
| `slug` | String | URL-friendly identifier |

### HTML Content Structure

The `content` field contains HTML converted from Notion blocks:

| Notion Block | HTML Output |
|--------------|-------------|
| Paragraph | `<p>text</p>` |
| Heading 1 | `<h1>text</h1>` |
| Heading 2 | `<h2>text</h2>` |
| Heading 3 | `<h3>text</h3>` |
| Bulleted List | `<ul><li>item</li></ul>` |
| Numbered List | `<ol><li>item</li></ol>` |
| Image | `<figure class="blog-image"><img src="..." alt="..."><figcaption>...</figcaption></figure>` |
| Quote | `<blockquote>text</blockquote>` |
| Code | `<pre><code class="language-{lang}">code</code></pre>` |
| Divider | `<hr>` |

**Text Formatting:**
- Bold: `<strong>`
- Italic: `<em>`
- Strikethrough: `<del>`
- Underline: `<u>`
- Inline code: `<code>`
- Links: `<a href="..." target="_blank" rel="noopener noreferrer">`

### Error Responses

**Status: 400 Bad Request**

```json
{
  "error": "Blog post slug is required"
}
```

**Status: 404 Not Found**

```json
{
  "error": "Blog post not found"
}
```

**Status: 503 Service Unavailable**

```json
{
  "error": "Blog not configured",
  "message": "NOTION_BLOG_PAGE_ID environment variable not set"
}
```

**Status: 500 Internal Server Error**

```json
{
  "error": "Failed to fetch blog post",
  "details": "Error message (only in development)"
}
```

### Caching

- **Cache-Control:** `public, max-age=600` (10 minutes)
- Blog posts are cached for 10 minutes
- Updates in Notion appear within 10 minutes

### Implementation Details

**Location:** `netlify/functions/blog-detail.js`

**Process:**
1. Finds page matching slug
2. Retrieves all page blocks (with pagination)
3. Converts blocks to HTML using `blocksToHtml()`
4. Escapes HTML to prevent XSS
5. Returns complete post object

**Code References:**
- Main handler: `netlify/functions/blog-detail.js:3-154`
- Block retrieval: `netlify/functions/blog-detail.js:157-175`
- HTML conversion: `netlify/functions/blog-detail.js:178-249`
- Rich text formatting: `netlify/functions/blog-detail.js:252-282`

---

## submit-to-notion

Submits contact form data to Notion database.

### Endpoint

```
POST /.netlify/functions/submit-to-notion
```

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I'm interested in your services."
}
```

**Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | String | Yes | Non-empty string |
| `email` | String | Yes | Valid email format |
| `message` | String | No | Any string (defaults to "No message provided") |

**Example:**
```bash
curl -X POST https://yoursite.com/.netlify/functions/submit-to-notion \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello!"
  }'
```

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "id": "abc123-def456-ghi789"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Always `true` on success |
| `message` | String | Success message |
| `id` | String | Created Notion page ID |

### Error Responses

**Status: 400 Bad Request**

```json
{
  "error": "Name and email are required"
}
```

**Status: 400 Bad Request**

```json
{
  "error": "Invalid email format"
}
```

**Status: 503 Service Unavailable**

```json
{
  "error": "Notion integration not configured properly"
}
```
*Cause: Invalid or expired NOTION_TOKEN*

**Status: 503 Service Unavailable**

```json
{
  "error": "Notion database not found"
}
```
*Cause: Database not shared with integration*

**Status: 400 Bad Request**

```json
{
  "error": "Invalid data format"
}
```
*Cause: Missing required database properties*

**Status: 500 Internal Server Error**

```json
{
  "error": "Failed to submit lead",
  "details": "Error message (only in development)"
}
```

### Notion Database Structure

This function creates pages in a Notion database with these properties:

| Property Name | Type | Value |
|---------------|------|-------|
| Name | Title | User's name |
| Email | Email | User's email |
| Message | Rich Text | User's message |
| Status | Select | "New Lead" (default) |
| Source | Select | "Website" (default) |
| Date Submitted | Date | Current timestamp |

**Database Setup Required:**
1. Create database with exact property names above
2. Add options to Select fields: Status, Source
3. Share database with your Notion integration
4. Copy database ID to `NOTION_DATABASE_ID` env var

### Implementation Details

**Location:** `netlify/functions/submit-to-notion.js`

**Process:**
1. Validates request method (POST only)
2. Parses JSON body
3. Validates required fields (name, email)
4. Validates email format (regex)
5. Creates page in Notion database
6. Returns success response with page ID

**Code Reference:** `netlify/functions/submit-to-notion.js:21-140`

**Email Validation Regex:**
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "User-friendly error message",
  "details": "Technical details (development only)"
}
```

### Notion API Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `unauthorized` | 401 | Invalid or expired NOTION_TOKEN |
| `object_not_found` | 404 | Page/database not found or not shared |
| `validation_error` | 400 | Invalid request parameters |
| `rate_limited` | 429 | Too many requests (>3/sec) |
| `service_unavailable` | 503 | Notion API is down |

### Error Handling Pattern

```javascript
try {
  const response = await notion.pages.retrieve({ page_id: pageId });
} catch (error) {
  console.error('Error:', error);

  let errorMessage = 'Failed to fetch page';
  let statusCode = 500;

  if (error.code === 'unauthorized') {
    errorMessage = 'Integration not configured';
    statusCode = 503;
  } else if (error.code === 'object_not_found') {
    errorMessage = 'Page not found';
    statusCode = 404;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  };
}
```

---

## Rate Limiting

### Notion API Limits

- **Rate:** 3 requests per second per integration
- **Burst:** Up to 10 requests can be queued
- **Daily:** No documented daily limit

### Netlify Function Limits

- **Execution Time:** 10 seconds (free), 26 seconds (paid)
- **Concurrent:** 1000 concurrent executions
- **Monthly:** 125k function invocations (free), unlimited (paid)

### Best Practices

1. **Cache responses** to reduce API calls
2. **Implement retry logic** with exponential backoff
3. **Batch requests** when possible
4. **Monitor usage** in Netlify dashboard

### Retry Logic Example

```javascript
async function fetchWithRetry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.code === 'rate_limited' && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(fn, retries - 1);
    }
    throw error;
  }
}
```

---

## Caching Strategy

### Cache Headers

| Function | Cache Duration | CDN Cache |
|----------|---------------|-----------|
| blog-list | 5 minutes | Yes |
| blog-detail | 10 minutes | Yes |
| submit-to-notion | No cache | No |

### Cache-Control Headers

```javascript
// Short-lived cache (blog list)
'Cache-Control': 'public, max-age=300'  // 5 minutes

// Medium cache (blog detail)
'Cache-Control': 'public, max-age=600'  // 10 minutes

// No cache (form submission)
'Cache-Control': 'no-cache, no-store, must-revalidate'
```

### Cache Invalidation

Caches expire automatically. To force refresh:

1. **Wait for cache expiry** (5-10 minutes)
2. **Hard refresh browser** (Cmd/Ctrl + Shift + R)
3. **Clear Netlify CDN cache** in dashboard
4. **Update cache headers** and redeploy

### Client-Side Caching

```javascript
// Store in localStorage for faster subsequent loads
localStorage.setItem('blog-posts', JSON.stringify(posts));

// Check cache before fetching
const cached = localStorage.getItem('blog-posts');
if (cached) {
  const data = JSON.parse(cached);
  if (Date.now() - data.timestamp < 300000) { // 5 min
    return data.posts;
  }
}
```

---

## Testing API Endpoints

### Using cURL

```bash
# Test blog list
curl https://yoursite.com/.netlify/functions/blog-list

# Test blog detail
curl "https://yoursite.com/.netlify/functions/blog-detail?slug=test-post"

# Test form submission
curl -X POST https://yoursite.com/.netlify/functions/submit-to-notion \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","message":"Hi"}'
```

### Using JavaScript

```javascript
// Test blog list
fetch('/.netlify/functions/blog-list')
  .then(r => r.json())
  .then(console.log);

// Test blog detail
fetch('/.netlify/functions/blog-detail?slug=test-post')
  .then(r => r.json())
  .then(console.log);

// Test form submission
fetch('/.netlify/functions/submit-to-notion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test',
    email: 'test@test.com',
    message: 'Hello'
  })
})
  .then(r => r.json())
  .then(console.log);
```

---

## Next Steps

- **Troubleshoot issues** → [Troubleshooting Guide](./08-TROUBLESHOOTING.md)
- **Optimize SEO** → [Agent Prompts](./06-AGENT-PROMPTS.md)
- **Build features** → [Programmatic Pages](./04-PROGRAMMATIC-PAGES.md)
