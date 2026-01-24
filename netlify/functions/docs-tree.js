const { Client } = require('@notionhq/client');

/**
 * Docs Tree Function
 * Returns a hierarchical tree structure of documentation pages.
 * Automatically generates sidebar navigation from Notion page hierarchy.
 *
 * Environment Variables:
 * - NOTION_TOKEN: Notion integration token
 * - NOTION_DOCS_PAGE_ID: Parent page for documentation
 * - PREVIEW_SECRET: Secret for viewing draft content
 *
 * Notion Page Properties (optional):
 * - Status (select): Draft | Published
 * - Slug (text): Custom URL slug
 * - Sort Order (number): Custom sort priority (higher = first)
 * - Nav Title (text): Shorter title for sidebar navigation
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

    const docsPageId = process.env.NOTION_DOCS_PAGE_ID;

    if (!docsPageId) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Docs not configured',
          message: 'NOTION_DOCS_PAGE_ID environment variable not set'
        })
      };
    }

    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    // Check for preview mode
    const { preview } = event.queryStringParameters || {};
    const isPreviewMode = preview === process.env.PREVIEW_SECRET;

    // Build tree recursively starting from docs root
    const tree = await buildDocsTree(notion, docsPageId, isPreviewMode, 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tree,
        rootId: docsPageId,
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error building docs tree:', error);

    let errorMessage = 'Failed to build docs tree';
    let statusCode = 500;

    if (error.code === 'unauthorized') {
      errorMessage = 'Notion integration not configured properly';
      statusCode = 503;
    } else if (error.code === 'object_not_found') {
      errorMessage = 'Docs page not found';
      statusCode = 503;
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
};

/**
 * Recursively build the docs tree from a parent page
 */
async function buildDocsTree(notion, parentId, isPreviewMode, depth) {
  // Limit depth to prevent infinite recursion
  const MAX_DEPTH = 5;
  if (depth > MAX_DEPTH) {
    return [];
  }

  try {
    // Get all child blocks of the parent
    const response = await notion.blocks.children.list({
      block_id: parentId,
      page_size: 100
    });

    // Filter for child pages
    const childPages = response.results.filter(block => block.type === 'child_page');

    // Get details for each child page
    const items = await Promise.all(
      childPages.map(async (block) => {
        try {
          const page = await notion.pages.retrieve({ page_id: block.id });

          // Extract status
          const status = page.properties?.Status?.select?.name || 'Published';

          // Filter drafts unless in preview mode
          if (!isPreviewMode && status === 'Draft') {
            return null;
          }

          // Extract title
          let title = block.child_page?.title || 'Untitled';
          const titleProp = page.properties?.title || page.properties?.Name;
          if (titleProp?.title && Array.isArray(titleProp.title)) {
            title = titleProp.title.map(t => t.plain_text || '').join('').trim() || title;
          }

          // Extract nav title (shorter title for sidebar)
          const navTitle = page.properties?.['Nav Title']?.rich_text?.[0]?.plain_text || title;

          // Extract custom slug
          const customSlug = page.properties?.Slug?.rich_text?.[0]?.plain_text;
          const slug = customSlug ||
            title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

          // Extract sort order
          const sortOrder = page.properties?.['Sort Order']?.number || 0;

          // Extract icon
          let icon = null;
          if (page.icon) {
            if (page.icon.type === 'emoji') icon = page.icon.emoji;
            else if (page.icon.type === 'external') icon = page.icon.external.url;
            else if (page.icon.type === 'file') icon = page.icon.file.url;
          }

          // Recursively get children
          const children = await buildDocsTree(notion, block.id, isPreviewMode, depth + 1);

          return {
            id: block.id,
            title,
            navTitle,
            slug,
            icon,
            status,
            sortOrder,
            url: `/docs/${slug}`,
            hasChildren: children.length > 0,
            children
          };
        } catch (error) {
          console.error(`Error fetching page ${block.id}:`, error);
          return null;
        }
      })
    );

    // Filter null results and sort
    return items
      .filter(item => item !== null)
      .sort((a, b) => {
        // Sort by sort order (higher first), then alphabetically by title
        if (a.sortOrder !== b.sortOrder) return b.sortOrder - a.sortOrder;
        return a.title.localeCompare(b.title);
      });

  } catch (error) {
    console.error(`Error building tree for ${parentId}:`, error);
    return [];
  }
}
