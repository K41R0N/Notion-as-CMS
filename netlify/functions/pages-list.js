const { Client } = require('@notionhq/client');

/**
 * Pages List Function
 * Returns all pages the Notion integration has access to.
 * This enables dynamic page rendering based on integration permissions.
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
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

    // Search for all pages the integration has access to
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

    for (const page of response.results) {
      try {
        // Extract page title
        let title = 'Untitled';

        if (page.properties) {
          // Try common title property names
          const titleProp = page.properties.title ||
                           page.properties.Title ||
                           page.properties.Name ||
                           page.properties.name;

          if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
          }
        }

        // Generate slug from title
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || page.id;

        // Extract icon if available
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

        // Extract cover if available
        let cover = null;
        if (page.cover) {
          if (page.cover.type === 'external') {
            cover = page.cover.external.url;
          } else if (page.cover.type === 'file') {
            cover = page.cover.file.url;
          }
        }

        // Determine page type based on parent
        let pageType = 'page';
        let parentId = null;

        if (page.parent) {
          if (page.parent.type === 'database_id') {
            pageType = 'database_entry';
            parentId = page.parent.database_id;
          } else if (page.parent.type === 'page_id') {
            pageType = 'child_page';
            parentId = page.parent.page_id;
          } else if (page.parent.type === 'workspace') {
            pageType = 'root_page';
          }
        }

        pages.push({
          id: page.id,
          title,
          slug,
          icon,
          cover,
          pageType,
          parentId,
          url: `/page/${slug}`,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time
        });
      } catch (error) {
        console.error(`Error processing page ${page.id}:`, error);
        continue;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pages,
        total: pages.length,
        hasMore: response.has_more,
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
