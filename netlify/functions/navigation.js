const { Client } = require('@notionhq/client');

/**
 * Navigation Function
 * Auto-detects site structure and returns navigation items.
 *
 * Logic:
 * 1. Fetches all pages shared with the integration
 * 2. Identifies the root/parent page(s)
 * 3. Returns child pages as nav items in Notion order
 * 4. Marks "Home" or "Homepage" pages for logo linking
 *
 * Environment Variables:
 * - NOTION_TOKEN: Notion integration token
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    if (!process.env.NOTION_TOKEN) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Notion not configured',
          message: 'NOTION_TOKEN environment variable not set'
        })
      };
    }

    // Fetch all pages with pagination
    let allPages = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 100,
        start_cursor: startCursor
      });

      allPages = allPages.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;

      if (allPages.length > 500) {
        hasMore = false;
      }
    }

    // Build parent-child relationships
    const pageMap = new Map();
    const childrenByParent = new Map();
    const rootPages = [];

    for (const page of allPages) {
      const pageId = page.id.replace(/-/g, '');

      // Extract title
      let title = 'Untitled';
      if (page.properties) {
        const titleProp = page.properties.title ||
                         page.properties.Title ||
                         page.properties.Name;
        if (titleProp?.title?.[0]?.plain_text) {
          title = titleProp.title.map(t => t.plain_text).join('');
        }
      }

      // Extract icon
      let icon = null;
      if (page.icon) {
        if (page.icon.type === 'emoji') {
          icon = page.icon.emoji;
        } else if (page.icon.type === 'external') {
          icon = page.icon.external.url;
        } else if (page.icon.type === 'file') {
          icon = page.icon.file.url;
        }
      }

      // Check if draft
      const status = page.properties?.Status?.select?.name || 'Published';
      if (status === 'Draft') continue;

      const pageInfo = {
        id: page.id,
        title,
        icon,
        parentId: null,
        parentType: page.parent?.type,
        createdTime: page.created_time
      };

      // Track parent relationship
      if (page.parent?.type === 'page_id') {
        pageInfo.parentId = page.parent.page_id.replace(/-/g, '');

        if (!childrenByParent.has(pageInfo.parentId)) {
          childrenByParent.set(pageInfo.parentId, []);
        }
        childrenByParent.get(pageInfo.parentId).push(pageInfo);
      } else if (page.parent?.type === 'workspace') {
        rootPages.push(pageInfo);
      }

      pageMap.set(pageId, pageInfo);
    }

    // Determine navigation items
    let navItems = [];
    let homePage = null;
    let siteRoot = null;

    // Strategy: If there's exactly one workspace-level page with children,
    // use its children as nav items. Otherwise, use workspace-level pages.
    if (rootPages.length === 1 && childrenByParent.has(rootPages[0].id.replace(/-/g, ''))) {
      // Single root page - use its children for navigation
      siteRoot = rootPages[0];
      const rootId = siteRoot.id.replace(/-/g, '');
      navItems = childrenByParent.get(rootId) || [];
    } else if (rootPages.length > 0) {
      // Multiple root pages or single without children - use them directly
      navItems = rootPages;
    } else {
      // No workspace-level pages - find pages that are parents to others
      // and use pages with most children as potential roots
      let maxChildren = 0;
      let likelyRoot = null;

      for (const [parentId, children] of childrenByParent) {
        if (children.length > maxChildren && pageMap.has(parentId)) {
          maxChildren = children.length;
          likelyRoot = parentId;
        }
      }

      if (likelyRoot) {
        siteRoot = pageMap.get(likelyRoot);
        navItems = childrenByParent.get(likelyRoot) || [];
      }
    }

    // Sort by creation time (Note: Notion's search API doesn't preserve manual sidebar order,
    // so creation time provides a consistent, predictable ordering)
    navItems.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));

    // URL mapping allowlist - maps page titles to their route paths
    const urlMappings = {
      'blog': '/blog',
      'blogs': '/blog',
      'post': '/blog',
      'posts': '/blog',
      'doc': '/docs',
      'docs': '/docs',
      'documentation': '/docs',
      'page': '/pages',
      'pages': '/pages'
    };

    // Process nav items - identify home page and generate URLs
    const processedItems = [];
    const includedUrls = new Set();

    for (const item of navItems) {
      const titleLower = item.title.toLowerCase().trim();
      const isHome = titleLower === 'home' || titleLower === 'homepage';

      // Generate slug
      const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      // Determine URL - check allowlist first, fall back to /page/{slug}
      const url = urlMappings[titleLower] || `/page/${slug}`;

      const navItem = {
        id: item.id,
        title: item.title,
        icon: item.icon,
        slug,
        url,
        isHome
      };

      if (isHome) {
        homePage = navItem;
      } else {
        processedItems.push(navItem);
        includedUrls.add(url);
      }
    }

    // Ensure configured page types are included in navigation
    // even if they're not direct children of the root page
    const configuredSections = [
      { envVar: 'NOTION_BLOG_PAGE_ID', title: 'Blog', url: '/blog', icon: '📝' },
      { envVar: 'NOTION_DOCS_PAGE_ID', title: 'Docs', url: '/docs', icon: '📖' },
      { envVar: 'NOTION_LANDING_PAGE_ID', title: 'Pages', url: '/pages', icon: '📄' }
    ];

    for (const section of configuredSections) {
      if (process.env[section.envVar] && !includedUrls.has(section.url)) {
        processedItems.push({
          id: process.env[section.envVar],
          title: section.title,
          icon: section.icon,
          slug: section.title.toLowerCase(),
          url: section.url,
          isHome: false,
          isConfigured: true  // Flag to indicate this was added from config
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items: processedItems,
        homePage,
        siteRoot: siteRoot ? {
          id: siteRoot.id,
          title: siteRoot.title,
          icon: siteRoot.icon
        } : null,
        totalItems: processedItems.length,
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error fetching navigation:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch navigation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
