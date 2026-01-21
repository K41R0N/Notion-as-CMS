/**
 * Page Type Detection Utility
 *
 * Determines page type based on parent page hierarchy.
 * Configure parent page IDs via environment variables:
 *
 * - NOTION_BLOG_PAGE_ID: Blog posts (article style)
 * - NOTION_LANDING_PAGE_ID: Landing pages (marketing style)
 * - NOTION_DOCS_PAGE_ID: Documentation (sidebar + TOC style)
 *
 * Default: 'landing' when page doesn't belong to any configured parent
 */

const PAGE_TYPES = {
  BLOG: 'blog',
  LANDING: 'landing',
  DOCS: 'docs'
};

/**
 * Get configured parent page IDs from environment
 */
function getConfiguredParents() {
  return {
    [PAGE_TYPES.BLOG]: process.env.NOTION_BLOG_PAGE_ID,
    [PAGE_TYPES.LANDING]: process.env.NOTION_LANDING_PAGE_ID,
    [PAGE_TYPES.DOCS]: process.env.NOTION_DOCS_PAGE_ID
  };
}

/**
 * Normalize a Notion ID (remove hyphens for comparison)
 */
function normalizeId(id) {
  if (!id) return null;
  return id.replace(/-/g, '').toLowerCase();
}

/**
 * Check if a page is a child of a given parent
 * @param {Object} notion - Notion client
 * @param {string} pageId - The page to check
 * @param {string} targetParentId - The parent we're looking for
 * @param {number} maxDepth - Maximum traversal depth
 * @returns {Promise<boolean>}
 */
async function isChildOfPage(notion, pageId, targetParentId, maxDepth = 10) {
  if (!pageId || !targetParentId) return false;

  const normalizedTarget = normalizeId(targetParentId);
  let currentId = pageId;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    const normalizedCurrent = normalizeId(currentId);

    // Check if current page matches target
    if (normalizedCurrent === normalizedTarget) {
      return true;
    }

    try {
      const page = await notion.pages.retrieve({ page_id: currentId });

      // Check parent
      if (page.parent) {
        if (page.parent.type === 'page_id') {
          currentId = page.parent.page_id;
        } else if (page.parent.type === 'workspace') {
          // Reached workspace root
          return false;
        } else {
          // Database or other parent type
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      // Can't access parent, stop traversal
      return false;
    }

    depth++;
  }

  return false;
}

/**
 * Determine page type based on parent hierarchy
 * @param {Object} notion - Notion client
 * @param {string} pageId - The page to check
 * @param {Object} page - Optional pre-fetched page object
 * @returns {Promise<{type: string, parentId: string|null}>}
 */
async function determinePageType(notion, pageId, page = null) {
  const parents = getConfiguredParents();
  const result = {
    type: PAGE_TYPES.LANDING, // Default
    parentId: null,
    parentType: null
  };

  // Quick check: if the page itself is a configured parent
  const normalizedPageId = normalizeId(pageId);
  for (const [type, parentId] of Object.entries(parents)) {
    if (parentId && normalizeId(parentId) === normalizedPageId) {
      result.type = type;
      result.parentId = parentId;
      result.parentType = type;
      return result;
    }
  }

  // Check each configured parent
  for (const [type, parentId] of Object.entries(parents)) {
    if (!parentId) continue;

    const isChild = await isChildOfPage(notion, pageId, parentId);
    if (isChild) {
      result.type = type;
      result.parentId = parentId;
      result.parentType = type;
      return result;
    }
  }

  // Also check direct parent from page object for faster detection
  // Handle both page_id and database_id parent types
  if (page?.parent) {
    let directParentId = null;
    if (page.parent.type === 'page_id') {
      directParentId = page.parent.page_id;
    } else if (page.parent.type === 'database_id') {
      directParentId = page.parent.database_id;
    }

    if (directParentId) {
      for (const [type, parentId] of Object.entries(parents)) {
        if (parentId && normalizeId(parentId) === normalizeId(directParentId)) {
          result.type = type;
          result.parentId = parentId;
          result.parentType = type;
          return result;
        }
      }
    }
  }

  return result;
}

/**
 * Get page type configuration for frontend
 */
function getPageTypeConfig(type) {
  const configs = {
    [PAGE_TYPES.BLOG]: {
      layout: 'article',
      showDate: true,
      showAuthor: true,
      showShareButtons: true,
      showTableOfContents: false,
      showSidebar: false,
      showPrevNext: false,
      containerClass: 'container-content',
      contentClass: 'article-content'
    },
    [PAGE_TYPES.LANDING]: {
      layout: 'full-width',
      showDate: false,
      showAuthor: false,
      showShareButtons: false,
      showTableOfContents: false,
      showSidebar: false,
      showPrevNext: false,
      containerClass: 'container',
      contentClass: 'landing-content'
    },
    [PAGE_TYPES.DOCS]: {
      layout: 'sidebar',
      showDate: true,
      showAuthor: false,
      showShareButtons: false,
      showTableOfContents: true,
      showSidebar: true,
      showPrevNext: true,
      containerClass: 'container-docs',
      contentClass: 'docs-content'
    }
  };

  return configs[type] || configs[PAGE_TYPES.LANDING];
}

module.exports = {
  PAGE_TYPES,
  getConfiguredParents,
  normalizeId,
  isChildOfPage,
  determinePageType,
  getPageTypeConfig
};
