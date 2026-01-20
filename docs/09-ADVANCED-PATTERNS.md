# Advanced Patterns: Extending Your Notion CMS

Learn how to push Notion-as-CMS to its limits by adding custom block types, using database properties to populate site sections, and implementing advanced content patterns.

## Table of Contents

1. [Adding New Block Types](#adding-new-block-types)
2. [Database-Driven Site Sections](#database-driven-site-sections)
3. [Using Properties to Control Content](#using-properties-to-control-content)
4. [Advanced Database Queries](#advanced-database-queries)
5. [Multi-Database Architecture](#multi-database-architecture)
6. [Real-World Examples](#real-world-examples)
7. [Performance Considerations](#performance-considerations)
8. [Limitations and Workarounds](#limitations-and-workarounds)

---

## Adding New Block Types

### Current Supported Blocks (10 types)

The implementation currently supports:
- Text: paragraph, heading_1, heading_2, heading_3
- Lists: bulleted_list_item, numbered_list_item
- Media: image
- Formatting: quote, code, divider

### Adding Support for New Block Types

Let's add support for additional Notion block types step-by-step.

---

### Example 1: Adding Toggle Blocks

**Notion Block Structure:**
```json
{
  "type": "toggle",
  "toggle": {
    "rich_text": [
      {
        "plain_text": "Click to expand",
        "annotations": {}
      }
    ]
  },
  "has_children": true,
  "children": [
    // Child blocks here
  ]
}
```

**Implementation:**

Add to `netlify/functions/blog-detail.js`:

```javascript
// In blocksToHtml() function, add this case:
case 'toggle':
  const toggleText = richTextToHtml(block.toggle.rich_text);
  html += `<details class="toggle-block">
    <summary>${toggleText}</summary>
    <div class="toggle-content">`;

  // Fetch and render child blocks
  if (block.has_children) {
    const childBlocks = await getAllBlocks(notion, block.id);
    html += await blocksToHtml(childBlocks);
  }

  html += `</div></details>\n`;
  break;
```

**Styling (css/blog.css):**
```css
.post-content .toggle-block {
  margin: 1.5rem 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.post-content .toggle-block summary {
  padding: 1rem 1.5rem;
  cursor: pointer;
  background: #f8fafc;
  font-weight: 600;
  user-select: none;
  list-style: none;
}

.post-content .toggle-block summary::before {
  content: '▶';
  display: inline-block;
  margin-right: 0.5rem;
  transition: transform 0.3s;
}

.post-content .toggle-block[open] summary::before {
  transform: rotate(90deg);
}

.post-content .toggle-content {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}
```

---

### Example 2: Adding Callout Blocks

**Notion Block Structure:**
```json
{
  "type": "callout",
  "callout": {
    "rich_text": [
      {
        "plain_text": "Important information here"
      }
    ],
    "icon": {
      "emoji": "💡"
    },
    "color": "blue_background"
  }
}
```

**Implementation:**

```javascript
case 'callout':
  const calloutText = richTextToHtml(block.callout.rich_text);
  const emoji = block.callout.icon?.emoji || '📌';
  const color = block.callout.color || 'gray_background';

  html += `<div class="callout callout--${color}">
    <span class="callout__icon">${emoji}</span>
    <div class="callout__content">${calloutText}</div>
  </div>\n`;
  break;
```

**Styling:**
```css
.post-content .callout {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  margin: 1.5rem 0;
  border-radius: 8px;
  border-left: 4px solid;
}

.post-content .callout__icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.post-content .callout__content {
  flex: 1;
}

/* Color variants */
.post-content .callout--blue_background {
  background: #dbeafe;
  border-left-color: #3b82f6;
}

.post-content .callout--yellow_background {
  background: #fef3c7;
  border-left-color: #f59e0b;
}

.post-content .callout--red_background {
  background: #fee2e2;
  border-left-color: #ef4444;
}

.post-content .callout--green_background {
  background: #d1fae5;
  border-left-color: #10b981;
}
```

---

### Example 3: Adding Table Blocks

**Notion Block Structure:**
```json
{
  "type": "table",
  "table": {
    "table_width": 3,
    "has_column_header": true,
    "has_row_header": false
  },
  "has_children": true
}
```

**Implementation:**

```javascript
case 'table':
  const hasColumnHeader = block.table.has_column_header;
  html += `<div class="table-container"><table class="content-table">`;

  if (block.has_children) {
    const tableRows = await getAllBlocks(notion, block.id);

    tableRows.forEach((row, index) => {
      if (row.type === 'table_row') {
        const isHeader = hasColumnHeader && index === 0;
        html += '<tr>';

        row.table_row.cells.forEach(cell => {
          const cellText = richTextToHtml(cell);
          const tag = isHeader ? 'th' : 'td';
          html += `<${tag}>${cellText}</${tag}>`;
        });

        html += '</tr>';
      }
    });
  }

  html += `</table></div>\n`;
  break;
```

**Styling:**
```css
.post-content .table-container {
  overflow-x: auto;
  margin: 2rem 0;
}

.post-content .content-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.post-content .content-table th,
.post-content .content-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border: 1px solid #e2e8f0;
}

.post-content .content-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #000;
}

.post-content .content-table tr:hover {
  background: #f8fafc;
}
```

---

### Example 4: Adding Video Embeds

**Notion Block Structure:**
```json
{
  "type": "video",
  "video": {
    "external": {
      "url": "https://youtube.com/watch?v=..."
    }
  }
}
```

**Implementation:**

```javascript
case 'video':
  const videoUrl = block.video?.external?.url || block.video?.file?.url;

  if (videoUrl) {
    // Convert YouTube URLs to embed format
    let embedUrl = videoUrl;

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = extractYouTubeId(videoUrl);
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.split('/').pop();
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    html += `<div class="video-embed">
      <iframe
        src="${embedUrl}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>\n`;
  }
  break;

// Helper function
function extractYouTubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
```

**Styling:**
```css
.post-content .video-embed {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  margin: 2rem 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.post-content .video-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

---

## Database-Driven Site Sections

Now let's use Notion **databases** to populate any part of your site - not just blog posts!

### Architecture Pattern

```
Notion Databases ──────────→ Netlify Functions ──────→ Site Sections
    ├── Hero Database              ├── get-hero.js         Hero Section
    ├── Team Database              ├── get-team.js         Team Section
    ├── Services Database          ├── get-services.js     Services Grid
    ├── Testimonials Database      ├── get-testimonials.js Testimonials
    └── Features Database          └── get-features.js     Features List
```

---

### Example 1: Hero Section from Database

**Notion Database Setup:**

Create a database called "Hero Sections" with these properties:

| Property | Type | Description |
|----------|------|-------------|
| Title | Title | Hero headline |
| Subtitle | Rich Text | Hero subtext |
| CTA Text | Rich Text | Button text |
| CTA Link | URL | Button link |
| Background Image | Files & Media | Hero background |
| Active | Checkbox | Show this hero? |
| Priority | Number | Order (highest = current) |

**Netlify Function:**

Create `netlify/functions/get-hero.js`:

```javascript
const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    // Query hero database
    const response = await notion.databases.query({
      database_id: process.env.NOTION_HERO_DATABASE_ID,
      filter: {
        property: 'Active',
        checkbox: {
          equals: true
        }
      },
      sorts: [
        {
          property: 'Priority',
          direction: 'descending'
        }
      ],
      page_size: 1
    });

    if (response.results.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No active hero found' })
      };
    }

    const hero = response.results[0];

    // Extract properties
    const title = hero.properties.Title?.title?.[0]?.plain_text || '';
    const subtitle = hero.properties.Subtitle?.rich_text?.[0]?.plain_text || '';
    const ctaText = hero.properties['CTA Text']?.rich_text?.[0]?.plain_text || 'Get Started';
    const ctaLink = hero.properties['CTA Link']?.url || '#';
    const backgroundImage = hero.properties['Background Image']?.files?.[0]?.file?.url ||
                           hero.properties['Background Image']?.files?.[0]?.external?.url || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        title,
        subtitle,
        ctaText,
        ctaLink,
        backgroundImage
      })
    };

  } catch (error) {
    console.error('Error fetching hero:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch hero' })
    };
  }
};
```

**Frontend Implementation:**

In `js/script.js`:

```javascript
async function loadHeroSection() {
  try {
    const response = await fetch('/.netlify/functions/get-hero');
    const hero = await response.json();

    // Update DOM
    document.querySelector('.hero h1').textContent = hero.title;
    document.querySelector('.hero .subtitle').textContent = hero.subtitle;
    document.querySelector('.hero .cta-button').textContent = hero.ctaText;
    document.querySelector('.hero .cta-button').href = hero.ctaLink;

    if (hero.backgroundImage) {
      document.querySelector('.hero').style.backgroundImage =
        `url(${hero.backgroundImage})`;
    }
  } catch (error) {
    console.error('Error loading hero:', error);
    // Use default hero content
  }
}

// Load on page load
document.addEventListener('DOMContentLoaded', loadHeroSection);
```

**HTML Structure:**

```html
<section class="hero" id="hero">
  <div class="container">
    <h1>Default Title</h1>
    <p class="subtitle">Default subtitle</p>
    <a href="#" class="cta-button">Default CTA</a>
  </div>
</section>
```

---

### Example 2: Team Section from Database

**Notion Database Setup:**

Create "Team Members" database:

| Property | Type | Description |
|----------|------|-------------|
| Name | Title | Team member name |
| Role | Select | Job title |
| Bio | Rich Text | Short bio |
| Photo | Files & Media | Profile photo |
| LinkedIn | URL | LinkedIn profile |
| Order | Number | Display order |
| Active | Checkbox | Show on site? |

**Netlify Function:**

Create `netlify/functions/get-team.js`:

```javascript
const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=600'
  };

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    const response = await notion.databases.query({
      database_id: process.env.NOTION_TEAM_DATABASE_ID,
      filter: {
        property: 'Active',
        checkbox: {
          equals: true
        }
      },
      sorts: [
        {
          property: 'Order',
          direction: 'ascending'
        }
      ]
    });

    const team = response.results.map(member => ({
      id: member.id,
      name: member.properties.Name?.title?.[0]?.plain_text || '',
      role: member.properties.Role?.select?.name || '',
      bio: member.properties.Bio?.rich_text?.[0]?.plain_text || '',
      photo: member.properties.Photo?.files?.[0]?.file?.url ||
             member.properties.Photo?.files?.[0]?.external?.url || '',
      linkedin: member.properties.LinkedIn?.url || ''
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ team, total: team.length })
    };

  } catch (error) {
    console.error('Error fetching team:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch team' })
    };
  }
};
```

**Frontend Implementation:**

```javascript
async function loadTeamSection() {
  try {
    const response = await fetch('/.netlify/functions/get-team');
    const data = await response.json();

    const teamGrid = document.getElementById('team-grid');
    teamGrid.innerHTML = data.team.map(member => `
      <div class="team-card">
        <img src="${member.photo}" alt="${member.name}" class="team-photo">
        <h3>${member.name}</h3>
        <p class="team-role">${member.role}</p>
        <p class="team-bio">${member.bio}</p>
        ${member.linkedin ? `
          <a href="${member.linkedin}" target="_blank" class="team-linkedin">
            LinkedIn →
          </a>
        ` : ''}
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading team:', error);
  }
}
```

---

### Example 3: Dynamic Pricing from Database

**Notion Database Setup:**

Create "Pricing Plans" database:

| Property | Type | Description |
|----------|------|-------------|
| Name | Title | Plan name |
| Price | Number | Monthly price |
| Features | Multi-select | Feature tags |
| Highlighted | Checkbox | Featured plan? |
| CTA Text | Rich Text | Button text |
| Order | Number | Display order |
| Active | Checkbox | Show on site? |

**Function:**

```javascript
// netlify/functions/get-pricing.js
const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800' // 30 min cache
  };

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    const response = await notion.databases.query({
      database_id: process.env.NOTION_PRICING_DATABASE_ID,
      filter: {
        property: 'Active',
        checkbox: { equals: true }
      },
      sorts: [
        { property: 'Order', direction: 'ascending' }
      ]
    });

    const plans = response.results.map(plan => ({
      name: plan.properties.Name?.title?.[0]?.plain_text || '',
      price: plan.properties.Price?.number || 0,
      features: plan.properties.Features?.multi_select?.map(f => f.name) || [],
      highlighted: plan.properties.Highlighted?.checkbox || false,
      ctaText: plan.properties['CTA Text']?.rich_text?.[0]?.plain_text || 'Get Started'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ plans })
    };

  } catch (error) {
    console.error('Error fetching pricing:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch pricing' })
    };
  }
};
```

**Frontend:**

```javascript
async function loadPricing() {
  const response = await fetch('/.netlify/functions/get-pricing');
  const data = await response.json();

  const pricingGrid = document.getElementById('pricing-grid');
  pricingGrid.innerHTML = data.plans.map(plan => `
    <div class="pricing-card ${plan.highlighted ? 'pricing-card--featured' : ''}">
      ${plan.highlighted ? '<span class="badge">Popular</span>' : ''}
      <h3>${plan.name}</h3>
      <div class="price">$${plan.price}<span>/mo</span></div>
      <ul class="features">
        ${plan.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <a href="#contact" class="btn btn-primary">${plan.ctaText}</a>
    </div>
  `).join('');
}
```

---

## Using Properties to Control Content

### Advanced Property-Based Logic

**Example: Feature Flags from Notion**

Create a "Site Settings" database with formula properties:

```javascript
// netlify/functions/get-settings.js
const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  const response = await notion.databases.query({
    database_id: process.env.NOTION_SETTINGS_DATABASE_ID
  });

  const settings = {};

  response.results.forEach(row => {
    const key = row.properties.Key?.title?.[0]?.plain_text;
    const type = row.properties.Type?.select?.name; // 'Boolean', 'String', 'Number'

    let value;
    if (type === 'Boolean') {
      value = row.properties.Value?.checkbox || false;
    } else if (type === 'String') {
      value = row.properties.Value?.rich_text?.[0]?.plain_text || '';
    } else if (type === 'Number') {
      value = row.properties.Value?.number || 0;
    }

    settings[key] = value;
  });

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // 1 hour
    },
    body: JSON.stringify(settings)
  };
};
```

**Usage:**

```javascript
const settings = await fetch('/.netlify/functions/get-settings').then(r => r.json());

if (settings.showNewsletter) {
  // Show newsletter signup
}

if (settings.maintenanceMode) {
  // Show maintenance page
}
```

---

## Advanced Database Queries

### Filtering by Date Range

**Example: Show "Featured" posts from last 30 days**

```javascript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const response = await notion.databases.query({
  database_id: process.env.NOTION_BLOG_DATABASE_ID,
  filter: {
    and: [
      {
        property: 'Featured',
        checkbox: { equals: true }
      },
      {
        property: 'Published Date',
        date: {
          on_or_after: thirtyDaysAgo.toISOString()
        }
      }
    ]
  },
  sorts: [
    { property: 'Published Date', direction: 'descending' }
  ]
});
```

### Multi-Database Aggregation

**Example: Homepage data from multiple databases**

```javascript
// netlify/functions/get-homepage.js
const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  // Parallel fetch from multiple databases
  const [hero, team, services, testimonials, latestPosts] = await Promise.all([
    fetchHero(notion),
    fetchTeam(notion),
    fetchServices(notion),
    fetchTestimonials(notion),
    fetchLatestPosts(notion, 3) // Latest 3 posts
  ]);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300'
    },
    body: JSON.stringify({
      hero,
      team,
      services,
      testimonials,
      latestPosts
    })
  };
};

async function fetchHero(notion) {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_HERO_DATABASE_ID,
    filter: { property: 'Active', checkbox: { equals: true } },
    sorts: [{ property: 'Priority', direction: 'descending' }],
    page_size: 1
  });

  return response.results[0]; // Transform as needed
}

// ... similar functions for team, services, etc.
```

**Frontend:**

```javascript
async function loadHomepage() {
  const data = await fetch('/.netlify/functions/get-homepage').then(r => r.json());

  renderHero(data.hero);
  renderServices(data.services);
  renderTeam(data.team);
  renderTestimonials(data.testimonials);
  renderLatestPosts(data.latestPosts);
}
```

---

## Multi-Database Architecture

### Full Site Example

```
Notion Workspace
├── 📊 Hero Sections (Database)
├── 📊 Navigation Links (Database)
├── 📊 Services (Database)
├── 📊 Team Members (Database)
├── 📊 Testimonials (Database)
├── 📊 Pricing Plans (Database)
├── 📊 FAQ (Database)
├── 📊 Site Settings (Database)
├── 📝 Blog (Page with child pages)
└── 📊 Lead Database (Form submissions)
```

**Environment Variables:**

```bash
NOTION_TOKEN=secret_...
NOTION_HERO_DATABASE_ID=...
NOTION_NAV_DATABASE_ID=...
NOTION_SERVICES_DATABASE_ID=...
NOTION_TEAM_DATABASE_ID=...
NOTION_TESTIMONIALS_DATABASE_ID=...
NOTION_PRICING_DATABASE_ID=...
NOTION_FAQ_DATABASE_ID=...
NOTION_SETTINGS_DATABASE_ID=...
NOTION_BLOG_PAGE_ID=...
NOTION_LEAD_DATABASE_ID=...
```

---

## Real-World Examples

### Example 1: E-Commerce Product Catalog

**Database Properties:**
- Name (Title)
- Description (Rich Text)
- Price (Number)
- Images (Files & Media)
- Category (Select)
- In Stock (Checkbox)
- SKU (Rich Text)

**Function:**

```javascript
// Filter by category and in-stock
const response = await notion.databases.query({
  database_id: process.env.NOTION_PRODUCTS_DATABASE_ID,
  filter: {
    and: [
      {
        property: 'Category',
        select: { equals: event.queryStringParameters.category }
      },
      {
        property: 'In Stock',
        checkbox: { equals: true }
      }
    ]
  }
});
```

### Example 2: Event Calendar

**Database Properties:**
- Title (Title)
- Date (Date)
- Location (Rich Text)
- Description (Rich Text)
- Registration Link (URL)
- Featured (Checkbox)

**Function:**

```javascript
// Get upcoming events
const now = new Date().toISOString();

const response = await notion.databases.query({
  database_id: process.env.NOTION_EVENTS_DATABASE_ID,
  filter: {
    property: 'Date',
    date: {
      on_or_after: now
    }
  },
  sorts: [
    { property: 'Date', direction: 'ascending' }
  ]
});
```

### Example 3: Job Board

**Database Properties:**
- Position (Title)
- Department (Select)
- Location (Multi-select)
- Description (Rich Text)
- Requirements (Rich Text)
- Salary Range (Rich Text)
- Posted Date (Date)
- Active (Checkbox)

---

## Performance Considerations

### 1. Caching Strategy

```javascript
// Long cache for rarely-changing content (pricing, team)
'Cache-Control': 'public, max-age=3600' // 1 hour

// Medium cache for semi-dynamic content (services, testimonials)
'Cache-Control': 'public, max-age=600' // 10 minutes

// Short cache for frequently-changing content (blog posts, events)
'Cache-Control': 'public, max-age=300' // 5 minutes
```

### 2. Pagination

```javascript
async function fetchAllPages(notion, databaseId) {
  let results = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
      page_size: 100
    });

    results = results.concat(response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return results;
}
```

### 3. Parallel Fetching

```javascript
// Bad: Sequential (slow)
const hero = await fetchHero();
const team = await fetchTeam();
const services = await fetchServices();

// Good: Parallel (fast)
const [hero, team, services] = await Promise.all([
  fetchHero(),
  fetchTeam(),
  fetchServices()
]);
```

---

## Limitations and Workarounds

### Limitation 1: Rate Limits (3 requests/sec)

**Workaround:**
- Batch requests when possible
- Use longer cache durations
- Fetch multiple databases in single function

### Limitation 2: Image URLs Expire (1 hour)

**Workaround:**
- Use external image hosting (Cloudinary, S3)
- Or refresh images on each API call (acceptable with caching)

### Limitation 3: No Real-Time Updates

**Workaround:**
- Accept 5-10 minute delay (cache expiry)
- Or use webhooks (advanced): Notion → Zapier → Netlify rebuild

### Limitation 4: Complex Queries

Some queries aren't possible in Notion API.

**Workaround:**
- Fetch all data and filter in JavaScript
- Or use formula properties in Notion

### Limitation 5: File Size Limits

Notion API has limits on block size and complexity.

**Workaround:**
- Keep pages under 2000 blocks
- Split large content into multiple pages

---

## Next Steps

**To implement these patterns:**

1. Create your databases in Notion
2. Share them with your integration
3. Copy database IDs to environment variables
4. Create Netlify Functions for each database
5. Update frontend to fetch and render data

**Advanced Patterns to Explore:**

- Search functionality across databases
- Multi-language content (i18n)
- A/B testing with property flags
- Scheduled content (publish date filtering)
- User-specific content (using Notion permissions)

---

## Quick Reference

**Adding Block Types:**
- Location: `netlify/functions/blog-detail.js` → `blocksToHtml()`
- Pattern: Add new `case` statement
- Don't forget styling in `css/blog.css`

**Database-Driven Sections:**
- Create database in Notion
- Create Netlify Function (`get-[section].js`)
- Query with filters and sorts
- Transform properties to JSON
- Fetch and render on frontend

**Performance Tips:**
- Cache aggressively
- Fetch in parallel
- Use external image hosting
- Implement pagination for large datasets

Would you like me to implement any of these specific patterns for your site?
