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

    // Optional filter by page type
    const { type: filterType } = event.queryStringParameters || {};

    // Search for all pages
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      },
      page_size: 100
    });

    const pages = [];

    // Build a map of configured parent IDs for quick lookup
    const configuredParents = {
      blog: process.env.NOTION_BLOG_PAGE_ID,
      landing: process.env.NOTION_LANDING_PAGE_ID,
      docs: process.env.NOTION_DOCS_PAGE_ID
    };

    for (const page of response.results) {
      try {
        // Extract page title
        let title = 'Untitled';

        if (page.properties) {
          const titleProp = page.properties.title ||
                           page.properties.Title ||
                           page.properties.Name ||
                           page.properties.name;

          if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
          }
        }

        // Generate slug
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || page.id;

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
          pageType: typeInfo.type,
          styleConfig,
          structureType,
          parentId,
          url,
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
        hasMore: response.has_more,
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
