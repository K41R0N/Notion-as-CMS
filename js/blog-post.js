/**
 * Blog post detail page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
  loadBlogPost();
});

async function loadBlogPost() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('post-content');

  try {
    const slug = getSlugFromUrl();

    if (!slug) {
      throw new Error('No slug found');
    }

    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    contentEl.style.display = 'none';

    // Fetch post
    const response = await fetch(`/.netlify/functions/blog-detail?slug=${encodeURIComponent(slug)}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Post not found');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const post = await response.json();

    // Hide loading and show content
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';

    renderBlogPost(post);

  } catch (error) {
    console.error('Error loading blog post:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

function renderBlogPost(post) {
  const siteName = window.SITE_CONFIG?.siteName || 'Notion CMS';

  // Update page title
  document.title = `${post.title} — ${siteName}`;

  // Update meta description
  const metaDesc = document.getElementById('page-description');
  if (metaDesc) {
    const desc = extractText(post.content).substring(0, 160) + '...';
    metaDesc.setAttribute('content', desc);
  }

  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumb-title');
  if (breadcrumb) {
    breadcrumb.textContent = post.title;
  }

  // Update title
  const title = document.getElementById('post-title');
  if (title) {
    title.textContent = post.title;
  }

  // Update date
  const dateEl = document.getElementById('post-date');
  if (dateEl) {
    const date = formatDate(post.publishedDate);
    dateEl.textContent = date;
  }

  // Update content
  const body = document.getElementById('post-body');
  if (body) {
    body.innerHTML = post.content;
  }

  // Setup share buttons
  setupShareButtons(post.title);

  // Add smooth scrolling
  addSmoothScrolling();
}

function setupShareButtons(title) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title);

  const twitter = document.getElementById('share-twitter');
  if (twitter) {
    twitter.href = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }

  const linkedin = document.getElementById('share-linkedin');
  if (linkedin) {
    linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }
}

function getSlugFromUrl() {
  const path = window.location.pathname;
  const segments = path.split('/').filter(s => s.length > 0);

  // Format: /blog/post-slug
  if (segments.length >= 2 && segments[0] === 'blog') {
    return segments[1];
  }

  return null;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const config = window.SITE_CONFIG?.blog || {};
  return new Date(dateString).toLocaleDateString(
    config.dateLocale || 'en-US',
    config.dateFormat || { year: 'numeric', month: 'long', day: 'numeric' }
  );
}

function extractText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function addSmoothScrolling() {
  const content = document.getElementById('post-body');
  if (!content) return;

  const anchors = content.querySelectorAll('a[href^="#"]');
  anchors.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const id = this.getAttribute('href').substring(1);
      const target = document.getElementById(id);
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });
}

window.addEventListener('popstate', function() {
  loadBlogPost();
});
