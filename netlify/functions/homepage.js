const { Client } = require('@notionhq/client');

/**
 * Homepage Function
 * Fetches the configured homepage from Notion and returns structured sections.
 * Uses toggle blocks to define sections: Hero, Features, Steps, Code, CTA
 *
 * Environment Variables:
 * - NOTION_TOKEN: Notion integration token
 * - NOTION_HOMEPAGE_ID: The Notion page ID for the homepage
 * - PREVIEW_SECRET: Secret for viewing draft content
 *
 * Notion Page Structure:
 * - Toggle "Hero" → title, description, buttons
 * - Toggle "Features" → callouts become feature cards
 * - Toggle "Steps" or "How It Works" → numbered step cards
 * - Toggle "Code" → terminal-style code blocks
 * - Toggle "CTA" → call-to-action section
 * - Any other content → rendered as generic section
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

    // Get all blocks
    const blocks = await getAllBlocks(notion, homepageId);

    // Parse sections from toggle blocks
    const sections = await parseSections(notion, blocks);

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
        sections,
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

    if (allBlocks.length > 500) {
      hasMore = false;
    }
  }

  return allBlocks;
}

/**
 * Section type mapping from toggle names
 */
const SECTION_TYPES = {
  'hero': 'hero',
  'features': 'features',
  'feature': 'features',
  'steps': 'steps',
  'how it works': 'steps',
  'how-it-works': 'steps',
  'code': 'code',
  'setup': 'code',
  'quick setup': 'code',
  'cta': 'cta',
  'call to action': 'cta',
  'action': 'cta'
};

/**
 * Parse sections from blocks - toggles define sections
 */
async function parseSections(notion, blocks) {
  const sections = [];
  let genericContent = [];

  for (const block of blocks) {
    if (block.type === 'toggle') {
      // Flush any accumulated generic content
      if (genericContent.length > 0) {
        const html = await blocksToHtml(notion, genericContent);
        if (html.trim()) {
          sections.push({ type: 'content', content: html });
        }
        genericContent = [];
      }

      // Parse toggle as section
      const toggleName = richTextToPlainText(block.toggle.rich_text).toLowerCase().trim();
      const sectionType = SECTION_TYPES[toggleName] || 'content';

      // Get toggle children with pagination support
      let children = [];
      if (block.has_children) {
        children = await getAllBlocks(notion, block.id);
      }

      // Parse based on section type
      const section = await parseSection(notion, sectionType, children, toggleName);
      if (section) {
        sections.push(section);
      }
    } else {
      // Accumulate non-toggle blocks as generic content
      genericContent.push(block);
    }
  }

  // Flush remaining generic content
  if (genericContent.length > 0) {
    const html = await blocksToHtml(notion, genericContent);
    if (html.trim()) {
      sections.push({ type: 'content', content: html });
    }
  }

  return sections;
}

/**
 * Parse a specific section type from toggle children
 */
async function parseSection(notion, type, blocks, originalName) {
  switch (type) {
    case 'hero':
      return parseHeroSection(notion, blocks);
    case 'features':
      return parseFeaturesSection(notion, blocks);
    case 'steps':
      return parseStepsSection(notion, blocks);
    case 'code':
      return parseCodeSection(notion, blocks);
    case 'cta':
      return parseCtaSection(notion, blocks);
    default:
      const content = await blocksToHtml(notion, blocks);
      return { type: 'content', title: originalName, content };
  }
}

/**
 * Parse Hero section
 * Expects: H1 (title), paragraph (description), links (buttons)
 */
async function parseHeroSection(notion, blocks) {
  const section = {
    type: 'hero',
    badge: null,
    title: '',
    description: '',
    buttons: [],
    image: null
  };

  for (const block of blocks) {
    if (block.type === 'heading_1' && !section.title) {
      section.title = richTextToHtml(block.heading_1.rich_text);
    } else if (block.type === 'heading_2' && !section.title) {
      section.title = richTextToHtml(block.heading_2.rich_text);
    } else if (block.type === 'paragraph') {
      const text = block.paragraph.rich_text;
      // Check if paragraph contains only links (buttons)
      const hasOnlyLinks = text.length > 0 && text.every(t => t.href || !t.plain_text.trim());
      if (hasOnlyLinks) {
        for (const t of text) {
          if (t.href) {
            // Sanitize href to reject unsafe schemes
            const safeUrl = sanitizeHref(t.href);
            if (safeUrl) {
              section.buttons.push({
                text: t.plain_text,
                url: safeUrl,
                primary: section.buttons.length === 0
              });
            }
          }
        }
      } else if (!section.description) {
        section.description = richTextToHtml(text);
      } else if (!section.badge) {
        // Small text before title could be badge
        const plainText = richTextToPlainText(text);
        if (plainText.length < 50) {
          section.badge = plainText;
        }
      }
    } else if (block.type === 'callout' && !section.badge) {
      // Callout as badge
      section.badge = richTextToPlainText(block.callout.rich_text);
    } else if (block.type === 'image') {
      section.image = block.image.file?.url || block.image.external?.url;
    }
  }

  return section;
}

/**
 * Parse Features section
 * Expects: callouts become feature cards
 */
async function parseFeaturesSection(notion, blocks) {
  const section = {
    type: 'features',
    title: '',
    items: []
  };

  for (const block of blocks) {
    if ((block.type === 'heading_1' || block.type === 'heading_2') && !section.title) {
      section.title = richTextToPlainText(block[block.type].rich_text);
    } else if (block.type === 'callout') {
      const icon = block.callout.icon?.emoji || '✨';
      const text = richTextToPlainText(block.callout.rich_text);
      // Split by dash or newline for title/description
      const parts = text.split(/[-–—\n]/);
      const title = parts[0]?.trim() || text;
      const description = parts.slice(1).join(' ').trim() || '';

      section.items.push({ icon, title, description });
    } else if (block.type === 'bulleted_list_item') {
      // List items as features
      const text = richTextToPlainText(block.bulleted_list_item.rich_text);
      const parts = text.split(/[-–—:]/);
      section.items.push({
        icon: '•',
        title: parts[0]?.trim() || text,
        description: parts.slice(1).join(' ').trim() || ''
      });
    }
  }

  return section;
}

/**
 * Parse Steps section
 * Expects: numbered list or callouts
 */
async function parseStepsSection(notion, blocks) {
  const section = {
    type: 'steps',
    title: '',
    items: []
  };

  let stepNumber = 1;

  for (const block of blocks) {
    if ((block.type === 'heading_1' || block.type === 'heading_2') && !section.title) {
      section.title = richTextToPlainText(block[block.type].rich_text);
    } else if (block.type === 'numbered_list_item') {
      const text = richTextToPlainText(block.numbered_list_item.rich_text);
      const parts = text.split(/[-–—:]/);
      section.items.push({
        number: stepNumber++,
        title: parts[0]?.trim() || text,
        description: parts.slice(1).join(' ').trim() || ''
      });
    } else if (block.type === 'callout') {
      const text = richTextToPlainText(block.callout.rich_text);
      const parts = text.split(/[-–—\n]/);
      section.items.push({
        number: stepNumber++,
        title: parts[0]?.trim() || text,
        description: parts.slice(1).join(' ').trim() || ''
      });
    } else if (block.type === 'paragraph') {
      // Check if starts with number
      const text = richTextToPlainText(block.paragraph.rich_text);
      const match = text.match(/^(\d+)[.\)]\s*(.+)/);
      if (match) {
        const parts = match[2].split(/[-–—:]/);
        section.items.push({
          number: parseInt(match[1]),
          title: parts[0]?.trim(),
          description: parts.slice(1).join(' ').trim() || ''
        });
      }
    }
  }

  return section;
}

/**
 * Parse Code section
 * Expects: code blocks
 */
async function parseCodeSection(notion, blocks) {
  const section = {
    type: 'code',
    title: '',
    description: '',
    blocks: []
  };

  for (const block of blocks) {
    if ((block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') && !section.title) {
      section.title = richTextToPlainText(block[block.type].rich_text);
    } else if (block.type === 'paragraph' && !section.description) {
      section.description = richTextToPlainText(block.paragraph.rich_text);
    } else if (block.type === 'code') {
      const code = block.code.rich_text.map(t => t.plain_text).join('');
      const language = block.code.language || 'text';
      const caption = block.code.caption?.length > 0
        ? richTextToPlainText(block.code.caption)
        : '';
      section.blocks.push({ code, language, caption });
    }
  }

  return section;
}

/**
 * Parse CTA section
 * Expects: heading, paragraph, links
 */
async function parseCtaSection(notion, blocks) {
  const section = {
    type: 'cta',
    title: '',
    description: '',
    buttons: []
  };

  for (const block of blocks) {
    if ((block.type === 'heading_1' || block.type === 'heading_2') && !section.title) {
      section.title = richTextToHtml(block[block.type].rich_text);
    } else if (block.type === 'paragraph') {
      const text = block.paragraph.rich_text;
      // Check for links
      const links = text.filter(t => t.href);
      if (links.length > 0) {
        for (const link of links) {
          // Sanitize href to reject unsafe schemes
          const safeUrl = sanitizeHref(link.href);
          if (safeUrl) {
            section.buttons.push({
              text: link.plain_text,
              url: safeUrl,
              primary: section.buttons.length === 0
            });
          }
        }
      } else if (!section.description) {
        section.description = richTextToHtml(text);
      }
    } else if (block.type === 'quote') {
      if (!section.title) {
        section.title = richTextToHtml(block.quote.rich_text);
      } else if (!section.description) {
        section.description = richTextToHtml(block.quote.rich_text);
      }
    }
  }

  return section;
}

/**
 * Convert blocks to HTML (for generic content sections)
 */
async function blocksToHtml(notion, blocks) {
  let html = '';
  let listContext = { type: null, items: [] };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];

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

    if (listContext.type) {
      html += closeList(listContext);
      listContext = { type: null, items: [] };
    }

    html += await blockToHtml(notion, block);
  }

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
      return `<h1 class="notion-h1">${richTextToHtml(block.heading_1.rich_text)}</h1>`;

    case 'heading_2':
      return `<h2 class="notion-h2">${richTextToHtml(block.heading_2.rich_text)}</h2>`;

    case 'heading_3':
      return `<h3 class="notion-h3">${richTextToHtml(block.heading_3.rich_text)}</h3>`;

    case 'quote':
      return `<blockquote class="notion-quote">${richTextToHtml(block.quote.rich_text)}</blockquote>`;

    case 'callout':
      const calloutIcon = block.callout.icon?.emoji || '💡';
      const calloutColor = block.callout.color || 'default';
      return `<div class="notion-callout notion-callout--${calloutColor}">
        <span class="notion-callout-icon">${calloutIcon}</span>
        <div class="notion-callout-content">${richTextToHtml(block.callout.rich_text)}</div>
      </div>`;

    case 'code':
      const codeText = escapeHtml(block.code.rich_text.map(t => t.plain_text).join(''));
      const language = block.code.language || 'text';
      return `<pre class="notion-code"><code class="language-${language}">${codeText}</code></pre>`;

    case 'divider':
      return '<hr class="notion-divider">';

    case 'image':
      const imgUrl = block.image.file?.url || block.image.external?.url || '';
      const imgCaption = block.image.caption?.length > 0 ? richTextToHtml(block.image.caption) : '';
      return `<figure class="notion-image">
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(imgCaption.replace(/<[^>]*>/g, ''))}" loading="lazy">
        ${imgCaption ? `<figcaption>${imgCaption}</figcaption>` : ''}
      </figure>`;

    case 'toggle':
      const toggleText = richTextToHtml(block.toggle.rich_text);
      let toggleContent = '';
      if (block.has_children) {
        const children = await getAllBlocks(notion, block.id);
        toggleContent = await blocksToHtml(notion, children);
      }
      return `<details class="notion-toggle">
        <summary>${toggleText}</summary>
        <div class="notion-toggle-content">${toggleContent}</div>
      </details>`;

    default:
      return '';
  }
}

function richTextToHtml(richText) {
  if (!richText || !Array.isArray(richText)) return '';

  return richText.map(text => {
    let content = escapeHtml(text.plain_text || '');

    if (text.annotations) {
      if (text.annotations.bold) content = `<strong>${content}</strong>`;
      if (text.annotations.italic) content = `<em>${content}</em>`;
      if (text.annotations.strikethrough) content = `<del>${content}</del>`;
      if (text.annotations.underline) content = `<u>${content}</u>`;
      if (text.annotations.code) content = `<code class="notion-inline-code">${content}</code>`;

      const color = text.annotations.color;
      if (color && color !== 'default') {
        if (color.endsWith('_background')) {
          content = `<span class="notion-bg-${color.replace('_background', '')}">${content}</span>`;
        } else {
          content = `<span class="notion-color-${color}">${content}</span>`;
        }
      }
    }

    if (text.href) {
      const safeHref = sanitizeHref(text.href);
      if (safeHref) {
        content = `<a href="${escapeHtml(safeHref)}">${content}</a>`;
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
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function sanitizeHref(href) {
  if (!href || typeof href !== 'string') return null;
  const trimmed = href.trim().toLowerCase();
  if (trimmed.startsWith('javascript:')) return null;
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/')) return null;
  if (trimmed.startsWith('data:image/svg')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') ||
      trimmed.startsWith('/') || trimmed.startsWith('#') ||
      !trimmed.includes(':')) {
    return href;
  }
  return null;
}
