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
 * Default: 'unknown' when page doesn't belong to any configured parent
 * (Unknown pages are excluded from type-filtered listings)
 */

const PAGE_TYPES = {
  BLOG: 'blog',
  LANDING: 'landing',
  DOCS: 'docs',
  UNKNOWN: 'unknown'  // For pages not under any configured parent
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
 * Build a page type resolver using already-fetched page data
 * This avoids making additional API calls
 * @param {Array} allPages - All pages from notion.search()
 * @returns {Object} Resolver with methods to determine page types
 */
function createPageTypeResolver(allPages) {
  const parents = getConfiguredParents();
  const normalizedParents = {};

  // Normalize configured parent IDs
  for (const [type, parentId] of Object.entries(parents)) {
    if (parentId) {
      normalizedParents[normalizeId(parentId)] = type;
    }
  }

  // Build a map of page ID -> parent ID from the fetched data
  const parentMap = new Map();
  const pageSet = new Set();

  for (const page of allPages) {
    const pageId = normalizeId(page.id);
    pageSet.add(pageId);

    if (page.parent) {
      if (page.parent.type === 'page_id') {
        parentMap.set(pageId, normalizeId(page.parent.page_id));
      } else if (page.parent.type === 'database_id') {
        parentMap.set(pageId, normalizeId(page.parent.database_id));
      }
    }
  }

  /**
   * Determine page type by walking up parent chain using cached data
   * No API calls needed - uses only the data we already have
   */
  function getPageType(pageId) {
    const normalizedPageId = normalizeId(pageId);

    // Check if this page IS a configured parent
    if (normalizedParents[normalizedPageId]) {
      return {
        type: normalizedParents[normalizedPageId],
        parentId: pageId,
        parentType: normalizedParents[normalizedPageId]
      };
    }

    // Walk up the parent chain using our cached data
    let currentId = normalizedPageId;
    let depth = 0;
    const maxDepth = 10;

    while (currentId && depth < maxDepth) {
      // Check if current parent is a configured type
      if (normalizedParents[currentId]) {
        return {
          type: normalizedParents[currentId],
          parentId: currentId,
          parentType: normalizedParents[currentId]
        };
      }

      // Move to parent
      const parentId = parentMap.get(currentId);
      if (!parentId) {
        // No parent in our data - we've reached the limit of what we know
        break;
      }

      // Check if parent is a configured type
      if (normalizedParents[parentId]) {
        return {
          type: normalizedParents[parentId],
          parentId: parentId,
          parentType: normalizedParents[parentId]
        };
      }

      currentId = parentId;
      depth++;
    }

    // Default to unknown - page doesn't belong to any configured parent
    return {
      type: PAGE_TYPES.UNKNOWN,
      parentId: null,
      parentType: null
    };
  }

  return { getPageType, parentMap, normalizedParents };
}

/**
 * Determine page type based on parent hierarchy (legacy single-page method)
 * Uses page object data when available to avoid API calls
 * @param {Object} notion - Notion client (unused in optimized version)
 * @param {string} pageId - The page to check
 * @param {Object} page - Pre-fetched page object
 * @param {Object} resolver - Optional resolver from createPageTypeResolver
 * @returns {Promise<{type: string, parentId: string|null}>}
 */
async function determinePageType(notion, pageId, page = null, resolver = null) {
  const parents = getConfiguredParents();
  const result = {
    type: PAGE_TYPES.UNKNOWN, // Default for unmatched pages
    parentId: null,
    parentType: null
  };

  // If we have a resolver, use it (no API calls)
  if (resolver) {
    return resolver.getPageType(pageId);
  }

  const normalizedPageId = normalizeId(pageId);

  // Quick check: if the page itself is a configured parent
  for (const [type, parentId] of Object.entries(parents)) {
    if (parentId && normalizeId(parentId) === normalizedPageId) {
      result.type = type;
      result.parentId = parentId;
      result.parentType = type;
      return result;
    }
  }

  // Check direct parent from page object (no API call needed)
  if (page?.parent) {
    let directParentId = null;
    if (page.parent.type === 'page_id') {
      directParentId = page.parent.page_id;
    } else if (page.parent.type === 'database_id') {
      directParentId = page.parent.database_id;
    }

    if (directParentId) {
      const normalizedParent = normalizeId(directParentId);
      for (const [type, parentId] of Object.entries(parents)) {
        if (parentId && normalizeId(parentId) === normalizedParent) {
          result.type = type;
          result.parentId = parentId;
          result.parentType = type;
          return result;
        }
      }
    }
  }

  // Return default - don't make API calls that might fail
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
    },
    [PAGE_TYPES.UNKNOWN]: {
      layout: 'full-width',
      showDate: false,
      showAuthor: false,
      showShareButtons: false,
      showTableOfContents: false,
      showSidebar: false,
      showPrevNext: false,
      containerClass: 'container',
      contentClass: 'page-content'
    }
  };

  return configs[type] || configs[PAGE_TYPES.UNKNOWN];
}

module.exports = {
  PAGE_TYPES,
  getConfiguredParents,
  normalizeId,
  createPageTypeResolver,
  determinePageType,
  getPageTypeConfig
};
