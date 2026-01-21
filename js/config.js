/**
 * Site Configuration
 * Centralized configuration for the Notion-as-CMS site.
 * Edit these values to customize your site.
 */

const SITE_CONFIG = {
  // Site Identity
  siteName: 'Notion CMS',
  siteTagline: 'Your content, powered by Notion',
  siteDescription: 'A serverless website powered by Notion as a content management system.',

  // Navigation
  navigation: [
    { label: 'Home', href: '/', id: 'home' },
    { label: 'Blog', href: '/blog', id: 'blog' },
    { label: 'Pages', href: '/pages', id: 'pages' },
  ],

  // Blog Settings
  blog: {
    title: 'Blog',
    subtitle: 'Thoughts, ideas, and insights.',
    postsPerPage: 12,
    showDates: true,
    showReadMore: true,
    dateLocale: 'en-US',
    dateFormat: { year: 'numeric', month: 'long', day: 'numeric' }
  },

  // Page Settings
  pages: {
    title: 'Pages',
    subtitle: 'Browse all available content.',
    showLastEdited: true
  },

  // CTA Section (set to null to hide)
  cta: null,

  // Footer
  footer: {
    copyright: '© {year} Notion CMS',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Blog', href: '/blog' }
    ]
  },

  // Error Messages
  messages: {
    loading: 'Loading...',
    loadingPosts: 'Loading posts...',
    loadingPage: 'Loading page...',
    errorGeneric: 'Something went wrong. Please try again.',
    errorNotFound: 'The page you\'re looking for doesn\'t exist.',
    errorNoPosts: 'No posts yet. Check back soon!',
    errorNoPages: 'No pages available.',
    backToHome: 'Back to Home',
    backToBlog: 'Back to Blog',
    readMore: 'Read more →',
    share: 'Share'
  },

  // Social Sharing (set to empty array to hide)
  shareButtons: [
    { platform: 'twitter', label: 'Twitter' },
    { platform: 'linkedin', label: 'LinkedIn' }
  ]
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.SITE_CONFIG = SITE_CONFIG;
}

// Export for Node.js (Netlify Functions)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SITE_CONFIG;
}
