# Component Styling Guide

Complete guide to styling components for your Notion-powered website, including CSS architecture, creating new components, and responsive design patterns.

## Table of Contents

1. [CSS Architecture Overview](#css-architecture-overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Layout Patterns](#layout-patterns)
5. [Creating New Components](#creating-new-components)
6. [Blog Component Styling](#blog-component-styling)
7. [Responsive Design](#responsive-design)
8. [Animation and Transitions](#animation-and-transitions)
9. [Best Practices](#best-practices)

---

## CSS Architecture Overview

### File Structure

```
css/
├── styles.css     # Landing page & global styles (835 lines)
└── blog.css       # Blog-specific styles (436 lines)
```

### Organization Pattern

Both CSS files follow this structure:

```css
/* 1. Font Imports */
@font-face { ... }

/* 2. CSS Variables */
:root { ... }

/* 3. Global Resets */
* { box-sizing: border-box; }

/* 4. Base Styles */
body { ... }

/* 5. Component Styles */
.component { ... }

/* 6. Responsive Overrides */
@media (max-width: 768px) { ... }
```

### Design Philosophy

- **Mobile-First:** Start with mobile, enhance for desktop
- **Component-Based:** Each section is self-contained
- **Utility-Driven:** Reusable spacing, colors, typography
- **Performance-Focused:** Minimal CSS, optimized selectors

---

## Color System

### Primary Colors

```css
:root {
  /* Brand Colors */
  --color-black: #000000;
  --color-white: #FFFFFF;
  --color-yellow: #FCCB00;

  /* Text Colors */
  --color-text-primary: #333333;
  --color-text-secondary: #4a5568;
  --color-text-tertiary: #6b7280;

  /* Background Colors */
  --color-bg-light: #f8fafc;
  --color-bg-lighter: #e2e8f0;

  /* Border Colors */
  --color-border: #e2e8f0;
  --color-border-dark: #cbd5e0;
}
```

### Usage Examples

```css
/* Black background sections */
.section-dark {
  background: var(--color-black);
  color: var(--color-white);
}

/* Light background sections */
.section-light {
  background: var(--color-bg-light);
  color: var(--color-text-primary);
}

/* Accent elements */
.btn-primary {
  background: var(--color-yellow);
  color: var(--color-black);
}

.btn-primary:hover {
  background: #e3b800;  /* Darker yellow */
}
```

### Color Usage Guidelines

| Context | Primary | Secondary | Accent |
|---------|---------|-----------|--------|
| **Hero** | Black BG | White text | Yellow CTA |
| **Content** | White BG | Black text | Yellow links |
| **Dark Sections** | Black BG | White text | Yellow borders |
| **Forms** | White BG | Gray borders | Yellow focus |

### Gradient Patterns

```css
/* Light gradient (headers) */
background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);

/* Dark gradient (footers) */
background: linear-gradient(135deg, #000 0%, #2d3748 100%);

/* Accent gradient (CTAs) */
background: linear-gradient(135deg, #FCCB00 0%, #ffdd57 100%);
```

---

## Typography

### Font Stack

**Primary Font:** Yellix (custom, loaded from `/fonts/`)
**Secondary Font:** Space Grotesk (Google Fonts)
**Fallback:** System fonts

```css
@font-face {
  font-family: 'Yellix';
  src: url('../fonts/Yellix-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

body {
  font-family: 'Yellix', 'Space Grotesk', -apple-system, BlinkMacSystemFont,
               'Segoe UI', sans-serif;
}
```

### Type Scale

```css
/* Headings */
h1 { font-size: clamp(2.5rem, 5vw, 3.5rem); }  /* 40-56px */
h2 { font-size: clamp(2rem, 4vw, 3rem); }      /* 32-48px */
h3 { font-size: clamp(1.5rem, 3vw, 2rem); }    /* 24-32px */
h4 { font-size: clamp(1.25rem, 2vw, 1.5rem); } /* 20-24px */

/* Body Text */
body { font-size: clamp(1rem, 1.5vw, 1.125rem); } /* 16-18px */

/* Small Text */
.text-sm { font-size: 0.875rem; }  /* 14px */
.text-xs { font-size: 0.75rem; }   /* 12px */
```

### Font Weights

```css
.font-normal   { font-weight: 400; }  /* Regular */
.font-medium   { font-weight: 500; }  /* Medium */
.font-semibold { font-weight: 600; }  /* SemiBold */
.font-bold     { font-weight: 700; }  /* Bold */
.font-extrabold{ font-weight: 800; }  /* ExtraBold */
.font-black    { font-weight: 900; }  /* Black */
```

### Line Heights

```css
:root {
  --line-height-tight: 1.2;    /* Headings */
  --line-height-normal: 1.5;   /* UI elements */
  --line-height-relaxed: 1.6;  /* Body text */
  --line-height-loose: 1.8;    /* Blog content */
}
```

### Typography Utilities

```css
/* Responsive headings */
.heading-xl {
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.heading-lg {
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 700;
  line-height: 1.3;
}

.heading-md {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  line-height: 1.4;
}

/* Text styles */
.text-gradient {
  background: linear-gradient(135deg, #000 0%, #FCCB00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Layout Patterns

### Container System

```css
/* Max-width container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Narrow container (blog posts) */
.container-narrow {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Wide container */
.container-wide {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Full-width container */
.container-fluid {
  width: 100%;
  padding: 0 2rem;
}
```

### Grid Systems

```css
/* Two-column grid */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

/* Three-column grid */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

/* Auto-fit responsive grid */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

/* Blog post grid (used in blog.html) */
.blog-posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}
```

### Flexbox Patterns

```css
/* Centered content */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Space between */
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Column layout */
.flex-col {
  display: flex;
  flex-direction: column;
}

/* Responsive flex */
.flex-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
```

### Spacing System

```css
:root {
  --spacing-xs: 0.25rem;  /* 4px */
  --spacing-sm: 0.5rem;   /* 8px */
  --spacing-md: 1rem;     /* 16px */
  --spacing-lg: 1.5rem;   /* 24px */
  --spacing-xl: 2rem;     /* 32px */
  --spacing-2xl: 3rem;    /* 48px */
  --spacing-3xl: 4rem;    /* 64px */
  --spacing-4xl: 5rem;    /* 80px */
}

/* Section padding */
.section {
  padding: var(--spacing-4xl) 0;
}

@media (max-width: 768px) {
  .section {
    padding: var(--spacing-2xl) 0;
  }
}
```

---

## Creating New Components

### Step-by-Step Guide

#### 1. Define Component Structure

```html
<!-- Example: Feature Card -->
<div class="feature-card">
  <div class="feature-card__icon">
    <img src="icon.svg" alt="Feature icon">
  </div>
  <h3 class="feature-card__title">Feature Title</h3>
  <p class="feature-card__description">Feature description text.</p>
  <a href="#" class="feature-card__link">Learn more →</a>
</div>
```

#### 2. Write Base Styles

```css
/* Base component */
.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* Child elements */
.feature-card__icon {
  width: 60px;
  height: 60px;
  margin-bottom: 1rem;
}

.feature-card__icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.feature-card__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #000;
}

.feature-card__description {
  color: #4a5568;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.feature-card__link {
  color: #FCCB00;
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
```

#### 3. Add Hover States

```css
.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.feature-card__link:hover {
  text-decoration: underline;
}
```

#### 4. Make it Responsive

```css
@media (max-width: 768px) {
  .feature-card {
    padding: 1.5rem;
  }

  .feature-card__title {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .feature-card {
    padding: 1rem;
  }

  .feature-card__icon {
    width: 48px;
    height: 48px;
  }
}
```

#### 5. Add Variants

```css
/* Dark variant */
.feature-card--dark {
  background: #000;
  color: #fff;
}

.feature-card--dark .feature-card__title {
  color: #fff;
}

.feature-card--dark .feature-card__description {
  color: #cbd5e0;
}

/* Bordered variant */
.feature-card--bordered {
  border: 2px solid #e2e8f0;
  box-shadow: none;
}

.feature-card--bordered:hover {
  border-color: #FCCB00;
}
```

### Component Naming Convention

Use **BEM (Block Element Modifier)** methodology:

```css
/* Block */
.component { }

/* Element */
.component__element { }

/* Modifier */
.component--modifier { }
.component__element--modifier { }
```

**Examples:**
```css
.blog-post-card { }
.blog-post-card__image { }
.blog-post-card__title { }
.blog-post-card--featured { }
```

---

## Blog Component Styling

### Blog Post Card

**Location:** `css/blog.css:38-100`

```css
.blog-post-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: block;
}

.blog-post-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.blog-post-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.blog-post-content {
  padding: 1.5rem;
}

.blog-post-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #000;
  line-height: 1.4;
}

.blog-post-description {
  color: #4a5568;
  line-height: 1.6;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blog-post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
}
```

### Blog Post Content

**Location:** `css/blog.css:180-350`

```css
.post-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-size: 1.125rem;
  line-height: 1.8;
  color: #2d3748;
}

/* Headings */
.post-content h1 {
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 2.5rem 0 1.5rem;
  color: #000;
  line-height: 1.2;
}

.post-content h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  margin: 2rem 0 1rem;
  color: #000;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #FCCB00;
}

.post-content h3 {
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  font-weight: 600;
  margin: 1.5rem 0 1rem;
  color: #2d3748;
}

/* Paragraphs */
.post-content p {
  margin-bottom: 1.5rem;
  line-height: 1.8;
}

/* Lists */
.post-content ul,
.post-content ol {
  margin: 1.5rem 0;
  padding-left: 2rem;
}

.post-content li {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

/* Images */
.post-content .blog-image {
  margin: 2rem 0;
  text-align: center;
}

.post-content .blog-image img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.post-content .blog-image figcaption {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: #6b7280;
  font-style: italic;
}

/* Blockquotes */
.post-content blockquote {
  margin: 2rem 0;
  padding: 1.5rem 1.5rem 1.5rem 2rem;
  border-left: 4px solid #FCCB00;
  background: #f8fafc;
  border-radius: 4px;
  font-size: 1.1rem;
  font-style: italic;
  color: #2d3748;
}

/* Code Blocks */
.post-content pre {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: #1e293b;
  border-radius: 8px;
  overflow-x: auto;
}

.post-content code {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 0.9rem;
  color: #e2e8f0;
}

/* Inline code */
.post-content p code,
.post-content li code {
  background: #f1f5f9;
  color: #dc2626;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.875em;
}

/* Dividers */
.post-content hr {
  margin: 3rem 0;
  border: none;
  border-top: 2px solid #e2e8f0;
}
```

---

## Responsive Design

### Breakpoint System

```css
/* Mobile First Approach */

/* Base styles (mobile) */
.component {
  padding: 1rem;
  font-size: 1rem;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .component {
    padding: 1.5rem;
    font-size: 1.125rem;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .component {
    padding: 2rem;
    font-size: 1.25rem;
  }
}

/* Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .component {
    padding: 2.5rem;
  }
}
```

### Common Responsive Patterns

#### 1. Stacking Columns

```css
.two-column-layout {
  display: flex;
  gap: 2rem;
}

@media (max-width: 768px) {
  .two-column-layout {
    flex-direction: column;
  }
}
```

#### 2. Responsive Grid

```css
.grid-responsive {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

@media (max-width: 1024px) {
  .grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .grid-responsive {
    grid-template-columns: 1fr;
  }
}
```

#### 3. Responsive Typography

```css
/* Use clamp() for fluid typography */
h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
}

/* Or use media queries */
h1 {
  font-size: 2rem;
}

@media (min-width: 768px) {
  h1 {
    font-size: 2.5rem;
  }
}

@media (min-width: 1024px) {
  h1 {
    font-size: 3.5rem;
  }
}
```

#### 4. Hide/Show Elements

```css
/* Hide on mobile */
.desktop-only {
  display: none;
}

@media (min-width: 768px) {
  .desktop-only {
    display: block;
  }
}

/* Hide on desktop */
.mobile-only {
  display: block;
}

@media (min-width: 768px) {
  .mobile-only {
    display: none;
  }
}
```

---

## Animation and Transitions

### Fade-In on Scroll

**Location:** `js/script.js`

```javascript
// Intersection Observer for fade-in animations
const observeElements = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-visible');
      }
    });
  }, {
    threshold: 0.1
  });

  document.querySelectorAll('.fade-in-on-scroll').forEach(el => {
    observer.observe(el);
  });
};
```

```css
/* CSS for fade-in animation */
.fade-in-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.fade-in-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Hover Effects

```css
/* Scale on hover */
.scale-hover {
  transition: transform 0.3s ease;
}

.scale-hover:hover {
  transform: scale(1.05);
}

/* Lift on hover */
.lift-hover {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.lift-hover:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

/* Glow on hover */
.glow-hover {
  transition: box-shadow 0.3s ease;
}

.glow-hover:hover {
  box-shadow: 0 0 20px rgba(252, 203, 0, 0.5);
}
```

### Loading Spinner

**Location:** `css/blog.css:102-127`

```css
.loading-spinner {
  border: 4px solid #e2e8f0;
  border-top-color: #FCCB00;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Smooth Transitions

```css
/* Global smooth transitions */
* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}

/* Disable transitions on page load */
.preload * {
  transition: none !important;
}
```

```javascript
// Remove preload class after page loads
window.addEventListener('load', () => {
  document.body.classList.remove('preload');
});
```

---

## Best Practices

### 1. Performance

```css
/* Use CSS containment for better performance */
.blog-post-card {
  contain: layout style paint;
}

/* Use will-change for animated elements */
.hover-element {
  will-change: transform;
}

/* Remove will-change after animation */
.hover-element:hover {
  will-change: auto;
}
```

### 2. Accessibility

```css
/* Focus states for keyboard navigation */
a:focus,
button:focus {
  outline: 2px solid #FCCB00;
  outline-offset: 2px;
}

/* Skip focus for mouse users */
a:focus:not(:focus-visible),
button:focus:not(:focus-visible) {
  outline: none;
}

/* Ensure sufficient color contrast */
.text-on-dark {
  color: #fff; /* WCAG AA compliant on black */
}
```

### 3. Maintainability

```css
/* Use CSS custom properties for theming */
:root {
  --primary-color: #FCCB00;
  --text-color: #333;
}

.component {
  color: var(--text-color);
  border-color: var(--primary-color);
}

/* Group related styles */
/* Header
   ========================================================================== */
.header { }
.header__logo { }
.header__nav { }

/* Blog
   ========================================================================== */
.blog-post { }
.blog-post__title { }
```

### 4. Browser Compatibility

```css
/* Provide fallbacks */
.gradient-bg {
  background: #FCCB00; /* Fallback */
  background: linear-gradient(135deg, #FCCB00 0%, #ffdd57 100%);
}

/* Use autoprefixer or manual prefixes */
.flex-container {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}
```

---

## Next Steps

Now that you understand component styling:

1. **Build programmatic pages** → [Programmatic Pages Guide](./04-PROGRAMMATIC-PAGES.md)
2. **Integrate Sveltia CMS** → [Sveltia Integration](./05-SVELTIA-CMS-INTEGRATION.md)
3. **Use agent prompts** → [Agent Prompts](./06-AGENT-PROMPTS.md)

---

## Quick Reference

**File Locations:**
- Landing styles: `css/styles.css`
- Blog styles: `css/blog.css`

**Color Variables:**
```css
--color-black: #000000
--color-white: #FFFFFF
--color-yellow: #FCCB00
```

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Naming Convention:** BEM (Block__Element--Modifier)
