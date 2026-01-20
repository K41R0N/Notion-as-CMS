# Troubleshooting Guide

Common issues and solutions for Notion-as-CMS implementations. Use this guide to diagnose and fix problems quickly.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Notion API Issues](#notion-api-issues)
3. [Content Not Appearing](#content-not-appearing)
4. [Styling Issues](#styling-issues)
5. [Performance Problems](#performance-problems)
6. [Deployment Issues](#deployment-issues)
7. [Image Issues](#image-issues)
8. [Form Submission Issues](#form-submission-issues)

---

## Quick Diagnostics

### Step 1: Check Browser Console

**How:** Open DevTools (F12 or Cmd+Option+I) → Console tab

**Look for:**
- ❌ Red error messages
- ⚠️ Yellow warnings
- 🔴 Failed network requests

### Step 2: Check Network Tab

**How:** DevTools → Network tab → Reload page

**Look for:**
- Failed requests (red status codes)
- Slow requests (>5 seconds)
- 404 errors (file not found)

### Step 3: Check Netlify Function Logs

**How:** Netlify Dashboard → Functions → Select function → Logs

**Look for:**
- Error stack traces
- Missing environment variables
- Timeout errors

### Step 4: Test API Endpoints Directly

```bash
# Test blog list
curl https://yoursite.com/.netlify/functions/blog-list

# Test blog detail
curl "https://yoursite.com/.netlify/functions/blog-detail?slug=test"

# Test form submission
curl -X POST https://yoursite.com/.netlify/functions/submit-to-notion \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}'
```

---

## Notion API Issues

### Issue: "Notion integration not configured properly"

**Symptoms:**
- Error 503 returned from API
- "unauthorized" error code

**Causes:**
1. Missing `NOTION_TOKEN` environment variable
2. Invalid or expired token
3. Token not set in Netlify

**Solutions:**

✅ **Check environment variables in Netlify:**
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Verify `NOTION_TOKEN` exists and starts with `secret_`
3. If missing, add it and redeploy

✅ **Regenerate Notion token:**
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Find your integration
3. Click "Show" under "Internal Integration Token"
4. Copy new token
5. Update in Netlify environment variables
6. Redeploy site

✅ **Test token locally:**
```bash
# In .env file
NOTION_TOKEN=secret_abc123...

# Test in terminal
npm run dev
curl http://localhost:8888/.netlify/functions/blog-list
```

---

### Issue: "Object not found" or "Page not found"

**Symptoms:**
- Error 404 or 503 returned
- Specific pages not loading
- Empty blog list

**Causes:**
1. Page/database not shared with integration
2. Incorrect page/database ID
3. Page was deleted

**Solutions:**

✅ **Share page with integration:**
1. Open page in Notion
2. Click "Share" (top right)
3. Click "Invite"
4. Search for your integration name
5. Click "Invite"
6. Verify integration appears in shared list

✅ **Verify page/database ID:**
1. Open page in Notion web app
2. Copy URL: `https://notion.so/workspace/PAGE_ID?v=...`
3. Extract 32-character ID (no hyphens)
4. Compare with `NOTION_BLOG_PAGE_ID` or `NOTION_DATABASE_ID`
5. Update if different

✅ **Check page structure:**
```
📄 Blog (parent page) ← This ID goes in NOTION_BLOG_PAGE_ID
  ├── 📝 Post 1 (child page)
  ├── 📝 Post 2 (child page)
  └── 📝 Post 3 (child page)
```

---

### Issue: Rate limiting errors

**Symptoms:**
- "rate_limited" error code
- Intermittent failures
- Slow API responses

**Causes:**
- More than 3 requests per second to Notion API

**Solutions:**

✅ **Implement caching:**
```javascript
// Cache responses in memory
const cache = new Map();

exports.handler = async (event) => {
  const cacheKey = 'blog-posts';
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 300000) {
    return { statusCode: 200, body: cached.data };
  }

  const data = await fetchFromNotion();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return { statusCode: 200, body: data };
};
```

✅ **Add retry logic:**
```javascript
async function fetchWithRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (error.code === 'rate_limited' && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
```

✅ **Increase cache durations:**
```javascript
headers: {
  'Cache-Control': 'public, max-age=1800' // 30 minutes instead of 5
}
```

---

## Content Not Appearing

### Issue: Blog list is empty

**Symptoms:**
- "No blog posts yet" message
- Empty posts array in API response

**Causes:**
1. No child pages under blog parent page
2. Pages not shared with integration
3. Wrong page ID

**Solutions:**

✅ **Verify page structure:**
1. Open blog parent page in Notion
2. Ensure it has child pages (not database rows)
3. Child pages appear indented under parent

✅ **Check API response:**
```bash
curl https://yoursite.com/.netlify/functions/blog-list | jq
```

Expected structure:
```json
{
  "posts": [...],
  "total": 3
}
```

If `posts` is empty, check page sharing and structure.

---

### Issue: Blog post content not rendering

**Symptoms:**
- Post title shows but content is blank
- Partial content rendering
- HTML tags showing as text

**Causes:**
1. Unsupported Notion block types
2. Empty page content
3. HTML escaping issues

**Solutions:**

✅ **Check supported block types:**

See [Notion Block Types Reference](./02-NOTION-BLOCK-TYPES.md) for supported blocks.

Unsupported blocks are silently skipped:
- Toggle blocks
- Callouts
- Tables
- Embeds

✅ **Add debug logging:**
```javascript
// In blog-detail.js
const blocks = await getAllBlocks(notion, targetPageId);
console.log('Blocks:', JSON.stringify(blocks, null, 2));
```

Check Netlify function logs to see block types.

✅ **Test with simple content:**

Create a test post with only supported blocks:
- Paragraph
- Heading 2
- Bullet list
- Image

If this works, the issue is unsupported block types.

---

### Issue: Incorrect blog post description

**Symptoms:**
- Description is "undefined" or "..."
- Description too short
- Description contains HTML tags

**Causes:**
1. First block is not a paragraph
2. Paragraph is empty
3. Description extraction logic failed

**Solutions:**

✅ **Ensure first block is paragraph:**

In Notion, add a paragraph block at the start of your post (not heading or image).

✅ **Adjust description extraction:**

In `blog-list.js:81-92`:
```javascript
// Current: Takes first paragraph
const firstParagraph = blocks.results.find(block =>
  block.type === 'paragraph' &&
  block.paragraph?.rich_text?.length > 0
);

// Alternative: Skip first block if it's short
const paragraphs = blocks.results.filter(block =>
  block.type === 'paragraph' &&
  block.paragraph?.rich_text?.length > 0
);
const firstParagraph = paragraphs.find(p => {
  const text = p.paragraph.rich_text.map(t => t.plain_text).join('');
  return text.length > 50; // Skip very short paragraphs
});
```

---

## Styling Issues

### Issue: Styles not loading

**Symptoms:**
- Unstyled HTML (browser default styles)
- 404 errors for CSS files

**Causes:**
1. Incorrect CSS file paths
2. CSS files not deployed
3. Cache issues

**Solutions:**

✅ **Check file paths:**
```html
<!-- Correct (absolute paths) -->
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/blog.css">

<!-- Incorrect (relative paths) -->
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="../css/styles.css">
```

✅ **Verify files exist:**
```bash
# Check locally
ls css/styles.css css/blog.css

# Check deployed site
curl -I https://yoursite.com/css/styles.css
```

✅ **Clear cache:**
- Browser: Cmd/Ctrl + Shift + R (hard refresh)
- Netlify: Dashboard → Deploys → Options → Clear cache and deploy

---

### Issue: Blog post content has no styling

**Symptoms:**
- Content appears but looks unstyled
- Images too large
- No spacing between elements

**Causes:**
1. Missing `.post-content` wrapper class
2. CSS not applied to dynamic content
3. Incorrect CSS selectors

**Solutions:**

✅ **Verify HTML structure:**
```html
<div class="post-content" id="post-body">
  <!-- Content injected here -->
</div>
```

✅ **Check CSS selectors:**
```css
/* Correct: Scoped to .post-content */
.post-content p { margin-bottom: 1.5rem; }
.post-content img { max-width: 100%; }

/* Incorrect: Global selectors */
p { margin-bottom: 1.5rem; }
img { max-width: 100%; }
```

✅ **Inspect rendered HTML:**
1. Open DevTools → Elements
2. Find `.post-content` div
3. Verify content is inside
4. Check computed styles

---

### Issue: Mobile layout broken

**Symptoms:**
- Horizontal scrolling on mobile
- Text too small
- Elements overlapping

**Causes:**
1. Missing viewport meta tag
2. Fixed widths instead of responsive
3. Missing media queries

**Solutions:**

✅ **Add viewport meta tag:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

✅ **Use responsive units:**
```css
/* Good: Responsive */
.container {
  max-width: 1200px;
  padding: 0 2rem;
}

/* Bad: Fixed width */
.container {
  width: 1200px;
}
```

✅ **Test on multiple devices:**
- DevTools → Toggle device toolbar
- Test on actual mobile device
- Use responsive design mode

---

## Performance Problems

### Issue: Slow page load times

**Symptoms:**
- Pages take >3 seconds to load
- Blank screen during load
- Poor Lighthouse scores

**Causes:**
1. Large unoptimized images
2. No caching
3. Too many API calls
4. Synchronous script loading

**Solutions:**

✅ **Optimize images:**
```html
<!-- Add loading="lazy" -->
<img src="image.jpg" alt="..." loading="lazy">

<!-- Use WebP with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="...">
</picture>
```

✅ **Enable caching:**

Already implemented in API responses, but verify:
```javascript
headers: {
  'Cache-Control': 'public, max-age=600'
}
```

✅ **Async script loading:**
```html
<!-- Defer non-critical scripts -->
<script src="/js/script.js" defer></script>
```

✅ **Preload critical assets:**
```html
<link rel="preload" href="/css/styles.css" as="style">
<link rel="preload" href="/fonts/font.woff2" as="font" crossorigin>
```

---

### Issue: Notion images loading slowly

**Symptoms:**
- Images take >5 seconds to appear
- Some images don't load at all
- Broken image icons

**Causes:**
1. Notion-hosted images (slow, expires in 1 hour)
2. Large file sizes
3. No lazy loading

**Solutions:**

✅ **Use external image hosting:**
1. Upload images to Cloudinary, Imgix, or S3
2. Get permanent URL
3. Use external image in Notion (paste URL)

✅ **Compress images:**
- Use TinyPNG or ImageOptim
- Target <200KB per image
- Convert to WebP format

✅ **Implement lazy loading:**
```html
<img src="image.jpg" loading="lazy" alt="...">
```

---

## Deployment Issues

### Issue: Build succeeds but site doesn't update

**Symptoms:**
- Deployment shows success
- Content unchanged on live site
- Old version still showing

**Causes:**
1. Cache not cleared
2. Wrong branch deployed
3. Environment variables not set

**Solutions:**

✅ **Clear cache and redeploy:**
1. Netlify Dashboard → Deploys
2. Options → Clear cache and deploy site

✅ **Verify deploy branch:**
1. Site Settings → Build & Deploy
2. Check "Production branch" matches your git branch

✅ **Check environment variables:**
1. Site Settings → Environment Variables
2. Ensure all required vars are set
3. Redeploy after adding vars

---

### Issue: Functions not deploying

**Symptoms:**
- 404 errors for function endpoints
- "Function not found" errors
- Functions work locally but not in production

**Causes:**
1. Wrong functions directory
2. Missing dependencies in package.json
3. Syntax errors in function code

**Solutions:**

✅ **Verify netlify.toml:**
```toml
[build]
  functions = "netlify/functions"
```

✅ **Check package.json:**
```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.15"
  }
}
```

✅ **Check Netlify function logs:**
1. Dashboard → Functions → Select function
2. Look for deployment errors
3. Fix syntax errors and redeploy

---

### Issue: Environment variables not working in production

**Symptoms:**
- Functions work locally but fail in production
- "Environment variable not set" errors

**Causes:**
1. Variables not set in Netlify
2. Typos in variable names
3. Variables not scoped correctly

**Solutions:**

✅ **Set variables in Netlify:**
1. Site Settings → Environment Variables
2. Add each variable:
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
   - `NOTION_BLOG_PAGE_ID`
   - `NODE_ENV=production`
3. Redeploy after adding

✅ **Verify variable names:**
```javascript
// Must match exactly (case-sensitive)
process.env.NOTION_TOKEN  // ✅ Correct
process.env.notion_token  // ❌ Wrong case
process.env.NOTIONTOKEN   // ❌ Missing underscore
```

✅ **Test in production:**
```bash
# Check function logs for variable presence
console.log('NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'Set' : 'Missing');
```

---

## Image Issues

### Issue: Images not displaying

**Symptoms:**
- Broken image icons
- Alt text showing instead of image
- 404 errors for images

**Causes:**
1. Notion image URLs expired (1 hour)
2. Incorrect image URLs
3. CORS issues

**Solutions:**

✅ **Use external image hosting:**

**Cloudinary (recommended):**
1. Sign up at cloudinary.com
2. Upload image
3. Copy URL
4. Paste as external image in Notion

**S3:**
1. Upload to S3 bucket
2. Make bucket public
3. Copy URL
4. Use in Notion

✅ **Refresh Notion URLs:**

Notion-hosted image URLs refresh on each API call. If using Notion hosting:
- Clear cache
- Wait 5-10 minutes for cache expiry
- Reload page

✅ **Check image URL format:**
```javascript
// Correct: Both file and external URLs handled
const imageUrl = block.image?.file?.url || block.image?.external?.url;
```

---

### Issue: Images too large or wrong size

**Symptoms:**
- Images overflow container
- Layout breaks on mobile
- Images pixelated or blurry

**Causes:**
1. No max-width constraint
2. Wrong aspect ratio
3. Low-resolution source

**Solutions:**

✅ **Add responsive image styles:**
```css
.blog-image img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

✅ **Use responsive images:**
```html
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 768px) 100vw, 800px"
  alt="..."
>
```

---

## Form Submission Issues

### Issue: Form submission fails

**Symptoms:**
- "Failed to submit" error
- Form doesn't clear after submit
- No data in Notion database

**Causes:**
1. Invalid email format
2. Missing required fields
3. Database not configured
4. CORS errors

**Solutions:**

✅ **Check browser console:**

Look for error messages:
- "Name and email are required"
- "Invalid email format"
- CORS error

✅ **Verify database properties:**

Database must have these exact properties:
- Name (Title)
- Email (Email)
- Message (Rich Text)
- Status (Select)
- Source (Select)
- Date Submitted (Date)

✅ **Test API directly:**
```bash
curl -X POST https://yoursite.com/.netlify/functions/submit-to-notion \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","message":"Hi"}' \
  -v
```

---

### Issue: Form submits but data doesn't appear in Notion

**Symptoms:**
- Success message shown
- No error in logs
- Data not in Notion database

**Causes:**
1. Wrong database ID
2. Database not shared
3. Integration lacks permission

**Solutions:**

✅ **Verify database ID:**
1. Open database in Notion
2. Copy URL: `https://notion.so/workspace/DATABASE_ID?v=...`
3. Compare with `NOTION_DATABASE_ID`

✅ **Check integration permissions:**
1. Open database → Share
2. Verify integration is listed
3. Re-invite if missing

✅ **Check Netlify logs:**
```javascript
// Add logging to function
console.log('Creating page in database:', process.env.NOTION_DATABASE_ID);
console.log('Response:', response);
```

---

## Getting Help

### Before Asking for Help

1. ✅ Read relevant documentation sections
2. ✅ Check browser console for errors
3. ✅ Review Netlify function logs
4. ✅ Test API endpoints directly
5. ✅ Search this troubleshooting guide

### How to Ask for Help

Include this information:

```
**Issue:** Brief description

**Error Message:** (exact text from console/logs)

**What I've tried:**
- Checked browser console
- Verified environment variables
- Tested API endpoint directly

**Environment:**
- Local or Production
- Browser: Chrome 120
- Notion integration ID: (first 6 chars only)

**Relevant Code/Logs:**
[Paste code or logs here]
```

### Resources

- **Notion API Docs:** https://developers.notion.com
- **Netlify Docs:** https://docs.netlify.com
- **Notion API Status:** https://status.notion.so
- **GitHub Issues:** [Your repo]/issues

---

## Quick Reference

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Check NOTION_TOKEN |
| 404 | Not Found | Check page/database ID and sharing |
| 429 | Rate Limited | Add caching, retry logic |
| 500 | Server Error | Check function logs |
| 503 | Service Unavailable | Check Notion integration config |

### Environment Variables Checklist

- [ ] `NOTION_TOKEN` set and starts with `secret_`
- [ ] `NOTION_DATABASE_ID` is 32 characters (no hyphens)
- [ ] `NOTION_BLOG_PAGE_ID` is 32 characters (no hyphens)
- [ ] `NODE_ENV` set to `production` in Netlify
- [ ] All variables set in Netlify dashboard
- [ ] Site redeployed after adding variables

### Notion Setup Checklist

- [ ] Integration created at notion.so/my-integrations
- [ ] Blog page created with child pages
- [ ] Lead database created with required properties
- [ ] Blog page shared with integration
- [ ] Database shared with integration
- [ ] Page/database IDs copied correctly

---

## Next Steps

- **Review setup** → [Setup Guide](./01-SETUP-GUIDE.md)
- **Optimize performance** → [Agent Prompts](./06-AGENT-PROMPTS.md)
- **Check API reference** → [API Reference](./07-API-REFERENCE.md)
