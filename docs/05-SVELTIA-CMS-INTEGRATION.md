# Sveltia CMS Integration Guide

Learn how to use Sveltia CMS alongside Notion to fill gaps in content management capabilities and create a hybrid CMS approach.

## Table of Contents

1. [What is Sveltia CMS](#what-is-sveltia-cms)
2. [When to Use Sveltia vs Notion](#when-to-use-sveltia-vs-notion)
3. [Setup Guide](#setup-guide)
4. [Configuration Examples](#configuration-examples)
5. [Hybrid CMS Architecture](#hybrid-cms-architecture)
6. [Use Cases](#use-cases)
7. [Migration Strategies](#migration-strategies)

---

## What is Sveltia CMS

**Sveltia CMS** is a modern, Git-based content management system that serves as a lightweight alternative to Netlify CMS. It's designed for static site generators and provides a user-friendly admin interface for managing content stored in Git repositories.

### Key Features

- ✅ **Git-based:** Content stored as files in your repo
- ✅ **No backend required:** Works with static hosting
- ✅ **Asset management:** Upload and manage images, PDFs, etc.
- ✅ **Rich text editor:** WYSIWYG interface for markdown
- ✅ **Custom fields:** Forms, selects, relations, and more
- ✅ **Preview mode:** See changes before publishing
- ✅ **Multi-language:** Built-in i18n support

### Why Combine with Notion?

| Feature | Notion | Sveltia CMS |
|---------|--------|-------------|
| **Content Editing** | ✅ Excellent | ✅ Good |
| **Collaboration** | ✅ Real-time | ⚠️ Git-based |
| **Asset Management** | ⚠️ Limited | ✅ Excellent |
| **Structured Data** | ⚠️ Limited types | ✅ Custom schemas |
| **Configuration** | ❌ Not ideal | ✅ Perfect |
| **Forms/Collections** | ❌ No | ✅ Yes |
| **File Attachments** | ⚠️ Expires | ✅ Permanent |

**Best Approach:** Use Notion for blog content and Sveltia for configuration, static pages, and assets.

---

## When to Use Sveltia vs Notion

### Use Notion For:

1. **Blog Posts**
   - Long-form content
   - Collaborative writing
   - Frequent updates
   - Rich text editing

2. **Dynamic Content**
   - News articles
   - Documentation
   - Knowledge base
   - Team collaboration

3. **Client-Facing Content**
   - Non-technical users prefer Notion
   - Real-time collaboration needed
   - Mobile editing required

### Use Sveltia CMS For:

1. **Site Configuration**
   - Site settings (title, description, SEO)
   - Social media links
   - Analytics IDs
   - Feature flags

2. **Static Pages**
   - About page
   - Privacy policy
   - Terms of service
   - Contact information

3. **Structured Data**
   - Team members (name, role, photo, bio)
   - Services (title, icon, description, price)
   - Testimonials (quote, author, company, rating)
   - FAQ (question, answer, category)

4. **Asset Management**
   - Logos and brand assets
   - Icons and graphics
   - PDFs and downloads
   - Reusable images

5. **Complex Forms**
   - Multi-field configurations
   - Dropdown selections
   - Number ranges
   - Boolean toggles

---

## Setup Guide

### Step 1: Install Sveltia CMS

Create the admin interface:

```bash
mkdir -p public/admin
```

Create `public/admin/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Manager</title>
</head>
<body>
  <script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js" type="module"></script>
</body>
</html>
```

### Step 2: Create Configuration File

Create `public/admin/config.yml`:

```yaml
# Backend configuration
backend:
  name: git-gateway
  branch: main

# Media storage
media_folder: "images/uploads"
public_folder: "/images/uploads"

# Collections
collections:
  # Site Configuration
  - name: "config"
    label: "Site Configuration"
    files:
      - name: "site"
        label: "Site Settings"
        file: "content/site-config.json"
        fields:
          - { label: "Site Title", name: "title", widget: "string" }
          - { label: "Site Description", name: "description", widget: "text" }
          - { label: "Site URL", name: "url", widget: "string" }
          - { label: "Logo", name: "logo", widget: "image" }
          - { label: "Favicon", name: "favicon", widget: "image" }
          - label: "SEO"
            name: "seo"
            widget: "object"
            fields:
              - { label: "Meta Title", name: "metaTitle", widget: "string" }
              - { label: "Meta Description", name: "metaDescription", widget: "text" }
              - { label: "OG Image", name: "ogImage", widget: "image" }
          - label: "Social Links"
            name: "social"
            widget: "object"
            fields:
              - { label: "Twitter", name: "twitter", widget: "string", required: false }
              - { label: "LinkedIn", name: "linkedin", widget: "string", required: false }
              - { label: "GitHub", name: "github", widget: "string", required: false }

  # Team Members
  - name: "team"
    label: "Team Members"
    folder: "content/team"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Name", name: "name", widget: "string" }
      - { label: "Role", name: "role", widget: "string" }
      - { label: "Photo", name: "photo", widget: "image" }
      - { label: "Bio", name: "bio", widget: "markdown" }
      - { label: "Email", name: "email", widget: "string" }
      - { label: "LinkedIn", name: "linkedin", widget: "string", required: false }

  # Services
  - name: "services"
    label: "Services"
    folder: "content/services"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Icon", name: "icon", widget: "image" }
      - { label: "Description", name: "description", widget: "text" }
      - { label: "Features", name: "features", widget: "list", field: { label: "Feature", name: "feature", widget: "string" } }
      - { label: "Price", name: "price", widget: "string", required: false }
      - { label: "CTA Text", name: "ctaText", widget: "string", default: "Learn More" }
      - { label: "CTA Link", name: "ctaLink", widget: "string" }

  # Testimonials
  - name: "testimonials"
    label: "Testimonials"
    folder: "content/testimonials"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Quote", name: "quote", widget: "text" }
      - { label: "Author Name", name: "author", widget: "string" }
      - { label: "Author Title", name: "authorTitle", widget: "string" }
      - { label: "Company", name: "company", widget: "string" }
      - { label: "Avatar", name: "avatar", widget: "image", required: false }
      - { label: "Rating", name: "rating", widget: "number", min: 1, max: 5, default: 5 }

  # Static Pages
  - name: "pages"
    label: "Pages"
    folder: "content/pages"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Slug", name: "slug", widget: "string" }
      - { label: "Body", name: "body", widget: "markdown" }
      - { label: "SEO Title", name: "seoTitle", widget: "string", required: false }
      - { label: "SEO Description", name: "seoDescription", widget: "text", required: false }
```

### Step 3: Enable Git Gateway (Netlify)

1. **Install Netlify Identity:**

Add to your `index.html` before `</body>`:

```html
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
```

2. **Enable Identity in Netlify:**
   - Go to Netlify Dashboard → Site Settings → Identity
   - Click "Enable Identity"
   - Under "Registration preferences" → Select "Invite only"
   - Under "External providers" → Enable GitHub (optional)
   - Under "Services" → Enable Git Gateway

3. **Invite Users:**
   - Identity tab → Invite users
   - Enter email addresses
   - Users receive invitation email

### Step 4: Create Content Directories

```bash
mkdir -p content/{team,services,testimonials,pages}
touch content/site-config.json
```

Initialize `content/site-config.json`:

```json
{
  "title": "Your Site Title",
  "description": "Your site description",
  "url": "https://yoursite.com",
  "logo": "/images/logo.png",
  "favicon": "/images/favicon.ico",
  "seo": {
    "metaTitle": "Your Site - Tagline",
    "metaDescription": "Your meta description for SEO",
    "ogImage": "/images/og-image.jpg"
  },
  "social": {
    "twitter": "https://twitter.com/yourhandle",
    "linkedin": "https://linkedin.com/company/yourcompany",
    "github": "https://github.com/yourusername"
  }
}
```

### Step 5: Access Admin Interface

1. **Deploy to Netlify** (git push)
2. **Visit:** `https://yoursite.netlify.app/admin`
3. **Login** with invited email
4. **Start managing content!**

---

## Configuration Examples

### Example 1: FAQ Collection

```yaml
collections:
  - name: "faq"
    label: "FAQ"
    folder: "content/faq"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Question", name: "question", widget: "string" }
      - { label: "Answer", name: "answer", widget: "markdown" }
      - label: "Category"
        name: "category"
        widget: "select"
        options: ["General", "Pricing", "Technical", "Support"]
      - { label: "Order", name: "order", widget: "number", default: 0 }
      - { label: "Published", name: "published", widget: "boolean", default: true }
```

### Example 2: Portfolio Projects

```yaml
collections:
  - name: "projects"
    label: "Portfolio Projects"
    folder: "content/projects"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Description", name: "description", widget: "text" }
      - { label: "Hero Image", name: "heroImage", widget: "image" }
      - label: "Gallery"
        name: "gallery"
        widget: "list"
        field: { label: "Image", name: "image", widget: "image" }
      - { label: "Client", name: "client", widget: "string" }
      - { label: "Date", name: "date", widget: "datetime" }
      - label: "Tags"
        name: "tags"
        widget: "list"
        field: { label: "Tag", name: "tag", widget: "string" }
      - { label: "Project URL", name: "url", widget: "string", required: false }
      - { label: "Case Study", name: "caseStudy", widget: "markdown" }
```

### Example 3: Site-Wide Settings

```yaml
collections:
  - name: "settings"
    label: "Settings"
    files:
      - name: "analytics"
        label: "Analytics"
        file: "content/analytics.json"
        fields:
          - { label: "Google Analytics ID", name: "gaId", widget: "string", required: false }
          - { label: "Facebook Pixel", name: "fbPixel", widget: "string", required: false }
          - { label: "Hotjar ID", name: "hotjarId", widget: "string", required: false }

      - name: "features"
        label: "Feature Flags"
        file: "content/features.json"
        fields:
          - { label: "Enable Blog", name: "enableBlog", widget: "boolean", default: true }
          - { label: "Enable Contact Form", name: "enableContact", widget: "boolean", default: true }
          - { label: "Enable Newsletter", name: "enableNewsletter", widget: "boolean", default: false }
          - { label: "Maintenance Mode", name: "maintenanceMode", widget: "boolean", default: false }
```

---

## Hybrid CMS Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Content Sources                       │
├─────────────────────────────┬───────────────────────────────┤
│         Notion API          │        Sveltia CMS (Git)      │
│    (Dynamic Content)        │     (Static Content)          │
├─────────────────────────────┼───────────────────────────────┤
│ • Blog posts                │ • Site configuration          │
│ • News/updates              │ • Team members                │
│ • Documentation             │ • Services                    │
│ • Lead database             │ • Testimonials                │
│                             │ • Static pages                │
│                             │ • Asset management            │
└─────────────────────────────┴───────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Netlify Functions   │
                    │  + Static Site Gen   │
                    └──────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Built Website      │
                    │  (Static + Dynamic)  │
                    └──────────────────────┘
```

### Data Flow

**Notion Content:**
```
User edits in Notion → API call from Netlify Function →
JSON response → Rendered on frontend → Cached (5-10 min)
```

**Sveltia Content:**
```
User edits in Sveltia CMS → Commits to Git →
Netlify rebuild triggered → JSON files bundled →
Loaded at build time
```

### Implementation Example

**Netlify Function to merge data:**

`netlify/functions/homepage-data.js`:

```javascript
const { Client } = require('@notionhq/client');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  try {
    // Get blog posts from Notion
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const blogResponse = await notion.blocks.children.list({
      block_id: process.env.NOTION_BLOG_PAGE_ID,
      page_size: 3  // Latest 3 posts
    });

    // Get site config from Sveltia (Git)
    const siteConfig = JSON.parse(
      await fs.readFile(path.join(__dirname, '../../content/site-config.json'), 'utf8')
    );

    // Get services from Sveltia
    const servicesDir = path.join(__dirname, '../../content/services');
    const serviceFiles = await fs.readdir(servicesDir);
    const services = await Promise.all(
      serviceFiles.map(async file =>
        JSON.parse(await fs.readFile(path.join(servicesDir, file), 'utf8'))
      )
    );

    // Get testimonials from Sveltia
    const testimonialsDir = path.join(__dirname, '../../content/testimonials');
    const testimonialFiles = await fs.readdir(testimonialsDir);
    const testimonials = await Promise.all(
      testimonialFiles.map(async file =>
        JSON.parse(await fs.readFile(path.join(testimonialsDir, file), 'utf8'))
      )
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify({
        siteConfig,
        blogPosts: blogResponse.results,
        services,
        testimonials
      })
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data' })
    };
  }
};
```

**Frontend usage:**

```javascript
// js/homepage.js
async function loadHomepageData() {
  const response = await fetch('/.netlify/functions/homepage-data');
  const data = await response.json();

  // Render site config
  document.title = data.siteConfig.title;
  document.querySelector('.hero h1').textContent = data.siteConfig.title;

  // Render services
  renderServices(data.services);

  // Render testimonials
  renderTestimonials(data.testimonials);

  // Render latest blog posts
  renderBlogPosts(data.blogPosts);
}
```

---

## Use Cases

### Use Case 1: Team Page

**Sveltia Configuration:**
- Store team member data in `content/team/`
- Fields: name, role, photo, bio, social links

**Implementation:**
```javascript
// Load team data
const teamData = await fetch('/.netlify/functions/get-team').then(r => r.json());

// Render team grid
teamData.forEach(member => {
  const card = `
    <div class="team-card">
      <img src="${member.photo}" alt="${member.name}">
      <h3>${member.name}</h3>
      <p class="role">${member.role}</p>
      <p class="bio">${member.bio}</p>
    </div>
  `;
  teamContainer.innerHTML += card;
});
```

### Use Case 2: Services Showcase

**Sveltia Configuration:**
- Store services in `content/services/`
- Fields: title, icon, description, features, price

**Notion Usage:**
- Write detailed case studies as blog posts
- Link from service cards to case study posts

### Use Case 3: Dynamic Pricing

**Sveltia Configuration:**
```json
{
  "plans": [
    {
      "name": "Starter",
      "price": "$99/mo",
      "features": ["Feature 1", "Feature 2"],
      "highlighted": false
    },
    {
      "name": "Pro",
      "price": "$199/mo",
      "features": ["All Starter", "Feature 3", "Feature 4"],
      "highlighted": true
    }
  ]
}
```

**Implementation:**
- Load pricing from JSON
- Render pricing cards
- Update prices in Sveltia CMS → rebuild site

---

## Migration Strategies

### Moving from Notion to Sveltia

**Scenario:** You want to move team bios from Notion to Sveltia

1. **Export from Notion:**
   - Use Notion API to fetch all team pages
   - Convert to Sveltia-compatible JSON

```javascript
// migration-script.js
const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function migrateTeam() {
  const response = await notion.databases.query({
    database_id: process.env.TEAM_DATABASE_ID
  });

  for (const page of response.results) {
    const member = {
      name: page.properties.Name.title[0].plain_text,
      role: page.properties.Role.rich_text[0].plain_text,
      bio: page.properties.Bio.rich_text[0].plain_text,
      photo: page.properties.Photo.files[0].file.url
    };

    // Write to content/team/
    await fs.writeFile(
      `content/team/${member.name.toLowerCase().replace(/\s/g, '-')}.json`,
      JSON.stringify(member, null, 2)
    );
  }
}
```

2. **Update frontend** to load from Sveltia JSON instead of Notion API

### Moving from Sveltia to Notion

**Scenario:** You want collaborative blog editing

1. **Create Notion blog database**
2. **Import Sveltia markdown files** as Notion pages using API
3. **Update functions** to fetch from Notion instead of Git

---

## Next Steps

- **Create programmatic pages** → [Programmatic Pages Guide](./04-PROGRAMMATIC-PAGES.md)
- **Learn API details** → [API Reference](./07-API-REFERENCE.md)
- **Use agent prompts** → [Agent Prompts](./06-AGENT-PROMPTS.md)

---

## Quick Reference

**Sveltia CMS URLs:**
- Admin Interface: `/admin`
- Documentation: https://github.com/sveltia/sveltia-cms

**Configuration File:** `public/admin/config.yml`

**Content Directory:** `content/`

**Best Practices:**
- Use Notion for dynamic, collaborative content
- Use Sveltia for static, structured data
- Store assets in Sveltia for permanent URLs
- Use environment variables for sensitive data
