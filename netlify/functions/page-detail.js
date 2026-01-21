const { Client } = require('@notionhq/client');

/**
 * Page Detail Function
 * Fetches any Notion page by slug or ID and converts all blocks to HTML.
 * Supports the complete Notion block type specification.
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
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
    const { slug, id } = event.queryStringParameters || {};

    if (!slug && !id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Page slug or ID is required' })
      };
    }

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

    let pageId = id;
    let pageTitle = '';

    // If we have a slug, search for the page
    if (slug && !id) {
      const searchResponse = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: 100
      });

      for (const page of searchResponse.results) {
        let title = extractTitle(page);
        const pageSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        if (pageSlug === slug) {
          pageId = page.id;
          pageTitle = title;
          break;
        }
      }

      if (!pageId) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Page not found' })
        };
      }
    }

    // Get full page data
    const page = await notion.pages.retrieve({ page_id: pageId });

    if (!pageTitle) {
      pageTitle = extractTitle(page);
    }

    // Get all blocks with pagination
    const blocks = await getAllBlocks(notion, pageId);

    // Convert blocks to HTML with full block type support
    const content = await blocksToHtml(notion, blocks);

    // Extract metadata
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

    let cover = null;
    if (page.cover) {
      if (page.cover.type === 'external') {
        cover = page.cover.external.url;
      } else if (page.cover.type === 'file') {
        cover = page.cover.file.url;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: pageId,
        title: pageTitle,
        icon,
        cover,
        content,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
        slug: slug || pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      })
    };

  } catch (error) {
    console.error('Error fetching page:', error);

    let errorMessage = 'Failed to fetch page';
    let statusCode = 500;

    if (error.code === 'unauthorized') {
      errorMessage = 'Notion integration not configured properly';
      statusCode = 503;
    } else if (error.code === 'object_not_found') {
      errorMessage = 'Page not found';
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

/**
 * Extract title from a Notion page
 */
function extractTitle(page) {
  if (!page.properties) return 'Untitled';

  const titleProp = page.properties.title ||
                   page.properties.Title ||
                   page.properties.Name ||
                   page.properties.name;

  return titleProp?.title?.[0]?.plain_text || 'Untitled';
}

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
  }

  return allBlocks;
}

/**
 * Convert Notion blocks to HTML
 * Supports ALL Notion block types
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
        // Close previous list if different type
        if (listContext.type) {
          html += closeList(listContext);
        }
        listContext = { type: listType, items: [] };
      }

      listContext.items.push(block);

      // Check if next block continues the list
      const nextIssamelist = nextBlock &&
        ((listType === 'ul' && nextBlock.type === 'bulleted_list_item') ||
         (listType === 'ol' && nextBlock.type === 'numbered_list_item'));

      if (!nextIssamelist) {
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

/**
 * Close a list and return HTML
 */
function closeList(listContext) {
  if (!listContext.type || listContext.items.length === 0) return '';

  const tag = listContext.type;
  let html = `<${tag} class="notion-list">\n`;

  for (const item of listContext.items) {
    const content = item.type === 'bulleted_list_item'
      ? item.bulleted_list_item
      : item.numbered_list_item;
    html += `  <li>${richTextToHtml(content.rich_text)}</li>\n`;
  }

  html += `</${tag}>\n`;
  return html;
}

/**
 * Convert a single block to HTML
 */
async function blockToHtml(notion, block) {
  const type = block.type;

  switch (type) {
    // Text blocks
    case 'paragraph': {
      const text = richTextToHtml(block.paragraph.rich_text);
      if (!text.trim()) return '';
      return `<p class="notion-paragraph">${text}</p>\n`;
    }

    case 'heading_1': {
      const text = richTextToHtml(block.heading_1.rich_text);
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<h1 id="${id}" class="notion-h1">${text}</h1>\n`;
    }

    case 'heading_2': {
      const text = richTextToHtml(block.heading_2.rich_text);
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<h2 id="${id}" class="notion-h2">${text}</h2>\n`;
    }

    case 'heading_3': {
      const text = richTextToHtml(block.heading_3.rich_text);
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<h3 id="${id}" class="notion-h3">${text}</h3>\n`;
    }

    // Quote and callout
    case 'quote': {
      const text = richTextToHtml(block.quote.rich_text);
      return `<blockquote class="notion-quote">${text}</blockquote>\n`;
    }

    case 'callout': {
      const text = richTextToHtml(block.callout.rich_text);
      const icon = block.callout.icon;
      let iconHtml = '';

      if (icon) {
        if (icon.type === 'emoji') {
          iconHtml = `<span class="notion-callout-icon">${icon.emoji}</span>`;
        } else if (icon.type === 'external' || icon.type === 'file') {
          const url = icon.external?.url || icon.file?.url;
          iconHtml = `<img class="notion-callout-icon" src="${url}" alt="" />`;
        }
      }

      const color = block.callout.color || 'default';
      return `<div class="notion-callout notion-callout--${color}">${iconHtml}<div class="notion-callout-content">${text}</div></div>\n`;
    }

    // Code
    case 'code': {
      const text = block.code.rich_text.map(t => t.plain_text).join('');
      const language = block.code.language || 'text';
      const caption = block.code.caption ? richTextToHtml(block.code.caption) : '';
      let html = `<pre class="notion-code"><code class="language-${language}">${escapeHtml(text)}</code></pre>\n`;
      if (caption) {
        html = `<figure class="notion-code-figure">${html}<figcaption class="notion-code-caption">${caption}</figcaption></figure>\n`;
      }
      return html;
    }

    // Divider
    case 'divider':
      return `<hr class="notion-divider" />\n`;

    // Media
    case 'image': {
      const url = block.image?.file?.url || block.image?.external?.url;
      const caption = block.image?.caption ? richTextToHtml(block.image.caption) : '';
      if (!url) return '';
      return `<figure class="notion-image">
  <img src="${url}" alt="${caption ? stripHtml(caption) : ''}" loading="lazy" />
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>\n`;
    }

    case 'video': {
      const url = block.video?.file?.url || block.video?.external?.url;
      const caption = block.video?.caption ? richTextToHtml(block.video.caption) : '';
      if (!url) return '';

      // Check if it's a YouTube/Vimeo embed
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          return `<figure class="notion-video">
  <div class="notion-video-wrapper">
    <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen loading="lazy"></iframe>
  </div>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>\n`;
        }
      }

      if (url.includes('vimeo.com')) {
        const videoId = url.split('/').pop();
        return `<figure class="notion-video">
  <div class="notion-video-wrapper">
    <iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allowfullscreen loading="lazy"></iframe>
  </div>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>\n`;
      }

      // Direct video file
      return `<figure class="notion-video">
  <video controls preload="metadata">
    <source src="${url}" />
    Your browser does not support video.
  </video>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>\n`;
    }

    case 'audio': {
      const url = block.audio?.file?.url || block.audio?.external?.url;
      const caption = block.audio?.caption ? richTextToHtml(block.audio.caption) : '';
      if (!url) return '';
      return `<figure class="notion-audio">
  <audio controls preload="metadata">
    <source src="${url}" />
    Your browser does not support audio.
  </audio>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>\n`;
    }

    case 'file': {
      const url = block.file?.file?.url || block.file?.external?.url;
      const caption = block.file?.caption ? richTextToHtml(block.file.caption) : '';
      const name = block.file?.name || 'Download file';
      if (!url) return '';
      return `<div class="notion-file">
  <a href="${url}" target="_blank" rel="noopener noreferrer" class="notion-file-link">
    <span class="notion-file-icon">📎</span>
    <span class="notion-file-name">${escapeHtml(name)}</span>
  </a>
  ${caption ? `<p class="notion-file-caption">${caption}</p>` : ''}
</div>\n`;
    }

    case 'pdf': {
      const url = block.pdf?.file?.url || block.pdf?.external?.url;
      const caption = block.pdf?.caption ? richTextToHtml(block.pdf.caption) : '';
      if (!url) return '';
      return `<figure class="notion-pdf">
  <iframe src="${url}" class="notion-pdf-embed" loading="lazy"></iframe>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>\n`;
    }

    // Embeds
    case 'embed': {
      const url = block.embed?.url;
      const caption = block.embed?.caption ? richTextToHtml(block.embed.caption) : '';
      if (!url) return '';
      return `<figure class="notion-embed">
  <iframe src="${url}" class="notion-embed-iframe" loading="lazy" allowfullscreen></iframe>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>\n`;
    }

    case 'bookmark': {
      const url = block.bookmark?.url;
      const caption = block.bookmark?.caption ? richTextToHtml(block.bookmark.caption) : '';
      if (!url) return '';
      return `<div class="notion-bookmark">
  <a href="${url}" target="_blank" rel="noopener noreferrer" class="notion-bookmark-link">
    <span class="notion-bookmark-url">${escapeHtml(url)}</span>
  </a>
  ${caption ? `<p class="notion-bookmark-caption">${caption}</p>` : ''}
</div>\n`;
    }

    case 'link_preview': {
      const url = block.link_preview?.url;
      if (!url) return '';
      return `<div class="notion-link-preview">
  <a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
</div>\n`;
    }

    // Table
    case 'table': {
      if (!block.has_children) return '';

      try {
        const tableBlocks = await notion.blocks.children.list({
          block_id: block.id,
          page_size: 100
        });

        const hasColumnHeader = block.table.has_column_header;
        const hasRowHeader = block.table.has_row_header;

        let html = '<table class="notion-table">\n';

        tableBlocks.results.forEach((row, rowIndex) => {
          if (row.type !== 'table_row') return;

          const isHeaderRow = hasColumnHeader && rowIndex === 0;
          const tag = isHeaderRow ? 'th' : 'td';
          const wrapper = isHeaderRow ? 'thead' : (rowIndex === 1 && hasColumnHeader ? 'tbody' : '');

          if (wrapper === 'thead') html += '<thead>\n';
          if (wrapper === 'tbody') html += '<tbody>\n';

          html += '<tr>\n';
          row.table_row.cells.forEach((cell, cellIndex) => {
            const isRowHeaderCell = hasRowHeader && cellIndex === 0 && !isHeaderRow;
            const cellTag = isRowHeaderCell ? 'th' : tag;
            html += `  <${cellTag}>${richTextToHtml(cell)}</${cellTag}>\n`;
          });
          html += '</tr>\n';

          if (isHeaderRow) html += '</thead>\n';
        });

        if (hasColumnHeader && tableBlocks.results.length > 1) {
          html += '</tbody>\n';
        }

        html += '</table>\n';
        return html;
      } catch (error) {
        console.error('Error fetching table rows:', error);
        return '<p class="notion-error">Unable to load table</p>\n';
      }
    }

    // Toggle
    case 'toggle': {
      const text = richTextToHtml(block.toggle.rich_text);
      let childrenHtml = '';

      if (block.has_children) {
        try {
          const childBlocks = await notion.blocks.children.list({
            block_id: block.id,
            page_size: 100
          });
          childrenHtml = await blocksToHtml(notion, childBlocks.results);
        } catch (error) {
          console.error('Error fetching toggle children:', error);
        }
      }

      return `<details class="notion-toggle">
  <summary>${text}</summary>
  <div class="notion-toggle-content">${childrenHtml}</div>
</details>\n`;
    }

    // To-do
    case 'to_do': {
      const text = richTextToHtml(block.to_do.rich_text);
      const checked = block.to_do.checked;
      return `<div class="notion-todo">
  <input type="checkbox" ${checked ? 'checked' : ''} disabled />
  <span class="${checked ? 'notion-todo--checked' : ''}">${text}</span>
</div>\n`;
    }

    // Child page / database
    case 'child_page': {
      const title = block.child_page.title;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `<div class="notion-child-page">
  <a href="/page/${slug}">📄 ${escapeHtml(title)}</a>
</div>\n`;
    }

    case 'child_database': {
      const title = block.child_database.title;
      return `<div class="notion-child-database">
  <span>📊 ${escapeHtml(title)}</span>
</div>\n`;
    }

    // Column layout
    case 'column_list': {
      if (!block.has_children) return '';

      try {
        const columns = await notion.blocks.children.list({
          block_id: block.id,
          page_size: 100
        });

        let html = '<div class="notion-columns">\n';

        for (const column of columns.results) {
          if (column.type === 'column' && column.has_children) {
            const columnBlocks = await notion.blocks.children.list({
              block_id: column.id,
              page_size: 100
            });
            const columnContent = await blocksToHtml(notion, columnBlocks.results);
            html += `<div class="notion-column">${columnContent}</div>\n`;
          }
        }

        html += '</div>\n';
        return html;
      } catch (error) {
        console.error('Error fetching columns:', error);
        return '';
      }
    }

    case 'column':
      // Handled by column_list
      return '';

    // Equation
    case 'equation': {
      const expression = block.equation.expression;
      return `<div class="notion-equation" data-equation="${escapeHtml(expression)}">${escapeHtml(expression)}</div>\n`;
    }

    // Table of contents
    case 'table_of_contents':
      return `<nav class="notion-toc" data-toc="true"></nav>\n`;

    // Breadcrumb
    case 'breadcrumb':
      return `<nav class="notion-breadcrumb" data-breadcrumb="true"></nav>\n`;

    // Synced block
    case 'synced_block': {
      if (block.synced_block.synced_from) {
        // This is a reference to another synced block
        try {
          const originalId = block.synced_block.synced_from.block_id;
          const originalBlocks = await notion.blocks.children.list({
            block_id: originalId,
            page_size: 100
          });
          return await blocksToHtml(notion, originalBlocks.results);
        } catch (error) {
          console.error('Error fetching synced block:', error);
          return '';
        }
      } else if (block.has_children) {
        // This is the original synced block
        try {
          const childBlocks = await notion.blocks.children.list({
            block_id: block.id,
            page_size: 100
          });
          return await blocksToHtml(notion, childBlocks.results);
        } catch (error) {
          console.error('Error fetching synced block children:', error);
          return '';
        }
      }
      return '';
    }

    // Template button (just render content)
    case 'template': {
      const text = richTextToHtml(block.template.rich_text);
      return `<div class="notion-template">${text}</div>\n`;
    }

    // Link to page
    case 'link_to_page': {
      const pageRef = block.link_to_page;
      let pageId = pageRef.page_id || pageRef.database_id;
      if (!pageId) return '';

      try {
        const linkedPage = await notion.pages.retrieve({ page_id: pageId });
        const title = extractTitle(linkedPage);
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return `<div class="notion-page-link">
  <a href="/page/${slug}">↗ ${escapeHtml(title)}</a>
</div>\n`;
      } catch (error) {
        return `<div class="notion-page-link notion-page-link--broken">Link to page</div>\n`;
      }
    }

    // Unsupported block types - render gracefully
    default:
      console.log(`Unsupported block type: ${type}`);
      return `<!-- Unsupported block type: ${type} -->\n`;
  }
}

/**
 * Convert rich text array to HTML
 */
function richTextToHtml(richText) {
  if (!richText || !Array.isArray(richText)) return '';

  return richText.map(text => {
    let html = escapeHtml(text.plain_text);

    // Apply annotations
    if (text.annotations) {
      if (text.annotations.bold) html = `<strong>${html}</strong>`;
      if (text.annotations.italic) html = `<em>${html}</em>`;
      if (text.annotations.strikethrough) html = `<del>${html}</del>`;
      if (text.annotations.underline) html = `<u>${html}</u>`;
      if (text.annotations.code) html = `<code class="notion-inline-code">${html}</code>`;

      // Color support
      if (text.annotations.color && text.annotations.color !== 'default') {
        const color = text.annotations.color;
        if (color.endsWith('_background')) {
          html = `<span class="notion-bg-${color.replace('_background', '')}">${html}</span>`;
        } else {
          html = `<span class="notion-color-${color}">${html}</span>`;
        }
      }
    }

    // Handle links
    if (text.href) {
      html = `<a href="${text.href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    }

    // Handle mentions
    if (text.type === 'mention') {
      const mention = text.mention;
      if (mention.type === 'user') {
        html = `<span class="notion-mention notion-mention--user">@${text.plain_text}</span>`;
      } else if (mention.type === 'date') {
        const date = mention.date;
        html = `<span class="notion-mention notion-mention--date">${date.start}${date.end ? ` → ${date.end}` : ''}</span>`;
      } else if (mention.type === 'page') {
        html = `<a href="/page/${text.plain_text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}" class="notion-mention notion-mention--page">${text.plain_text}</a>`;
      }
    }

    // Handle equations
    if (text.type === 'equation') {
      html = `<span class="notion-equation-inline" data-equation="${escapeHtml(text.equation.expression)}">${escapeHtml(text.equation.expression)}</span>`;
    }

    return html;
  }).join('');
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}
