// Blog index page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadBlogPosts();
});

async function loadBlogPosts() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const postsEl = document.getElementById('blog-posts');
    const noPostsEl = document.getElementById('no-posts');

    try {
        // Show loading state
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        postsEl.style.display = 'none';
        noPostsEl.style.display = 'none';

        // Fetch blog posts from Netlify function
        const response = await fetch('/.netlify/functions/blog-list');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Hide loading
        loadingEl.style.display = 'none';

        if (data.posts && data.posts.length > 0) {
            // Show posts
            postsEl.style.display = 'grid';
            renderBlogPosts(data.posts);
        } else {
            // Show no posts message
            noPostsEl.style.display = 'block';
        }

    } catch (error) {
        console.error('Error loading blog posts:', error);
        
        // Hide loading and show error
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

function renderBlogPosts(posts) {
    const postsContainer = document.getElementById('blog-posts');
    
    postsContainer.innerHTML = posts.map(post => {
        const publishedDate = new Date(post.publishedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <article class="blog-post-card">
                <a href="/blog/${post.slug}" style="text-decoration: none; color: inherit;">
                    ${post.heroImage ? 
                        `<img src="${post.heroImage}" alt="${post.title}" class="blog-post-image" loading="lazy">` :
                        `<div class="blog-post-image" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); color: #6b7280; font-size: 0.875rem;">No image</div>`
                    }
                    <div class="blog-post-content">
                        <h2 class="blog-post-title">${escapeHtml(post.title)}</h2>
                        <p class="blog-post-description">${escapeHtml(post.description || 'Click to read more...')}</p>
                        <div class="blog-post-meta">
                            <span class="blog-post-date">${publishedDate}</span>
                            <span class="blog-post-read-more">Read more →</span>
                        </div>
                    </div>
                </a>
            </article>
        `;
    }).join('');
}

// Helper function to escape HTML
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

