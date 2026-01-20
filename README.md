# Notion-as-CMS Starter Kit

🚀 **A complete, production-ready starter kit for building websites with Notion as your CMS.**

Build fast, serverless websites powered by Notion. No traditional CMS needed. Perfect for blogs, marketing sites, portfolios, documentation, and more.

---

## ✨ Features

- ✅ **Notion as CMS** - Content editors use Notion's familiar interface
- ✅ **Serverless Architecture** - Built on Netlify Functions (no backend to manage)
- ✅ **10+ Notion Block Types** - Paragraphs, headings, lists, images, quotes, code, and more
- ✅ **Blog System** - Complete blog with listing and detail pages
- ✅ **Form Submissions** - Contact forms that write to Notion databases
- ✅ **Database-Driven** - Populate any site section from Notion databases
- ✅ **Fully Customizable** - Vanilla HTML/CSS/JS (no framework lock-in)
- ✅ **SEO Friendly** - Server-side rendering with meta tags
- ✅ **Fast Performance** - Intelligent caching, CDN delivery
- ✅ **Responsive Design** - Mobile-first, accessible
- ✅ **Comprehensive Docs** - 9 guides covering everything

---

## 📦 What's Included

```
notion-cms-starter/
├── index.html                      # Landing page template
├── pages/
│   ├── blog.html                  # Blog listing page
│   └── blog-post.html             # Blog detail page template
├── css/
│   ├── styles.css                 # Base styles & utilities
│   └── blog.css                   # Blog-specific styles
├── js/
│   ├── blog.js                    # Blog listing logic
│   └── blog-post.js               # Blog detail logic
├── netlify/
│   └── functions/
│       ├── blog-list.js           # Fetch all blog posts
│       ├── blog-detail.js         # Fetch single post + HTML conversion
│       └── submit-to-notion.js    # Handle form submissions
├── docs/                          # Complete documentation (9 guides)
│   ├── README.md                  # Documentation overview
│   ├── 01-SETUP-GUIDE.md          # Step-by-step setup
│   ├── 02-NOTION-BLOCK-TYPES.md   # Block types reference
│   ├── 03-COMPONENT-STYLING.md    # Styling guide
│   ├── 04-PROGRAMMATIC-PAGES.md   # Dynamic pages guide
│   ├── 05-SVELTIA-CMS-INTEGRATION.md  # Hybrid CMS approach
│   ├── 06-AGENT-PROMPTS.md        # AI agent prompts
│   ├── 07-API-REFERENCE.md        # API documentation
│   ├── 08-TROUBLESHOOTING.md      # Common issues & solutions
│   └── 09-ADVANCED-PATTERNS.md    # Extending functionality
├── netlify.toml                   # Netlify configuration
├── package.json                   # Dependencies
├── .env.example                   # Environment variables template
└── .gitignore                     # Git ignore rules
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org))
- **Notion Account** (free or paid)
- **Netlify Account** (free tier works) ([Sign up](https://app.netlify.com))
- **Git** installed

### 1. Clone this repository

```bash
git clone https://github.com/yourusername/notion-cms-starter.git
cd notion-cms-starter
npm install
```

### 2. Create Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it (e.g., "My Website")
4. Copy the **Integration Token** (starts with `secret_`)

### 3. Set up Notion Content

#### Create Lead Database (for contact forms)

1. Create a new page in Notion called "Lead Database"
2. Convert to database (inline)
3. Add properties:
   - **Name** (Title) - default
   - **Email** (Email)
   - **Message** (Text)
   - **Status** (Select) - Options: "New Lead", "Contacted", "Qualified", "Closed"
   - **Source** (Select) - Options: "Website", "Referral", "Social Media"
   - **Date Submitted** (Date) - Include time
4. Share database with your integration (Share → Invite → Select integration)
5. Copy database ID from URL: `https://notion.so/workspace/DATABASE_ID?v=...`

#### Create Blog Parent Page (for blog posts)

1. Create a new page called "Blog"
2. Keep it as a regular page (NOT a database)
3. Add child pages inside for blog posts (each child page = one blog post)
4. Share page with your integration
5. Copy page ID from URL

### 4. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
NOTION_TOKEN=secret_your_integration_token_here
NOTION_DATABASE_ID=your_32_character_database_id
NOTION_BLOG_PAGE_ID=your_32_character_blog_page_id
NODE_ENV=development
```

### 5. Run Locally

```bash
npm run dev
```

Visit: [http://localhost:8888](http://localhost:8888)

Test endpoints:
- Blog list: [http://localhost:8888/.netlify/functions/blog-list](http://localhost:8888/.netlify/functions/blog-list)
- Blog detail: `http://localhost:8888/.netlify/functions/blog-detail?slug=your-post-slug`

### 6. Deploy to Netlify

**Option A: Git-based deployment (recommended)**

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Go to [app.netlify.com](https://app.netlify.com)
3. Click **"Add new site"** → **"Import an existing project"**
4. Connect to GitHub and select your repo
5. Configure:
   - Build command: (leave empty)
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
6. Add environment variables in Netlify:
   - Go to **Site settings** → **Environment variables**
   - Add: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_BLOG_PAGE_ID`, `NODE_ENV=production`
7. Click **"Deploy site"**

**Option B: Netlify CLI**

```bash
npm run deploy
```

---

## 📖 Documentation

This starter kit includes **9 comprehensive guides** covering everything from setup to advanced patterns:

### Getting Started

1. **[Setup Guide](./docs/01-SETUP-GUIDE.md)** - Complete setup walkthrough
2. **[Notion Block Types](./docs/02-NOTION-BLOCK-TYPES.md)** - All supported blocks and HTML conversion
3. **[Component Styling](./docs/03-COMPONENT-STYLING.md)** - CSS architecture and creating components

### Building Features

4. **[Programmatic Pages](./docs/04-PROGRAMMATIC-PAGES.md)** - Dynamic pages, routing, and SEO
5. **[Sveltia CMS Integration](./docs/05-SVELTIA-CMS-INTEGRATION.md)** - Hybrid CMS approach
6. **[Agent Prompts](./docs/06-AGENT-PROMPTS.md)** - AI-assisted development prompts

### Reference & Help

7. **[API Reference](./docs/07-API-REFERENCE.md)** - Complete API documentation
8. **[Troubleshooting](./docs/08-TROUBLESHOOTING.md)** - Common issues and solutions
9. **[Advanced Patterns](./docs/09-ADVANCED-PATTERNS.md)** - Extending with custom blocks and databases

**Start here:** [docs/README.md](./docs/README.md)

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Notion API    │  Content stored in Notion
└────────┬────────┘
         │ Notion API calls
         ▼
┌─────────────────────────┐
│ Netlify Functions       │  Serverless backend
│  - blog-list.js         │
│  - blog-detail.js       │
│  - submit-to-notion.js  │
└────────┬────────────────┘
         │ JSON responses
         ▼
┌─────────────────────────┐
│ Static Frontend         │  HTML/CSS/JS
│  - index.html           │
│  - blog pages           │
│  - Styled components    │
└─────────────────────────┘
```

### Key Technologies

- **Content Management:** Notion API
- **Backend:** Netlify Functions (Node.js)
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework)
- **Hosting:** Netlify CDN
- **Styling:** CSS with BEM methodology

---

## 🎨 Supported Notion Blocks

Currently supported (10 types):

| Block Type | HTML Output | Styling |
|------------|-------------|---------|
| Paragraph | `<p>` | ✅ |
| Heading 1, 2, 3 | `<h1>`, `<h2>`, `<h3>` | ✅ |
| Bulleted List | `<ul><li>` | ✅ |
| Numbered List | `<ol><li>` | ✅ |
| Image | `<figure><img>` | ✅ |
| Quote | `<blockquote>` | ✅ |
| Code | `<pre><code>` | ✅ |
| Divider | `<hr>` | ✅ |

**Text formatting:** Bold, Italic, Strikethrough, Underline, Code, Links

**Want more?** See [Advanced Patterns](./docs/09-ADVANCED-PATTERNS.md) to add:
- Toggle blocks
- Callout blocks
- Table blocks
- Video embeds
- And more!

---

## 🚀 Extending Your Site

### Add Custom Block Types

See [docs/09-ADVANCED-PATTERNS.md](./docs/09-ADVANCED-PATTERNS.md) for adding:
- Toggle blocks with expand/collapse
- Callout blocks with emoji icons
- Tables with proper HTML structure
- Video embeds (YouTube, Vimeo)

### Database-Driven Sections

Use Notion **databases** to populate any site section:
- Hero section
- Team members
- Services/features
- Pricing tables
- Testimonials
- FAQ sections
- Portfolio projects
- Event calendars
- Job listings

**Example:** Hero section from database

```javascript
// Create "Hero Sections" database in Notion
// Properties: Title, Subtitle, CTA Text, CTA Link, Background Image, Active

// Create netlify/functions/get-hero.js
const response = await notion.databases.query({
  database_id: process.env.NOTION_HERO_DATABASE_ID,
  filter: { property: 'Active', checkbox: { equals: true } },
  sorts: [{ property: 'Priority', direction: 'descending' }]
});

// Frontend auto-updates from Notion!
```

Full examples in [Advanced Patterns guide](./docs/09-ADVANCED-PATTERNS.md).

---

## 🛠️ Customization

### Styling

All styles are in `css/`:
- `styles.css` - Base styles, variables, utilities
- `blog.css` - Blog-specific styles

**Color scheme:**
```css
--color-black: #000000
--color-white: #FFFFFF
--color-yellow: #FCCB00  /* Change this to your brand color! */
```

See [Component Styling Guide](./docs/03-COMPONENT-STYLING.md) for details.

### Adding Pages

1. Create HTML file in `pages/` (e.g., `about.html`)
2. Add redirect in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/about"
     to = "/pages/about.html"
     status = 200
   ```
3. Style with classes from `styles.css`

### Adding Functions

1. Create file in `netlify/functions/` (e.g., `get-team.js`)
2. Query Notion database
3. Return JSON
4. Fetch from frontend

See [API Reference](./docs/07-API-REFERENCE.md) for patterns.

---

## 🎯 Use Cases

Perfect for:
- ✅ Marketing websites
- ✅ Personal portfolios
- ✅ Company blogs
- ✅ Documentation sites
- ✅ Landing pages
- ✅ Small business sites
- ✅ Project showcases

Not ideal for:
- ❌ Real-time applications (5-10 min cache delay)
- ❌ E-commerce (use Shopify, WooCommerce)
- ❌ User authentication (use Auth0, Netlify Identity)
- ❌ High-traffic sites (>100k monthly visitors without optimization)

---

## ⚡ Performance

- **Lighthouse Score:** 90+ (out of 100)
- **Load Time:** <2 seconds
- **Caching:** 5-10 minute cache on API responses
- **CDN:** Global edge network (Netlify)
- **Optimization:** Lazy loading, minified CSS, optimized images

---

## 💰 Costs

**Netlify Free Tier:**
- 100 GB bandwidth/month
- 125k function invocations/month
- 300 build minutes/month

**Notion:**
- Free: Personal use
- $8/month: Team collaboration

**Estimated monthly cost for small site:** $0 - $8 (Netlify free + Notion free/paid)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - feel free to use for personal or commercial projects.

---

## 🆘 Getting Help

- **Documentation:** Start with [docs/README.md](./docs/README.md)
- **Troubleshooting:** See [docs/08-TROUBLESHOOTING.md](./docs/08-TROUBLESHOOTING.md)
- **Issues:** [Open an issue](https://github.com/yourusername/notion-cms-starter/issues)
- **Notion API:** [developers.notion.com](https://developers.notion.com)
- **Netlify Docs:** [docs.netlify.com](https://docs.netlify.com)

---

## 🎓 Learning Path

**New to Notion-as-CMS?** Follow this order:

1. ✅ Read this README
2. ✅ Follow [Setup Guide](./docs/01-SETUP-GUIDE.md)
3. ✅ Review [Notion Block Types](./docs/02-NOTION-BLOCK-TYPES.md)
4. ✅ Explore [Component Styling](./docs/03-COMPONENT-STYLING.md)
5. ✅ Build something!

**Ready for more?**
- Add custom blocks: [Advanced Patterns](./docs/09-ADVANCED-PATTERNS.md)
- Build dynamic pages: [Programmatic Pages](./docs/04-PROGRAMMATIC-PAGES.md)
- Use AI assistance: [Agent Prompts](./docs/06-AGENT-PROMPTS.md)

---

## 🌟 Star This Repo!

If this starter kit helped you, please ⭐ star it on GitHub!

---

**Built with ❤️ using Notion + Netlify**

[Get Started](./docs/01-SETUP-GUIDE.md) • [Documentation](./docs/README.md) • [Advanced Patterns](./docs/09-ADVANCED-PATTERNS.md)
# Notion-as-CMS
