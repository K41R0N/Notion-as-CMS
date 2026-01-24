const { Client } = require('@notionhq/client');
const { determinePageType, getPageTypeConfig, normalizeId } = require('./lib/page-types');

/**
 * Pages List Function
 * Returns all pages the Notion integration has access to.
 * Includes page type detection based on configured parent pages.
 *
 * Environment Variables:
 * - NOTION_TOKEN: Notion integration token
 * - NOTION_BLOG_PAGE_ID: Parent page for blog posts
 * - NOTION_LANDING_PAGE_ID: Parent page for landing pages
 * - NOTION_DOCS_PAGE_ID: Parent page for documentation
 * - PREVIEW_SECRET: Secret for viewing draft content
 *
 * Notion Page Properties (optional):
 * - Status (select): Draft | Published | Scheduled
 * - Slug (text): Custom URL slug override
 * - Publish Date (date): Scheduled publish date
 * - Meta Description (text): SEO description
 * - Meta Title (text): SEO title override
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

    // Optional filter by page type and preview mode
    const { type: filterType, preview } = event.queryStringParameters || {};
    const isPreviewMode = preview === process.env.PREVIEW_SECRET;

    // Search for all pages with pagination
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        page_size: 100,
        start_cursor: startCursor
      });

      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;

      // Safety limit to prevent infinite loops
      if (allResults.length > 1000) {
        hasMore = false;
      }
    }

    const pages = [];

    // Build a map of configured parent IDs for quick lookup
    const configuredParents = {
      blog: process.env.NOTION_BLOG_PAGE_ID,
      landing: process.env.NOTION_LANDING_PAGE_ID,
      docs: process.env.NOTION_DOCS_PAGE_ID
    };

    for (const page of allResults) {
      try {
        // Extract page title (concatenate all rich text segments)
        let title = 'Untitled';

        if (page.properties) {
          const titleProp = page.properties.title ||
                           page.properties.Title ||
                           page.properties.Name ||
                           page.properties.name;

          if (titleProp?.title && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
            // Concatenate all rich text segments for multi-segment titles
            title = titleProp.title
              .map(segment => segment.plain_text || '')
              .join('')
              .trim() || 'Untitled';
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

        // Extract cover
        let cover = null;
        if (page.cover) {
          if (page.cover.type === 'external') {
            cover = page.cover.external.url;
          } else if (page.cover.type === 'file') {
            cover = page.cover.file.url;
          }
        }

        // Extract status (default to Published if not set)
        const status = page.properties?.Status?.select?.name || 'Published';

        // Check publish date for scheduled posts
        const publishDate = page.properties?.['Publish Date']?.date?.start;
        const now = new Date();

        // Filter out drafts and scheduled posts (unless in preview mode)
        if (!isPreviewMode) {
          if (status === 'Draft') continue;
          if (status === 'Scheduled' && publishDate && new Date(publishDate) > now) continue;
        }

        // Extract custom slug from Notion property
        const customSlug = page.properties?.Slug?.rich_text?.[0]?.plain_text;

        // Use custom slug if provided, otherwise generate from title
        const slug = customSlug ||
          title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || page.id;

        // Extract SEO metadata
        const metaDescription = page.properties?.['Meta Description']?.rich_text?.[0]?.plain_text || '';
        const metaTitle = page.properties?.['Meta Title']?.rich_text?.[0]?.plain_text || '';

        // Determine page type from configured parents
        const typeInfo = await determinePageType(notion, page.id, page);
        const styleConfig = getPageTypeConfig(typeInfo.type);

        // Determine structural info
        let structureType = 'page';
        let parentId = null;

        if (page.parent) {
          if (page.parent.type === 'database_id') {
            structureType = 'database_entry';
            parentId = page.parent.database_id;
          } else if (page.parent.type === 'page_id') {
            structureType = 'child_page';
            parentId = page.parent.page_id;
          } else if (page.parent.type === 'workspace') {
            structureType = 'root_page';
          }
        }

        // Skip if filtering by type and doesn't match
        if (filterType && typeInfo.type !== filterType) {
          continue;
        }

        // Generate appropriate URL based on page type
        let url = `/page/${slug}`;
        if (typeInfo.type === 'blog') {
          url = `/blog/${slug}`;
        } else if (typeInfo.type === 'docs') {
          url = `/docs/${slug}`;
        }

        pages.push({
          id: page.id,
          title,
          slug,
          icon,
          cover,
          status,
          pageType: typeInfo.type,
          styleConfig,
          structureType,
          parentId,
          url,
          publishDate: publishDate || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time
        });
      } catch (error) {
        console.error(`Error processing page ${page.id}:`, error);
        continue;
      }
    }

    // Get configured parent info for response
    const configuration = {
      blogPageId: configuredParents.blog || null,
      landingPageId: configuredParents.landing || null,
      docsPageId: configuredParents.docs || null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pages,
        total: pages.length,
        totalFetched: allResults.length,
        configuration,
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error fetching pages:', error);

    let errorMessage = 'Failed to fetch pages';
    let statusCode = 500;

    if (error.code === 'unauthorized') {
      errorMessage = 'Notion integration not configured properly';
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
