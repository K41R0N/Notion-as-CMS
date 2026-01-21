# Notion-as-CMS Setup Guide

Complete step-by-step guide to setting up your Notion-powered website from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Notion Workspace Setup](#notion-workspace-setup)
3. [Creating Notion Integration](#creating-notion-integration)
4. [Setting Up Your Notion Content](#setting-up-your-notion-content)
5. [Local Development Setup](#local-development-setup)
6. [Environment Configuration](#environment-configuration)
7. [Testing Locally](#testing-locally)
8. [Deploying to Netlify](#deploying-to-netlify)
9. [Verifying Production](#verifying-production)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Notion Account** (free or paid)
- ✅ **Node.js 18+** installed ([Download](https://nodejs.org))
- ✅ **Git** installed ([Download](https://git-scm.com))
- ✅ **Netlify Account** (free tier works) ([Sign up](https://app.netlify.com))
- ✅ **Code Editor** (VS Code, Cursor, etc.)
- ✅ **Basic understanding** of HTML/CSS/JavaScript

**Check your versions:**
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v8 or higher
git --version   # Any recent version
```

---

## Notion Workspace Setup

### Step 1: Create Your Workspace Structure

In Notion, create the following structure:

```
📄 Your Workspace
  ├── 📊 Lead Database (for contact form submissions)
  └── 📝 Blog (page with child pages for blog posts)
```

### Step 2: Create Lead Database

1. **Create a new page** in Notion called "Lead Database"
2. **Convert to database** (click "..." → Turn into → Database - Inline)
3. **Add the following properties:**

| Property Name | Property Type | Configuration |
|--------------|---------------|---------------|
| Name | Title | Default (auto-created) |
| Email | Email | - |
| Message | Text | Long text enabled |
| Status | Select | Options: "New Lead", "Contacted", "Qualified", "Closed" |
| Source | Select | Options: "Website", "Referral", "Social Media" |
| Date Submitted | Date | Include time enabled |

4. **Save the database ID:**
   - Click "Share" → Copy the link
   - Extract the ID from the URL:
     ```
     https://notion.so/workspace/[DATABASE_ID]?v=...
                              ^^^^^^^^^^^^^^^^
                              This is your DATABASE_ID
     ```
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Step 3: Create Blog Parent Page

1. **Create a new page** called "Blog" (or "ABI Blog", etc.)
2. **Do NOT convert to database** - keep it as a regular page
3. **Add child pages** for each blog post:
   - Click "+ New page" inside the Blog page
   - Each child page = one blog post
   - Page title = blog post title
4. **Save the page ID:**
   - Click "Share" → Copy the link
   - Extract the ID (same format as database ID)
   - Example: `z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4`

---

## Creating Notion Integration

### Step 1: Create Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Configure:
   - **Name:** "Your Website Integration" (or any name)
   - **Associated workspace:** Select your workspace
   - **Type:** Internal
   - **Capabilities:**
     - ✅ Read content
     - ✅ Insert content
     - ✅ Update content (optional)
4. Click **"Submit"**
5. **Copy the "Internal Integration Token"** (starts with `secret_`)
   - ⚠️ **Keep this secret!** Never commit to git

### Step 2: Share Databases with Integration

**For Lead Database:**
1. Open your Lead Database in Notion
2. Click **"Share"** (top right)
3. Click **"Invite"**
4. Search for your integration name
5. Click **"Invite"** → Integration now has access

**For Blog Page:**
1. Open your Blog parent page
2. Click **"Share"**
3. Click **"Invite"**
4. Search for your integration name
5. Click **"Invite"**

⚠️ **Important:** Your integration can only access pages/databases explicitly shared with it.

---

## Setting Up Your Notion Content

### Blog Post Template

Each blog post (child page under "Blog") should follow this structure:

```
📝 Your Blog Post Title
  ├── [Image] (optional hero image)
  ├── [Paragraph] Introduction paragraph (becomes description)
  ├── [Heading 2] Section Title
  ├── [Paragraph] Section content
  ├── [Bulleted List] Key points
  ├── [Image] Content image with caption
  ├── [Code] Code block
  ├── [Quote] Blockquote
  └── [Divider] Section separator
```

**Supported Block Types:**
- Paragraph
- Heading 1, 2, 3
- Bulleted list
- Numbered list
- Image (with caption)
- Quote
- Code block (with language)
- Divider

See [Notion Block Types Reference](./02-NOTION-BLOCK-TYPES.md) for complete list.

### Example Blog Post

**Title:** "Getting Started with Notion-as-CMS"

**Content:**
```
[Image: Hero image showing Notion interface]

Welcome to our guide on using Notion as a CMS! In this post, we'll explore how to build dynamic websites powered by Notion's flexible content management.

## Why Notion as CMS?

Notion offers several advantages as a content management system:

• Intuitive editing interface
• Real-time collaboration
• Flexible content structure
• No database setup required

[Code: javascript]
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const response = await notion.blocks.children.list({ block_id: pageId });

## Getting Started

First, you'll need to create a Notion integration...

[Quote]
"Notion-as-CMS changed how we manage content for our marketing site."

---

[Divider used above to separate sections]
```

---

## Local Development Setup

### Step 1: Clone or Create Project

**Option A: Clone existing project**
```bash
git clone https://github.com/your-repo/your-project.git
cd your-project
```

**Option B: Create new project**
```bash
mkdir my-notion-website
cd my-notion-website
git init
```

### Step 2: Install Dependencies

```bash
npm install @notionhq/client netlify-cli --save-dev
```

This installs:
- `@notionhq/client` - Official Notion API client
- `netlify-cli` - Local development server with Functions support

### Step 3: Create Project Structure

```bash
mkdir -p netlify/functions css js pages fonts images
touch index.html netlify.toml .env.example .env .gitignore
```

Your structure should look like:
```
my-notion-website/
├── netlify/
│   └── functions/
├── css/
├── js/
├── pages/
├── fonts/
├── images/
├── index.html
├── netlify.toml
├── .env
├── .env.example
└── .gitignore
```

---

## Environment Configuration

### Step 1: Create .gitignore

```bash
# .gitignore
node_modules/
.env
.netlify/
.DS_Store
```

### Step 2: Create .env.example (Template)

```bash
# .env.example
NOTION_TOKEN=secret_your_notion_integration_token_here
NOTION_DATABASE_ID=your_32_character_database_id_here

# Page Type Configuration (Optional)
# Set parent page IDs to enable automatic page type detection
# Child pages inherit the style of their configured parent
NOTION_BLOG_PAGE_ID=your_32_character_blog_parent_id
NOTION_LANDING_PAGE_ID=your_32_character_landing_parent_id
NOTION_DOCS_PAGE_ID=your_32_character_docs_parent_id

NODE_ENV=production
```

### Step 3: Create .env (Actual Secrets)

```bash
# .env
NOTION_TOKEN=secret_abc123xyz789...
NOTION_DATABASE_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Page Type Configuration
NOTION_BLOG_PAGE_ID=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4
NOTION_LANDING_PAGE_ID=b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6
NOTION_DOCS_PAGE_ID=m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6

NODE_ENV=development
```

**How to fill in:**
1. `NOTION_TOKEN` - From "Creating Notion Integration" step
2. `NOTION_DATABASE_ID` - From "Create Lead Database" step
3. `NOTION_BLOG_PAGE_ID` - Parent page for blog posts (article layout)
4. `NOTION_LANDING_PAGE_ID` - Parent page for landing pages (full-width layout)
5. `NOTION_DOCS_PAGE_ID` - Parent page for documentation (sidebar + TOC layout)
6. `NODE_ENV` - Use "development" for local, "production" for Netlify

### Page Type System

The CMS automatically detects page types based on parent page hierarchy:

| Page Type | Layout Style | Features |
|-----------|--------------|----------|
| **Blog** | Article | Date, author, share buttons, narrow content |
| **Landing** | Full-width | Large typography, no date, marketing-focused |
| **Docs** | Sidebar | Navigation sidebar, table of contents, prev/next |

**How it works:**
1. Set environment variables with parent page IDs
2. Grant your integration access to those parent pages
3. Any child pages automatically inherit the parent's page type
4. Pages not under any configured parent default to "landing" style

**Example Structure:**
```
Your Workspace
├── Blog (NOTION_BLOG_PAGE_ID)
│   ├── Post 1 → renders as /blog/post-1 (blog layout)
│   └── Post 2 → renders as /blog/post-2 (blog layout)
├── Documentation (NOTION_DOCS_PAGE_ID)
│   ├── Getting Started → renders as /docs/getting-started (docs layout)
│   └── API Reference → renders as /docs/api-reference (docs layout)
├── Landing Pages (NOTION_LANDING_PAGE_ID)
│   └── About Us → renders as /page/about-us (landing layout)
└── Random Page → renders as /page/random-page (landing layout - default)
```

⚠️ **Never commit .env to git!** Only commit .env.example

### Step 4: Create netlify.toml

```toml
# netlify.toml
[build]
  publish = "."
  functions = "netlify/functions"
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/blog"
  to = "/pages/blog.html"
  status = 200

[[redirects]]
  from = "/blog/*"
  to = "/pages/blog-post.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Step 5: Create package.json

```json
{
  "name": "notion-cms-website",
  "version": "1.0.0",
  "description": "Website powered by Notion as CMS",
  "scripts": {
    "dev": "netlify dev",
    "build": "echo 'No build step required for static site'",
    "deploy": "netlify deploy --prod"
  },
  "dependencies": {
    "@notionhq/client": "^2.2.15"
  },
  "devDependencies": {
    "netlify-cli": "^17.10.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Testing Locally

### Step 1: Copy Netlify Functions

Copy the three Netlify Functions from the reference implementation:
- `netlify/functions/blog-list.js`
- `netlify/functions/blog-detail.js`
- `netlify/functions/submit-to-notion.js`

(See [API Reference](./07-API-REFERENCE.md) for complete code)

### Step 2: Start Local Development Server

```bash
npm run dev
```

This starts:
- 🌐 Web server at `http://localhost:8888`
- ⚡ Netlify Functions at `http://localhost:8888/.netlify/functions/`

### Step 3: Test Blog List Endpoint

**Open in browser or curl:**
```bash
curl http://localhost:8888/.netlify/functions/blog-list
```

**Expected response:**
```json
{
  "posts": [
    {
      "id": "abc123...",
      "title": "Your Blog Post Title",
      "description": "First 200 characters of your post...",
      "heroImage": "https://...",
      "slug": "your-blog-post-title",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "lastEditedDate": "2024-01-15T14:20:00.000Z",
      "url": "/blog/your-blog-post-title"
    }
  ],
  "total": 1,
  "lastUpdated": "2024-01-15T15:00:00.000Z"
}
```

### Step 4: Test Blog Detail Endpoint

```bash
curl "http://localhost:8888/.netlify/functions/blog-detail?slug=your-blog-post-title"
```

**Expected response:**
```json
{
  "id": "abc123...",
  "title": "Your Blog Post Title",
  "content": "<p>Your HTML content here...</p>...",
  "publishedDate": "2024-01-15T10:30:00.000Z",
  "lastEditedDate": "2024-01-15T14:20:00.000Z",
  "slug": "your-blog-post-title"
}
```

### Step 5: Test Form Submission

```bash
curl -X POST http://localhost:8888/.netlify/functions/submit-to-notion \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Testing form submission"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "id": "page-id-abc123..."
}
```

**Verify in Notion:**
1. Open your Lead Database
2. You should see a new entry with the test data

---

## Deploying to Netlify

### Step 1: Create GitHub Repository

```bash
git add .
git commit -m "Initial commit: Notion-CMS setup"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### Step 2: Connect to Netlify

**Option A: Netlify UI (Recommended)**
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"GitHub"** (or GitLab/Bitbucket)
4. Authorize Netlify to access your repos
5. Select your repository
6. Configure build settings:
   - **Build command:** (leave empty)
   - **Publish directory:** `.` (current directory)
   - **Functions directory:** `netlify/functions`
7. Click **"Deploy site"**

**Option B: Netlify CLI**
```bash
netlify login
netlify init
# Follow prompts to create new site
```

### Step 3: Configure Environment Variables

In Netlify dashboard:
1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Add each variable:
   - `NOTION_TOKEN` = `secret_abc123...`
   - `NOTION_DATABASE_ID` = `a1b2c3d4...`
   - `NOTION_BLOG_PAGE_ID` = `z9y8x7w6...`
   - `NODE_ENV` = `production`

⚠️ **Important:** Copy values exactly from your `.env` file

### Step 4: Trigger Deployment

**Option A: Git Push (Automatic)**
```bash
git push origin main
# Netlify auto-deploys on push
```

**Option B: Manual Deploy**
```bash
netlify deploy --prod
```

### Step 5: Get Your Site URL

After deployment completes:
1. Netlify will show your site URL: `https://your-site-name.netlify.app`
2. (Optional) Configure custom domain in Netlify settings

---

## Verifying Production

### Checklist

- [ ] **Landing page loads** - Visit `https://your-site.netlify.app`
- [ ] **Blog page loads** - Visit `https://your-site.netlify.app/blog`
- [ ] **Blog posts display** - Check if blog posts appear
- [ ] **Blog post detail loads** - Click a blog post
- [ ] **Contact form works** - Submit a test lead
- [ ] **Notion receives lead** - Check Lead Database in Notion
- [ ] **Styles load correctly** - No broken CSS
- [ ] **Images load** - Hero images and content images display
- [ ] **Mobile responsive** - Test on phone or DevTools

### Testing Endpoints

**Blog List:**
```bash
curl https://your-site.netlify.app/.netlify/functions/blog-list
```

**Blog Detail:**
```bash
curl "https://your-site.netlify.app/.netlify/functions/blog-detail?slug=your-post-slug"
```

**Form Submission:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/submit-to-notion \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello"}'
```

---

## Common Issues

### Issue: "Notion integration not configured properly"

**Cause:** `NOTION_TOKEN` is missing or invalid

**Solution:**
1. Check environment variables in Netlify dashboard
2. Verify token starts with `secret_`
3. Re-create integration if token is expired
4. Re-deploy after updating env vars

### Issue: "Blog page not found"

**Cause:** `NOTION_BLOG_PAGE_ID` is incorrect or page not shared

**Solution:**
1. Verify page ID in Notion URL
2. Ensure integration is invited to the Blog page
3. Check that page has child pages (blog posts)

### Issue: "No blog posts appearing"

**Cause:** Blog page has no child pages, or integration lacks access

**Solution:**
1. Create child pages under Blog parent page
2. Verify integration is shared with Blog page
3. Check Netlify Function logs for errors
4. Wait for cache to expire (5 minutes)

### Issue: "Form submission not working"

**Cause:** Database not configured or not shared

**Solution:**
1. Verify `NOTION_DATABASE_ID` is correct
2. Ensure database has required properties (Name, Email, etc.)
3. Share database with integration
4. Check browser console for errors

---

## Next Steps

✅ **Setup complete!** You now have a working Notion-powered website.

**What's next?**

1. **Customize styling** → [Component Styling Guide](./03-COMPONENT-STYLING.md)
2. **Add more content types** → [Notion Block Types Reference](./02-NOTION-BLOCK-TYPES.md)
3. **Create programmatic pages** → [Programmatic Pages Guide](./04-PROGRAMMATIC-PAGES.md)
4. **Extend with Sveltia CMS** → [Sveltia Integration](./05-SVELTIA-CMS-INTEGRATION.md)

---

## Quick Reference

**Environment Variables:**
```bash
NOTION_TOKEN=secret_...
NOTION_DATABASE_ID=32-char-id
NOTION_BLOG_PAGE_ID=32-char-id
NODE_ENV=production
```

**Local Commands:**
```bash
npm run dev      # Start local server
npm run deploy   # Deploy to Netlify
```

**Important URLs:**
- Notion Integrations: https://notion.so/my-integrations
- Netlify Dashboard: https://app.netlify.com
- Local Dev: http://localhost:8888

**File Locations:**
- Functions: `netlify/functions/*.js`
- Styles: `css/*.css`
- Pages: `pages/*.html`
- Config: `netlify.toml`, `.env`

---

**Need help?** See [Troubleshooting Guide](./08-TROUBLESHOOTING.md)
