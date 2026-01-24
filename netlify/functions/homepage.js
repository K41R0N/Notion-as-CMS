const { Client } = require('@notionhq/client');

/**
 * Homepage Function
 * Fetches the configured homepage from Notion and returns rendered content.
 * Uses landing page layout styling.
 *
 * Environment Variables:
 * - NOTION_TOKEN: Notion integration token
 * - NOTION_HOMEPAGE_ID: The Notion page ID for the homepage
 * - PREVIEW_SECRET: Secret for viewing draft content
 *
 * Notion Page Properties (optional):
 * - Status (select): Draft | Published
 * - Meta Title (text): SEO title
 * - Meta Description (text): SEO description
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

    const homepageId = process.env.NOTION_HOMEPAGE_ID;

    if (!homepageId) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Homepage not configured',
          message: 'NOTION_HOMEPAGE_ID environment variable not set'
        })
      };
    }

    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    // Check for preview mode
    const { preview } = event.queryStringParameters || {};
    const isPreviewMode = !!(process.env.PREVIEW_SECRET && preview && preview === process.env.PREVIEW_SECRET);

    // Get the homepage
    const page = await notion.pages.retrieve({ page_id: homepageId });

    // Check status (allow drafts in preview mode)
    const status = page.properties?.Status?.select?.name || 'Published';
    if (!isPreviewMode && status === 'Draft') {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Homepage not available',
          message: 'Homepage is currently in draft mode'
        })
      };
    }

    // Extract title
    let title = 'Home';
    const titleProp = page.properties?.title || page.properties?.Title || page.properties?.Name;
    if (titleProp?.title && Array.isArray(titleProp.title)) {
      title = titleProp.title.map(t => t.plain_text || '').join('').trim() || 'Home';
    }

    // Extract SEO metadata
    const metaTitle = page.properties?.['Meta Title']?.rich_text?.[0]?.plain_text || title;
    const metaDescription = page.properties?.['Meta Description']?.rich_text?.[0]?.plain_text || '';

    // Extract icon
    let icon = null;
    if (page.icon) {
      if (page.icon.type === 'emoji') icon = page.icon.emoji;
      else if (page.icon.type === 'external') icon = page.icon.external.url;
      else if (page.icon.type === 'file') icon = page.icon.file.url;
    }

    // Extract cover
    let cover = null;
    if (page.cover) {
      if (page.cover.type === 'external') cover = page.cover.external.url;
      else if (page.cover.type === 'file') cover = page.cover.file.url;
    }

    // Get all blocks with pagination
    const blocks = await getAllBlocks(notion, homepageId);

    // Convert blocks to HTML
    const content = await blocksToHtml(notion, blocks);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: homepageId,
        title,
        metaTitle,
        metaDescription,
        icon,
        cover,
        content,
        status,
        pageType: 'landing',
        lastEditedTime: page.last_edited_time
      })
    };

  } catch (error) {
    console.error('Error fetching homepage:', error);

    let errorMessage = 'Failed to fetch homepage';
    let statusCode = 500;

    if (error.code === 'unauthorized') {
      errorMessage = 'Notion integration not configured properly';
      statusCode = 503;
    } else if (error.code === 'object_not_found') {
      errorMessage = 'Homepage not found - check NOTION_HOMEPAGE_ID';
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
 * Get all blocks from a page with pagination
 */
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

    // Safety limit
    if (allBlocks.length > 500) {
      hasMore = false;
    }
  }

  return allBlocks;
}

/**
 * Convert Notion blocks to HTML (simplified version for homepage)
 */
async function blocksToHtml(notion, blocks) {
  let html = '';
  let listContext = { type: null, items: [] };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];

    // Handle list grouping
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const listType = block.type === 'bulleted_list_item' ? 'ul' : 'ol';

      if (listContext.type !== listType) {
        if (listContext.type) {
          html += closeList(listContext);
        }
        listContext = { type: listType, items: [] };
      }

      listContext.items.push(block);

      const nextIsSameList = nextBlock &&
        ((listType === 'ul' && nextBlock.type === 'bulleted_list_item') ||
         (listType === 'ol' && nextBlock.type === 'numbered_list_item'));

      if (!nextIsSameList) {
        html += closeList(listContext);
        listContext = { type: null, items: [] };
      }
      continue;
    }

    // Close any open list before other block types
    if (listContext.type) {
      html += closeList(listContext);
      listContext = { type: null, items: [] };
    }

    html += await blockToHtml(notion, block);
  }

  // Close any remaining list
  if (listContext.type) {
    html += closeList(listContext);
  }

  return html;
}

function closeList(listContext) {
  const tag = listContext.type;
  const items = listContext.items.map(item => {
    const content = richTextToHtml(item[item.type].rich_text);
    return `<li>${content}</li>`;
  }).join('');
  return `<${tag} class="notion-list">${items}</${tag}>`;
}

async function blockToHtml(notion, block) {
  const type = block.type;

  switch (type) {
    case 'paragraph':
      const pText = richTextToHtml(block.paragraph.rich_text);
      if (!pText.trim()) return '';
      return `<p class="notion-paragraph">${pText}</p>`;

    case 'heading_1':
      const h1Text = richTextToPlainText(block.heading_1.rich_text);
      const h1Html = richTextToHtml(block.heading_1.rich_text);
      const h1Id = h1Text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<h1 id="${h1Id}" class="notion-h1">${h1Html}</h1>`;

    case 'heading_2':
      const h2Text = richTextToPlainText(block.heading_2.rich_text);
      const h2Html = richTextToHtml(block.heading_2.rich_text);
      const h2Id = h2Text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<h2 id="${h2Id}" class="notion-h2">${h2Html}</h2>`;

    case 'heading_3':
      const h3Text = richTextToPlainText(block.heading_3.rich_text);
      const h3Html = richTextToHtml(block.heading_3.rich_text);
      const h3Id = h3Text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<h3 id="${h3Id}" class="notion-h3">${h3Html}</h3>`;

    case 'quote':
      const quoteText = richTextToHtml(block.quote.rich_text);
      return `<blockquote class="notion-quote">${quoteText}</blockquote>`;

    case 'callout':
      const calloutText = richTextToHtml(block.callout.rich_text);
      const calloutIcon = block.callout.icon?.emoji || '💡';
      const calloutColor = block.callout.color || 'default';
      return `<div class="notion-callout notion-callout--${calloutColor}">
        <span class="notion-callout-icon">${calloutIcon}</span>
        <div class="notion-callout-content">${calloutText}</div>
      </div>`;

    case 'code':
      const codeText = escapeHtml(block.code.rich_text.map(t => t.plain_text).join(''));
      const language = block.code.language || 'text';
      return `<pre class="notion-code"><code class="language-${language}">${codeText}</code></pre>`;

    case 'divider':
      return '<hr class="notion-divider">';

    case 'image':
      const imgUrl = block.image.file?.url || block.image.external?.url || '';
      const imgCaption = block.image.caption?.length > 0
        ? richTextToHtml(block.image.caption)
        : '';
      return `<figure class="notion-image">
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(imgCaption.replace(/<[^>]*>/g, ''))}" loading="lazy">
        ${imgCaption ? `<figcaption>${imgCaption}</figcaption>` : ''}
      </figure>`;

    case 'video':
      const videoUrl = block.video.file?.url || block.video.external?.url || '';
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const videoId = extractYouTubeId(videoUrl);
        if (videoId) {
          return `<figure class="notion-video">
            <div class="notion-video-wrapper">
              <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
            </div>
          </figure>`;
        }
      }
      return `<figure class="notion-video">
        <video src="${escapeHtml(videoUrl)}" controls></video>
      </figure>`;

    case 'embed':
      const embedUrl = block.embed.url || '';
      return `<div class="notion-embed">
        <iframe src="${escapeHtml(embedUrl)}" class="notion-embed-iframe" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
      </div>`;

    case 'bookmark':
      const bookmarkUrl = block.bookmark.url || '';
      return `<div class="notion-bookmark">
        <a href="${escapeHtml(bookmarkUrl)}" class="notion-bookmark-link" target="_blank" rel="noopener noreferrer">
          <span class="notion-bookmark-url">${escapeHtml(bookmarkUrl)}</span>
        </a>
      </div>`;

    case 'toggle':
      const toggleText = richTextToHtml(block.toggle.rich_text);
      let toggleContent = '';
      if (block.has_children) {
        const children = await notion.blocks.children.list({ block_id: block.id });
        toggleContent = await blocksToHtml(notion, children.results);
      }
      return `<details class="notion-toggle">
        <summary>${toggleText}</summary>
        <div class="notion-toggle-content">${toggleContent}</div>
      </details>`;

    case 'column_list':
      if (block.has_children) {
        const columns = await notion.blocks.children.list({ block_id: block.id });
        let columnsHtml = '';
        for (const column of columns.results) {
          if (column.type === 'column' && column.has_children) {
            const columnBlocks = await notion.blocks.children.list({ block_id: column.id });
            const columnContent = await blocksToHtml(notion, columnBlocks.results);
            columnsHtml += `<div class="notion-column">${columnContent}</div>`;
          }
        }
        return `<div class="notion-columns">${columnsHtml}</div>`;
      }
      return '';

    case 'table':
      if (block.has_children) {
        const rows = await notion.blocks.children.list({ block_id: block.id });
        let tableHtml = '<div class="notion-table-wrapper"><table class="notion-table">';
        const hasHeader = block.table.has_column_header;

        rows.results.forEach((row, idx) => {
          if (row.type === 'table_row') {
            const cells = row.table_row.cells;
            const tag = (hasHeader && idx === 0) ? 'th' : 'td';
            const rowHtml = cells.map(cell => {
              const cellContent = richTextToHtml(cell);
              return `<${tag}>${cellContent}</${tag}>`;
            }).join('');
            tableHtml += `<tr>${rowHtml}</tr>`;
          }
        });

        tableHtml += '</table></div>';
        return tableHtml;
      }
      return '';

    case 'to_do':
      const todoText = richTextToHtml(block.to_do.rich_text);
      const checked = block.to_do.checked;
      return `<div class="notion-todo ${checked ? 'notion-todo--checked' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} disabled>
        <span>${todoText}</span>
      </div>`;

    case 'child_page':
      const childTitle = block.child_page.title || 'Untitled';
      const childSlug = childTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<div class="notion-child-page">
        <a href="/page/${childSlug}">📄 ${escapeHtml(childTitle)}</a>
      </div>`;

    default:
      return '';
  }
}

function richTextToHtml(richText) {
  if (!richText || !Array.isArray(richText)) return '';

  return richText.map(text => {
    let content = escapeHtml(text.plain_text || '');

    // Apply annotations
    if (text.annotations) {
      if (text.annotations.bold) content = `<strong>${content}</strong>`;
      if (text.annotations.italic) content = `<em>${content}</em>`;
      if (text.annotations.strikethrough) content = `<del>${content}</del>`;
      if (text.annotations.underline) content = `<u>${content}</u>`;
      if (text.annotations.code) content = `<code class="notion-inline-code">${content}</code>`;

      // Color handling
      const color = text.annotations.color;
      if (color && color !== 'default') {
        if (color.endsWith('_background')) {
          const bgColor = color.replace('_background', '');
          content = `<span class="notion-bg-${bgColor}">${content}</span>`;
        } else {
          content = `<span class="notion-color-${color}">${content}</span>`;
        }
      }
    }

    // Handle links
    if (text.href) {
      const safeHref = sanitizeHref(text.href);
      if (safeHref) {
        content = `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
      }
    }

    return content;
  }).join('');
}

function richTextToPlainText(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(text => text.plain_text || '').join('');
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function sanitizeHref(href) {
  if (!href || typeof href !== 'string') return null;
  const trimmed = href.trim().toLowerCase();
  if (trimmed.startsWith('javascript:')) return null;
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/')) return null;
  if (trimmed.startsWith('data:image/svg')) return null;
  // Allow http, https, mailto, tel, and relative paths
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') ||
      trimmed.startsWith('/') || trimmed.startsWith('#') ||
      !trimmed.includes(':')) {
    return href;
  }
  return null;
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
