const { Client } = require('@notionhq/client');

/**
 * Blog List Function
 * Returns all published blog posts with support for:
 * - Draft/Published status filtering
 * - Custom slug override
 * - Pinned/Featured posts
 * - Custom sort order
 * - SEO metadata
 *
 * Notion Page Properties (optional):
 * - Status (select): Draft | Published | Scheduled
 * - Slug (text): Custom URL slug
 * - Pinned (checkbox): Pin to top of list
 * - Featured (checkbox): Mark as featured
 * - Sort Order (number): Custom sort priority
 * - Publish Date (date): Scheduled publish date
 * - Meta Description (text): SEO description
 */
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    // Get the Blog page ID from environment variable
    const blogPageId = process.env.NOTION_BLOG_PAGE_ID;

    if (!blogPageId) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Blog not configured',
          message: 'NOTION_BLOG_PAGE_ID environment variable not set'
        })
      };
    }

    // Check for preview mode (allows viewing drafts)
    // Only enable preview when PREVIEW_SECRET is set AND matches the provided value
    const { preview } = event.queryStringParameters || {};
    const isPreviewMode = !!(process.env.PREVIEW_SECRET && preview && preview === process.env.PREVIEW_SECRET);

    // Get all child pages of the Blog page
    const response = await notion.blocks.children.list({
      block_id: blogPageId,
      page_size: 100
    });

    // Filter for child pages and get their details
    const childPageIds = response.results
      .filter(block => block.type === 'child_page')
      .map(block => block.id);

    // Get detailed information for each blog post
    const blogPosts = await Promise.all(
      childPageIds.map(async (pageId) => {
        try {
          // Get page properties
          const page = await notion.pages.retrieve({ page_id: pageId });

          // Extract status (default to Published if not set)
          const status = page.properties?.Status?.select?.name || 'Published';

          // Check publish date for scheduled posts
          const publishDate = page.properties?.['Publish Date']?.date?.start;
          const now = new Date();

          // Filter out drafts and scheduled posts (unless in preview mode)
          if (!isPreviewMode) {
            if (status === 'Draft') return null;
            if (status === 'Scheduled' && publishDate && new Date(publishDate) > now) return null;
          }

          // Get page content to extract description and hero image
          const blocks = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 10 // Just get first few blocks for preview
          });

          // Extract title from page properties (concatenate all segments)
          let title = 'Untitled Post';
          const titleProp = page.properties?.title || page.properties?.Name;
          if (titleProp?.title && Array.isArray(titleProp.title)) {
            title = titleProp.title.map(t => t.plain_text || '').join('').trim() || 'Untitled Post';
          }

          // Check for custom slug property
          const customSlug = page.properties?.Slug?.rich_text?.[0]?.plain_text;

          // Create URL-friendly slug (use custom or generate from title)
          const slug = customSlug ||
            title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

          // Extract description from Meta Description property or first paragraph
          let description = '';
          const metaDesc = page.properties?.['Meta Description']?.rich_text?.[0]?.plain_text;

          if (metaDesc) {
            description = metaDesc;
          } else {
            const firstParagraph = blocks.results.find(block =>
              block.type === 'paragraph' &&
              block.paragraph?.rich_text?.length > 0
            );

            if (firstParagraph) {
              description = firstParagraph.paragraph.rich_text
                .map(text => text.plain_text)
                .join('')
                .substring(0, 200) + '...';
            }
          }

          // Extract hero image from first image block or cover
          let heroImage = null;
          if (page.cover) {
            heroImage = page.cover.external?.url || page.cover.file?.url;
          } else {
            const firstImage = blocks.results.find(block => block.type === 'image');
            if (firstImage) {
              heroImage = firstImage.image?.file?.url || firstImage.image?.external?.url;
            }
          }

          // Extract additional properties for sorting and featuring
          const isPinned = page.properties?.Pinned?.checkbox || false;
          const isFeatured = page.properties?.Featured?.checkbox || false;
          const sortOrder = page.properties?.['Sort Order']?.number || 0;

          // Extract icon
          let icon = null;
          if (page.icon) {
            if (page.icon.type === 'emoji') icon = page.icon.emoji;
            else if (page.icon.type === 'external') icon = page.icon.external.url;
            else if (page.icon.type === 'file') icon = page.icon.file.url;
          }

          return {
            id: pageId,
            title,
            description,
            heroImage,
            icon,
            slug,
            status,
            isPinned,
            isFeatured,
            sortOrder,
            publishedDate: publishDate || page.created_time,
            lastEditedDate: page.last_edited_time,
            url: `/blog/${slug}`
          };
        } catch (error) {
          console.error(`Error fetching page ${pageId}:`, error);
          return null;
        }
      })
    );

    // Filter out null results and sort
    const validPosts = blogPosts
      .filter(post => post !== null)
      .sort((a, b) => {
        // Pinned posts first
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        // Then by sort order (higher first)
        if (a.sortOrder !== b.sortOrder) return b.sortOrder - a.sortOrder;
        // Then by publish date (newest first)
        return new Date(b.publishedDate) - new Date(a.publishedDate);
      });

    // Separate featured posts
    const featuredPosts = validPosts.filter(p => p.isFeatured);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        posts: validPosts,
        featured: featuredPosts,
        total: validPosts.length,
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error fetching blog posts:', error);

    let errorMessage = 'Failed to fetch blog posts';
    let statusCode = 500;

    if (error.code === 'unauthorized') {
      errorMessage = 'Blog integration not configured properly';
      statusCode = 503;
    } else if (error.code === 'object_not_found') {
      errorMessage = 'Blog page not found';
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

