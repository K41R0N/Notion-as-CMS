const { Client } = require('@notionhq/client');

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

    // Get the ABI Blog page ID from environment variable
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

    // Get all child pages of the ABI Blog page
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
          
          // Get page content to extract description and hero image
          const blocks = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 10 // Just get first few blocks for preview
          });

          // Extract title from page properties
          const title = page.properties?.title?.title?.[0]?.plain_text || 
                       page.properties?.Name?.title?.[0]?.plain_text ||
                       'Untitled Post';

          // Extract description from first paragraph block
          let description = '';
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

          // Extract hero image from first image block
          let heroImage = null;
          const firstImage = blocks.results.find(block => block.type === 'image');
          
          if (firstImage) {
            heroImage = firstImage.image?.file?.url || 
                       firstImage.image?.external?.url;
          }

          // Create URL-friendly slug from title
          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          return {
            id: pageId,
            title,
            description,
            heroImage,
            slug,
            publishedDate: page.created_time,
            lastEditedDate: page.last_edited_time,
            url: `/blog/${slug}`
          };
        } catch (error) {
          console.error(`Error fetching page ${pageId}:`, error);
          return null;
        }
      })
    );

    // Filter out failed requests and sort by creation date (newest first)
    const validPosts = blogPosts
      .filter(post => post !== null)
      .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        posts: validPosts,
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

