// Blog post page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadBlogPost();
});

async function loadBlogPost() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const contentEl = document.getElementById('blog-post-content');

    try {
        // Get slug from URL
        const slug = getSlugFromUrl();
        
        if (!slug) {
            throw new Error('No blog post slug found in URL');
        }

        // Show loading state
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        contentEl.style.display = 'none';

        // Fetch blog post from Netlify function
        const response = await fetch(`/.netlify/functions/blog-detail?slug=${encodeURIComponent(slug)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Blog post not found');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const post = await response.json();
        
        // Hide loading and show content
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
        
        // Render blog post
        renderBlogPost(post);

    } catch (error) {
        console.error('Error loading blog post:', error);
        
        // Hide loading and show error
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        
        // Update error message if post not found
        if (error.message === 'Blog post not found') {
            const errorTitle = errorEl.querySelector('h3');
            const errorText = errorEl.querySelector('p');
            if (errorTitle) errorTitle.textContent = 'Blog post not found';
            if (errorText) errorText.textContent = 'The blog post you\'re looking for doesn\'t exist or has been moved.';
        }
    }
}

function renderBlogPost(post) {
    // Update page title and meta
    document.title = `${post.title} - ABI Agency Blog`;
    
    const metaDescription = document.getElementById('page-description');
    if (metaDescription) {
        const description = extractTextFromHtml(post.content).substring(0, 160) + '...';
        metaDescription.setAttribute('content', description);
    }

    // Update breadcrumb
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) {
        breadcrumbTitle.textContent = post.title;
    }

    // Update post title
    const postTitle = document.getElementById('post-title');
    if (postTitle) {
        postTitle.textContent = post.title;
    }

    // Update post date
    const postDate = document.getElementById('post-date');
    if (postDate) {
        const publishedDate = new Date(post.publishedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        postDate.textContent = `Published on ${publishedDate}`;
    }

    // Update post content
    const postContent = document.getElementById('post-content');
    if (postContent) {
        postContent.innerHTML = post.content;
    }

    // Setup share buttons
    setupShareButtons(post);

    // Add smooth scrolling for any internal links
    addSmoothScrolling();
}

function setupShareButtons(post) {
    const currentUrl = window.location.href;
    const title = encodeURIComponent(post.title);
    const url = encodeURIComponent(currentUrl);

    // Twitter share
    const twitterBtn = document.getElementById('share-twitter');
    if (twitterBtn) {
        twitterBtn.href = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
    }

    // LinkedIn share
    const linkedinBtn = document.getElementById('share-linkedin');
    if (linkedinBtn) {
        linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    }
}

function getSlugFromUrl() {
    const path = window.location.pathname;
    const segments = path.split('/').filter(segment => segment.length > 0);
    
    // Expected URL format: /blog/post-slug
    if (segments.length >= 2 && segments[0] === 'blog') {
        return segments[1];
    }
    
    return null;
}

function extractTextFromHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}

function addSmoothScrolling() {
    // Add smooth scrolling to any anchor links within the post content
    const postContent = document.getElementById('post-content');
    if (postContent) {
        const anchorLinks = postContent.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 100; // Account for fixed navbar
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function() {
    loadBlogPost();
});

