const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
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
    // Get slug from query parameters
    const { slug } = event.queryStringParameters || {};
    
    if (!slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Blog post slug is required' })
      };
    }

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

    // Get all child pages to find the one with matching slug (with pagination)
    let allChildPages = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.blocks.children.list({
        block_id: blogPageId,
        page_size: 100,
        start_cursor: startCursor
      });

      const childPages = response.results.filter(block => block.type === 'child_page');
      allChildPages = allChildPages.concat(childPages);
      hasMore = response.has_more;
      startCursor = response.next_cursor;

      // Safety limit
      if (allChildPages.length > 500) {
        hasMore = false;
      }
    }

    const childPageIds = allChildPages.map(block => block.id);

    // Find the page with matching slug (check custom Slug property first, then title-derived)
    let targetPageId = null;
    let pageTitle = '';
    let targetPage = null;
    let resolvedSlug = null;

    for (const pageId of childPageIds) {
      try {
        const page = await notion.pages.retrieve({ page_id: pageId });

        // Extract title (concatenate all segments)
        let title = 'Untitled Post';
        const titleProp = page.properties?.title || page.properties?.Title || page.properties?.Name;
        if (titleProp?.title && Array.isArray(titleProp.title)) {
          title = titleProp.title.map(t => t.plain_text || '').join('').trim() || 'Untitled Post';
        }

        // Check custom Slug property first
        const customSlug = page.properties?.Slug?.rich_text?.[0]?.plain_text;

        // Generate title-derived slug as fallback
        const titleSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Match: if customSlug exists, only match against it; otherwise match against titleSlug
        if ((customSlug && customSlug === slug) || (!customSlug && titleSlug === slug)) {
          targetPageId = pageId;
          pageTitle = title;
          targetPage = page;
          // Store the canonical slug (custom slug takes priority)
          resolvedSlug = customSlug || titleSlug;
          break;
        }
      } catch (error) {
        console.error(`Error checking page ${pageId}:`, error);
        continue;
      }
    }

    if (!targetPageId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Blog post not found' })
      };
    }

    // Get the full page content
    const page = await notion.pages.retrieve({ page_id: targetPageId });
    const blocks = await getAllBlocks(notion, targetPageId);

    // Convert Notion blocks to HTML
    const content = await blocksToHtml(blocks);

    // Extract metadata
    const publishedDate = page.created_time;
    const lastEditedDate = page.last_edited_time;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: targetPageId,
        title: pageTitle,
        content,
        publishedDate,
        lastEditedDate,
        slug: resolvedSlug,
        url: `/blog/${resolvedSlug}`
      })
    };

  } catch (error) {
    console.error('Error fetching blog post:', error);
    
    let errorMessage = 'Failed to fetch blog post';
    let statusCode = 500;

    if (error.code === 'unauthorized') {
      errorMessage = 'Blog integration not configured properly';
      statusCode = 503;
    } else if (error.code === 'object_not_found') {
      errorMessage = 'Blog post not found';
      statusCode = 404;
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

// Helper function to get all blocks (handles pagination)
async function getAllBlocks(notion, blockId) {
  let allBlocks = [];
  let hasMore = true;
  let nextCursor = undefined;

  while (hasMore) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: nextCursor,
      page_size: 100
    });

    allBlocks = allBlocks.concat(response.results);
    hasMore = response.has_more;
    nextCursor = response.next_cursor;
  }

  return allBlocks;
}

// Helper function to convert Notion blocks to HTML
async function blocksToHtml(blocks) {
  let html = '';

  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        const paragraphText = richTextToHtml(block.paragraph.rich_text);
        if (paragraphText.trim()) {
          html += `<p>${paragraphText}</p>\n`;
        }
        break;

      case 'heading_1':
        const h1Text = richTextToHtml(block.heading_1.rich_text);
        html += `<h1>${h1Text}</h1>\n`;
        break;

      case 'heading_2':
        const h2Text = richTextToHtml(block.heading_2.rich_text);
        html += `<h2>${h2Text}</h2>\n`;
        break;

      case 'heading_3':
        const h3Text = richTextToHtml(block.heading_3.rich_text);
        html += `<h3>${h3Text}</h3>\n`;
        break;

      case 'bulleted_list_item':
        const bulletText = richTextToHtml(block.bulleted_list_item.rich_text);
        html += `<ul><li>${bulletText}</li></ul>\n`;
        break;

      case 'numbered_list_item':
        const numberedText = richTextToHtml(block.numbered_list_item.rich_text);
        html += `<ol><li>${numberedText}</li></ol>\n`;
        break;

      case 'image':
        const imageUrl = block.image?.file?.url || block.image?.external?.url;
        const caption = block.image?.caption ? richTextToHtml(block.image.caption) : '';
        if (imageUrl) {
          html += `<figure class="blog-image">
            <img src="${imageUrl}" alt="${caption}" loading="lazy">
            ${caption ? `<figcaption>${caption}</figcaption>` : ''}
          </figure>\n`;
        }
        break;

      case 'quote':
        const quoteText = richTextToHtml(block.quote.rich_text);
        html += `<blockquote>${quoteText}</blockquote>\n`;
        break;

      case 'code':
        const codeText = richTextToHtml(block.code.rich_text);
        const language = block.code.language || 'text';
        html += `<pre><code class="language-${language}">${escapeHtml(codeText)}</code></pre>\n`;
        break;

      case 'divider':
        html += `<hr>\n`;
        break;

      default:
        // Handle unsupported blocks gracefully
        console.log(`Unsupported block type: ${block.type}`);
        break;
    }
  }

  return html;
}

// Helper function to convert rich text to HTML
function richTextToHtml(richText) {
  if (!richText || !Array.isArray(richText)) return '';

  return richText.map(text => {
    let html = escapeHtml(text.plain_text);

    // Apply formatting
    if (text.annotations?.bold) {
      html = `<strong>${html}</strong>`;
    }
    if (text.annotations?.italic) {
      html = `<em>${html}</em>`;
    }
    if (text.annotations?.strikethrough) {
      html = `<del>${html}</del>`;
    }
    if (text.annotations?.underline) {
      html = `<u>${html}</u>`;
    }
    if (text.annotations?.code) {
      html = `<code>${html}</code>`;
    }

    // Handle links
    if (text.href) {
      html = `<a href="${text.href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    }

    return html;
  }).join('');
}

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

