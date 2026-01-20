# Programmatic Pages Guide

Learn how to build dynamic, data-driven pages using Notion as your content source. This guide covers blog listing, detail pages, dynamic routing, and advanced patterns.

## Table of Contents

1. [Understanding Programmatic Pages](#understanding-programmatic-pages)
2. [Blog Listing Implementation](#blog-listing-implementation)
3. [Blog Detail Pages](#blog-detail-pages)
4. [Dynamic Routing Strategies](#dynamic-routing-strategies)
5. [SEO for Dynamic Pages](#seo-for-dynamic-pages)
6. [Performance Optimization](#performance-optimization)
7. [Advanced Patterns](#advanced-patterns)

---

## Understanding Programmatic Pages

### What are Programmatic Pages?

Programmatic pages are web pages generated from data rather than hard-coded HTML. Instead of creating `blog-post-1.html`, `blog-post-2.html`, etc., you create a single template that renders different content based on the URL.

### Architecture

```
User Request: /blog/my-post-title
       ↓
Netlify Redirect (netlify.toml)
       ↓
Static Template: /pages/blog-post.html
       ↓
JavaScript Loads (blog-post.js)
       ↓
Extract Slug from URL: "my-post-title"
       ↓
Fetch from API: /.netlify/functions/blog-detail?slug=my-post-title
       ↓
Render Content Dynamically
```

### Benefits

- ✅ **Single Template:** One HTML file for all posts
- ✅ **Easy Maintenance:** Update template once, affects all posts
- ✅ **Scalable:** Handle thousands of posts without creating files
- ✅ **Real-time Updates:** Content changes in Notion appear automatically
- ✅ **SEO-Friendly:** Each page has unique content and metadata

---

## Blog Listing Implementation

### Step 1: Create Blog Listing Page

**File:** `pages/blog.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog | Your Site Name</title>
  <meta name="description" content="Read our latest articles and insights">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/blog.css">
</head>
<body>
  <!-- Header/Nav -->
  <header class="header">
    <nav class="container">
      <a href="/" class="logo">Your Site</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/blog" class="active">Blog</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <!-- Blog Header -->
  <section class="blog-header">
    <div class="container">
      <h1>Our Blog</h1>
      <p class="blog-subtitle">
        Insights, tutorials, and stories from our team
      </p>
    </div>
  </section>

  <!-- Blog Posts Grid -->
  <section class="blog-posts-section">
    <div class="container">
      <!-- Loading State -->
      <div id="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading posts...</p>
      </div>

      <!-- Posts Grid -->
      <div id="blog-posts-grid" class="blog-posts-grid" style="display: none;">
        <!-- Posts will be injected here by JavaScript -->
      </div>

      <!-- Error State -->
      <div id="error-state" class="error-state" style="display: none;">
        <p>Failed to load blog posts. Please try again later.</p>
      </div>

      <!-- Empty State -->
      <div id="empty-state" class="empty-state" style="display: none;">
        <p>No blog posts yet. Check back soon!</p>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="blog-cta">
    <div class="container">
      <h2>Ready to Get Started?</h2>
      <p>Let's discuss how we can help you achieve your goals.</p>
      <a href="/#contact" class="btn btn-primary">Get in Touch</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p>&copy; 2024 Your Site. All rights reserved.</p>
  </footer>

  <script src="/js/blog.js"></script>
</body>
</html>
```

### Step 2: Create Blog JavaScript

**File:** `js/blog.js`

```javascript
// blog.js - Blog listing functionality

// State
let posts = [];

// DOM Elements
const loadingElement = document.getElementById('loading');
const gridElement = document.getElementById('blog-posts-grid');
const errorElement = document.getElementById('error-state');
const emptyElement = document.getElementById('empty-state');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadBlogPosts();
});

// Fetch blog posts from API
async function loadBlogPosts() {
  try {
    showLoading();

    const response = await fetch('/.netlify/functions/blog-list');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    posts = data.posts || [];

    if (posts.length === 0) {
      showEmpty();
    } else {
      renderBlogPosts(posts);
    }
  } catch (error) {
    console.error('Error loading blog posts:', error);
    showError();
  }
}

// Render blog post cards
function renderBlogPosts(posts) {
  gridElement.innerHTML = posts
    .map(post => createBlogCard(post))
    .join('');

  hideLoading();
  gridElement.style.display = 'grid';
}

// Create individual blog card HTML
function createBlogCard(post) {
  const publishedDate = new Date(post.publishedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <a href="${escapeHtml(post.url)}" class="blog-post-card">
      ${post.heroImage ? `
        <img
          src="${escapeHtml(post.heroImage)}"
          alt="${escapeHtml(post.title)}"
          class="blog-post-image"
          loading="lazy"
        >
      ` : `
        <div class="blog-post-image blog-post-image--placeholder"></div>
      `}
      <div class="blog-post-content">
        <h2 class="blog-post-title">${escapeHtml(post.title)}</h2>
        <p class="blog-post-description">${escapeHtml(post.description)}</p>
        <div class="blog-post-meta">
          <span class="blog-post-date">${publishedDate}</span>
          <span class="blog-post-read-more">Read more →</span>
        </div>
      </div>
    </a>
  `;
}

// UI State Helpers
function showLoading() {
  loadingElement.style.display = 'block';
  gridElement.style.display = 'none';
  errorElement.style.display = 'none';
  emptyElement.style.display = 'none';
}

function hideLoading() {
  loadingElement.style.display = 'none';
}

function showError() {
  loadingElement.style.display = 'none';
  gridElement.style.display = 'none';
  errorElement.style.display = 'block';
  emptyElement.style.display = 'none';
}

function showEmpty() {
  loadingElement.style.display = 'none';
  gridElement.style.display = 'none';
  errorElement.style.display = 'none';
  emptyElement.style.display = 'block';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Step 3: Add Netlify Redirect

**File:** `netlify.toml`

```toml
[[redirects]]
  from = "/blog"
  to = "/pages/blog.html"
  status = 200
```

---

## Blog Detail Pages

### Step 1: Create Blog Detail Template

**File:** `pages/blog-post.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loading... | Your Site Name</title>
  <meta name="description" content="">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/blog.css">

  <!-- Open Graph tags (will be updated by JavaScript) -->
  <meta property="og:title" content="">
  <meta property="og:description" content="">
  <meta property="og:image" content="">
  <meta property="og:url" content="">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
  <!-- Header -->
  <header class="header">
    <nav class="container">
      <a href="/" class="logo">Your Site</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <!-- Blog Post -->
  <article class="blog-post">
    <!-- Loading State -->
    <div id="post-loading" class="post-loading">
      <div class="container-narrow">
        <div class="loading-spinner"></div>
        <p>Loading post...</p>
      </div>
    </div>

    <!-- Post Content -->
    <div id="post-content" style="display: none;">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <div class="container-narrow">
          <a href="/">Home</a> /
          <a href="/blog">Blog</a> /
          <span id="breadcrumb-title">Post Title</span>
        </div>
      </nav>

      <!-- Post Header -->
      <header class="post-header">
        <div class="container-narrow">
          <h1 id="post-title">Post Title</h1>
          <div class="post-meta">
            <time id="post-date">January 15, 2024</time>
            <span id="post-read-time"></span>
          </div>
        </div>
      </header>

      <!-- Post Body -->
      <div class="post-content container-narrow" id="post-body">
        <!-- HTML content will be injected here -->
      </div>

      <!-- Social Share -->
      <div class="post-share">
        <div class="container-narrow">
          <h3>Share this post</h3>
          <div class="share-buttons">
            <a href="#" id="share-twitter" class="share-btn share-btn--twitter" target="_blank" rel="noopener">
              Share on Twitter
            </a>
            <a href="#" id="share-linkedin" class="share-btn share-btn--linkedin" target="_blank" rel="noopener">
              Share on LinkedIn
            </a>
          </div>
        </div>
      </div>

      <!-- Back to Blog -->
      <div class="post-footer">
        <div class="container-narrow">
          <a href="/blog" class="btn btn-secondary">← Back to Blog</a>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div id="post-error" class="post-error" style="display: none;">
      <div class="container-narrow">
        <h1>Post Not Found</h1>
        <p>Sorry, we couldn't find the blog post you're looking for.</p>
        <a href="/blog" class="btn btn-primary">Back to Blog</a>
      </div>
    </div>
  </article>

  <!-- CTA Section -->
  <section class="blog-cta">
    <div class="container">
      <h2>Ready to Get Started?</h2>
      <p>Let's discuss how we can help you achieve your goals.</p>
      <a href="/#contact" class="btn btn-primary">Get in Touch</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p>&copy; 2024 Your Site. All rights reserved.</p>
  </footer>

  <script src="/js/blog-post.js"></script>
</body>
</html>
```

### Step 2: Create Blog Detail JavaScript

**File:** `js/blog-post.js`

```javascript
// blog-post.js - Blog detail page functionality

// DOM Elements
const loadingElement = document.getElementById('post-loading');
const contentElement = document.getElementById('post-content');
const errorElement = document.getElementById('post-error');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const slug = getSlugFromURL();
  if (slug) {
    loadBlogPost(slug);
  } else {
    showError();
  }
});

// Extract slug from URL
function getSlugFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/blog\/([^/]+)/);
  return match ? match[1] : null;
}

// Fetch blog post from API
async function loadBlogPost(slug) {
  try {
    showLoading();

    const response = await fetch(`/.netlify/functions/blog-detail?slug=${encodeURIComponent(slug)}`);

    if (response.status === 404) {
      showError();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const post = await response.json();
    renderBlogPost(post);
  } catch (error) {
    console.error('Error loading blog post:', error);
    showError();
  }
}

// Render blog post
function renderBlogPost(post) {
  // Update document title and meta tags
  document.title = `${post.title} | Your Site Name`;
  updateMetaTags(post);

  // Update breadcrumb
  document.getElementById('breadcrumb-title').textContent = post.title;

  // Update post header
  document.getElementById('post-title').textContent = post.title;

  // Format date
  const publishedDate = new Date(post.publishedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('post-date').textContent = publishedDate;

  // Calculate read time (rough estimate: 200 words per minute)
  const wordCount = post.content.split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 200);
  document.getElementById('post-read-time').textContent = `${readTime} min read`;

  // Inject HTML content
  document.getElementById('post-body').innerHTML = post.content;

  // Set up share buttons
  setupShareButtons(post);

  // Show content
  hideLoading();
  contentElement.style.display = 'block';

  // Smooth scroll for anchor links
  setupSmoothScroll();
}

// Update meta tags for SEO and social sharing
function updateMetaTags(post) {
  // Meta description
  const description = post.content
    .replace(/<[^>]*>/g, '')
    .substring(0, 160) + '...';

  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', description);

  // Open Graph tags
  const url = window.location.href;
  updateMetaTag('property', 'og:title', post.title);
  updateMetaTag('property', 'og:description', description);
  updateMetaTag('property', 'og:url', url);
  updateMetaTag('name', 'twitter:title', post.title);
  updateMetaTag('name', 'twitter:description', description);

  // Extract first image as OG image (if exists)
  const firstImage = post.content.match(/<img[^>]+src="([^">]+)"/);
  if (firstImage) {
    updateMetaTag('property', 'og:image', firstImage[1]);
    updateMetaTag('name', 'twitter:image', firstImage[1]);
  }
}

// Helper to update or create meta tags
function updateMetaTag(attr, attrValue, content) {
  let tag = document.querySelector(`meta[${attr}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Set up social share buttons
function setupShareButtons(post) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(post.title);

  // Twitter
  document.getElementById('share-twitter').href =
    `https://twitter.com/intent/tweet?text=${title}&url=${url}`;

  // LinkedIn
  document.getElementById('share-linkedin').href =
    `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
}

// Set up smooth scrolling for anchor links
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// UI State Helpers
function showLoading() {
  loadingElement.style.display = 'block';
  contentElement.style.display = 'none';
  errorElement.style.display = 'none';
}

function hideLoading() {
  loadingElement.style.display = 'none';
}

function showError() {
  loadingElement.style.display = 'none';
  contentElement.style.display = 'none';
  errorElement.style.display = 'block';
}
```

### Step 3: Add Netlify Redirect

**File:** `netlify.toml`

```toml
[[redirects]]
  from = "/blog/*"
  to = "/pages/blog-post.html"
  status = 200
```

---

## Dynamic Routing Strategies

### Pattern 1: Client-Side Routing (Current)

**Pros:**
- Simple implementation
- No build step required
- Real-time content updates

**Cons:**
- SEO requires JavaScript execution
- Slower initial load (API call required)

### Pattern 2: Static Site Generation (SSG)

Generate HTML files at build time:

```javascript
// build-script.js
const fs = require('fs').promises;
const { Client } = require('@notionhq/client');

async function generateBlogPages() {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  // Get all blog posts
  const response = await notion.blocks.children.list({
    block_id: process.env.NOTION_BLOG_PAGE_ID
  });

  for (const block of response.results) {
    if (block.type === 'child_page') {
      const page = await notion.pages.retrieve({ page_id: block.id });
      const title = page.properties.title.title[0].plain_text;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Generate HTML file
      const html = await generateHTML(page);
      await fs.writeFile(`blog/${slug}.html`, html);
    }
  }
}
```

**Pros:**
- Perfect SEO (static HTML)
- Fastest load times
- No API calls at runtime

**Cons:**
- Requires rebuild for updates
- More complex deployment

### Pattern 3: Hybrid (Incremental Static Regeneration)

Combine static generation with runtime updates:

```javascript
// Use Netlify On-Demand Builders
exports.handler = async (event, context) => {
  const slug = event.path.split('/').pop();

  // Check if static version exists
  const cached = await getCachedHTML(slug);
  if (cached && !isStale(cached)) {
    return cached;
  }

  // Generate fresh HTML
  const html = await generateHTML(slug);
  await cacheHTML(slug, html);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html
  };
};
```

---

## SEO for Dynamic Pages

### Server-Side Rendering (Recommended)

Use Netlify Edge Functions for true SSR:

```javascript
// netlify/edge-functions/blog-post.js
export default async (request, context) => {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').pop();

  // Fetch post data
  const post = await fetch(
    `https://yoursite.com/.netlify/functions/blog-detail?slug=${slug}`
  ).then(r => r.json());

  // Generate HTML with post data
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${post.title} | Your Site</title>
      <meta name="description" content="${post.description}">
      <meta property="og:title" content="${post.title}">
    </head>
    <body>
      <h1>${post.title}</h1>
      <div>${post.content}</div>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
};
```

### Prerendering

Use services like Prerender.io or Netlify's built-in prerendering:

```toml
# netlify.toml
[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NETLIFY_USE_PRERENDERING = "true"
```

---

## Performance Optimization

### 1. Caching Strategy

```javascript
// blog-detail.js
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
      'CDN-Cache-Control': 'max-age=3600',
      'Netlify-CDN-Cache-Control': 'max-age=3600'
    },
    body: JSON.stringify(post)
  };
};
```

### 2. Prefetching

```javascript
// blog.js - Prefetch first post
const firstPost = posts[0];
if (firstPost) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `/.netlify/functions/blog-detail?slug=${firstPost.slug}`;
  document.head.appendChild(link);
}
```

### 3. Lazy Loading

Already implemented with `loading="lazy"` on images!

---

## Advanced Patterns

### Pattern 1: Categories/Tags

Add filtering to blog list:

```javascript
// blog.js
function filterByCategory(category) {
  const filtered = posts.filter(post =>
    post.categories && post.categories.includes(category)
  );
  renderBlogPosts(filtered);
}
```

### Pattern 2: Pagination

```javascript
const POSTS_PER_PAGE = 9;
let currentPage = 1;

function renderPage(page) {
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = posts.slice(start, end);

  renderBlogPosts(pagePosts);
  renderPagination(page, Math.ceil(posts.length / POSTS_PER_PAGE));
}
```

### Pattern 3: Search

```javascript
function searchPosts(query) {
  const results = posts.filter(post =>
    post.title.toLowerCase().includes(query.toLowerCase()) ||
    post.description.toLowerCase().includes(query.toLowerCase())
  );
  renderBlogPosts(results);
}
```

---

## Next Steps

- **Review API reference** → [API Reference](./07-API-REFERENCE.md)
- **Optimize SEO** → [SEO Optimization Agent](./06-AGENT-PROMPTS.md#seo-optimization-agent)
- **Fix issues** → [Troubleshooting Guide](./08-TROUBLESHOOTING.md)
