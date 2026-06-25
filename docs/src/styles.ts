import { CreateStyle } from 'elit';

// Create styles using CreateStyle
export const styles = new CreateStyle();

// CSS Variables - Dark Theme (default)
export const primary = styles.addVar('primary', '#6366f1');
export const primaryDark = styles.addVar('primary-dark', '#4f46e5');
export const bg = styles.addVar('bg', '#0f0f0f');
export const bgCard = styles.addVar('bg-card', '#1a1a1a');
export const bgCode = styles.addVar('bg-code', '#262626');
export const textColor = styles.addVar('text', '#fafafa');
export const textMuted = styles.addVar('text-muted', '#a1a1aa');
export const border = styles.addVar('border', '#27272a');

// Light Theme Variables
styles.add({
  '[data-theme="light"]': {
    '--primary': '#6366f1',
    '--primary-dark': '#4f46e5',
    '--bg': '#ffffff',
    '--bg-card': '#f9fafb',
    '--bg-code': '#f3f4f6',
    '--text': '#0f0f0f',
    '--text-muted': '#52525b',
    '--border': '#e5e7eb'
  }
});

// Base styles
styles.addTag('*', { margin: 0, padding: 0, boxSizing: 'border-box' });
styles.addTag('html', { scrollBehavior: 'smooth' });
styles.addTag('body', {
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  background: styles.var(bg),
  color: styles.var(textColor),
  lineHeight: 1.6,
  transition: 'background-color 0.3s ease, color 0.3s ease'
});

styles.addTag('a', {
  color: styles.var(primary),
  textDecoration: 'none',
  transition: 'color 0.2s'
});
styles.addPseudoClass('hover', { color: styles.var(primaryDark) }, 'a');

styles.addTag('code', {
  fontFamily: "'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
  background: styles.var(bgCode),
  padding: '0.2em 0.4em',
  borderRadius: '4px',
  fontSize: '0.9em'
});

styles.addTag('pre', {
  background: styles.var(bgCode),
  padding: '1rem',
  borderRadius: '8px',
  overflowX: 'auto',
  margin: '1rem 0'
});
styles.descendant('pre', 'code', { background: 'none', padding: 0 });

styles.addClass('container', { maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' });

// Header
styles.addClass('header', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  background: 'rgba(15, 15, 15, 0.8)',
  backdropFilter: 'blur(10px)',
  borderBottom: `1px solid ${styles.var(border)}`,
  zIndex: 100,
  transition: 'background-color 0.3s ease, border-color 0.3s ease'
});

// Light theme header
styles.add({
  '[data-theme="light"] .header': {
    background: 'rgba(255, 255, 255, 0.8)'
  }
});

styles.addClass('header-inner', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '64px'
});

styles.addClass('logo', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: styles.var(textColor)
});

styles.addClass('logo-icon', {
  width: '32px',
  height: '32px',
  display: 'block'
});

styles.addClass('nav', { display: 'flex', gap: '2rem', alignItems: 'center' });
styles.descendant('.nav', 'a', { color: styles.var(textMuted), fontWeight: 500, transition: 'color 0.2s' });
styles.addPseudoClass('hover', { color: styles.var(textColor) }, '.nav a');
styles.add({ '.nav a.active': { color: styles.var(primary), fontWeight: 600 } });

// Language button
styles.addClass('btn-lang', {
  background: styles.var(bgCode),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '6px',
  padding: '0.4rem 0.75rem',
  color: styles.var(textMuted),
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.875rem',
  transition: 'all 0.2s'
});
styles.addPseudoClass('hover', { color: styles.var(textColor), borderColor: styles.var(primary) }, '.btn-lang');

// Theme toggle button
styles.addClass('btn-theme', {
  background: styles.var(bgCode),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '6px',
  padding: '0.4rem 0.6rem',
  color: styles.var(textMuted),
  cursor: 'pointer',
  fontSize: '1.25rem',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px'
});
styles.addPseudoClass('hover', {
  color: styles.var(textColor),
  borderColor: styles.var(primary),
  transform: 'rotate(180deg)'
}, '.btn-theme');

// Hero
styles.addClass('hero', { padding: '8rem 0 4rem', textAlign: 'center' });
styles.descendant('.hero', 'h1', {
  fontSize: '3.5rem',
  fontWeight: 800,
  marginBottom: '1rem',
  background: `linear-gradient(135deg, ${styles.var(textColor)} 0%, ${styles.var(primary)} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
});

styles.addClass('hero-subtitle', {
  fontSize: '1.25rem',
  color: styles.var(textMuted),
  maxWidth: '600px',
  margin: '0 auto 2rem'
});

styles.addClass('hero-buttons', { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' });

styles.addClass('btn', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  borderRadius: '8px',
  fontWeight: 600,
  transition: 'all 0.2s',
  cursor: 'pointer',
  border: 'none',
  fontSize: '1rem'
});

styles.addClass('btn-primary', { background: styles.var(primary), color: 'white' });
styles.addPseudoClass('hover', { background: styles.var(primaryDark), color: 'white' }, '.btn-primary');

styles.addClass('btn-secondary', {
  background: styles.var(bgCard),
  color: styles.var(textColor),
  border: `1px solid ${styles.var(border)}`
});
styles.addPseudoClass('hover', { background: styles.var(bgCode), color: styles.var(textColor) }, '.btn-secondary');

// Features
styles.addClass('features', { padding: '4rem 0' });
styles.addClass('section-title', { fontSize: '2rem', fontWeight: 700, textAlign: 'center', marginBottom: '3rem' });
styles.addClass('features-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1.5rem'
});

styles.addClass('feature-card', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.5rem',
  transition: 'border-color 0.2s, background-color 0.3s ease'
});
styles.addPseudoClass('hover', { borderColor: styles.var(primary) }, '.feature-card');

styles.addClass('feature-icon', {
  width: '48px',
  height: '48px',
  background: styles.var(primary),
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
  marginBottom: '1rem'
});

styles.descendant('.feature-card', 'h3', { fontSize: '1.25rem', marginBottom: '0.5rem' });
styles.descendant('.feature-card', 'p', { color: styles.var(textMuted), fontSize: '0.95rem' });

// Example section
styles.addClass('example-section', { padding: '4rem 0' });
styles.addClass('example-container', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '2rem',
  alignItems: 'start'
});

styles.addClass('example-code', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  overflow: 'hidden'
});

styles.addClass('example-code-header', {
  background: styles.var(bgCode),
  padding: '0.75rem 1rem',
  borderBottom: `1px solid ${styles.var(border)}`,
  fontSize: '0.875rem',
  color: styles.var(textMuted)
});

styles.descendant('.example-code', 'pre', { margin: 0, borderRadius: 0 });

styles.addClass('example-preview', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.5rem'
});

styles.addClass('example-preview-header', {
  fontSize: '0.875rem',
  color: styles.var(textMuted),
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: `1px solid ${styles.var(border)}`
});

// Docs
styles.addClass('docs-section', { padding: '4rem 0' });
styles.addClass('docs-grid', { display: 'grid', gridTemplateColumns: '250px 1fr', gap: '3rem' });

styles.addClass('docs-sidebar', { position: 'sticky', top: '80px', height: 'fit-content' });
styles.addClass('docs-nav', { display: 'flex', flexDirection: 'column', gap: '0.25rem' });
styles.descendant('.docs-nav', 'a', {
  padding: '0.5rem 1rem',
  color: styles.var(textMuted),
  borderRadius: '6px',
  transition: 'all 0.2s'
});
styles.addPseudoClass('hover', { background: styles.var(bgCard), color: styles.var(textColor) }, '.docs-nav a');

styles.addClass('docs-content', { minWidth: 0 });
styles.descendant('.docs-content', 'h2', {
  fontSize: '1.75rem',
  marginTop: '3rem',
  marginBottom: '1rem',
  paddingTop: '1rem',
  borderTop: `1px solid ${styles.var(border)}`
});
styles.add({ '.docs-content h2:first-child': { marginTop: 0, paddingTop: 0, borderTop: 'none' } });
styles.descendant('.docs-content', 'h3', { fontSize: '1.25rem', marginTop: '2rem', marginBottom: '0.75rem' });
styles.descendant('.docs-content', 'h4', { fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: styles.var(textMuted) });
styles.descendant('.docs-content', 'p', { color: styles.var(textMuted), marginBottom: '1rem' });
styles.descendant('.docs-content', 'ul', { color: styles.var(textMuted), marginBottom: '1rem', paddingLeft: '1.5rem' });
styles.descendant('.docs-content', 'li', { marginBottom: '0.5rem' });

// Footer
styles.addClass('footer', {
  padding: '3rem 0',
  borderTop: `1px solid ${styles.var(border)}`,
  textAlign: 'center',
  color: styles.var(textMuted)
});
styles.descendant('.footer', 'a', { color: styles.var(textMuted) });
styles.addPseudoClass('hover', { color: styles.var(textColor) }, '.footer a');

// Demo styles
styles.addClass('demo-counter', { display: 'flex', alignItems: 'center', gap: '1rem' });
styles.descendant('.demo-counter', 'button', {
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  border: `1px solid ${styles.var(border)}`,
  background: styles.var(bgCode),
  color: styles.var(textColor),
  fontSize: '1.25rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
});
styles.addPseudoClass('hover', { background: styles.var(primary), borderColor: styles.var(primary) }, '.demo-counter button');
styles.descendant('.demo-counter', 'span', { fontSize: '1.5rem', fontWeight: 600, minWidth: '60px', textAlign: 'center' });

styles.addClass('demo-todo', { display: 'flex', flexDirection: 'column', gap: '0.75rem' });
styles.addClass('demo-todo-input', { display: 'flex', gap: '0.5rem' });
styles.descendant('.demo-todo-input', 'input', {
  flex: 1,
  padding: '0.5rem 0.75rem',
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '6px',
  background: styles.var(bgCode),
  color: styles.var(textColor),
  fontSize: '0.95rem'
});
styles.addPseudoClass('focus', { outline: 'none', borderColor: styles.var(primary) }, '.demo-todo-input input');
styles.descendant('.demo-todo-input', 'button', {
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '6px',
  background: styles.var(primary),
  color: 'white',
  cursor: 'pointer',
  fontWeight: 500
});

styles.addClass('demo-todo-list', { display: 'flex', flexDirection: 'column', gap: '0.5rem' });
styles.addClass('demo-todo-item', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: styles.var(bgCode),
  borderRadius: '6px'
});
styles.descendant('.demo-todo-item.done', 'span', { textDecoration: 'line-through', color: styles.var(textMuted) });
styles.descendant('.demo-todo-item', 'input[type="checkbox"]', { width: '18px', height: '18px', cursor: 'pointer' });
styles.descendant('.demo-todo-item', 'span', { flex: 1 });
styles.descendant('.demo-todo-item', 'button', {
  background: 'none',
  border: 'none',
  color: styles.var(textMuted),
  cursor: 'pointer',
  padding: '0.25rem'
});
styles.addPseudoClass('hover', { color: '#ef4444' }, '.demo-todo-item button');

// Install box
styles.addClass('install-box', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '8px',
  padding: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  maxWidth: '400px',
  margin: '2rem auto'
});
styles.descendant('.install-box', 'code', { background: 'none', fontSize: '1rem' });
styles.descendant('.install-box', 'button', {
  background: styles.var(bgCode),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  color: styles.var(textMuted),
  cursor: 'pointer',
  transition: 'all 0.2s'
});
styles.addPseudoClass('hover', { color: styles.var(textColor), borderColor: styles.var(primary) }, '.install-box button');

// API Reference styles
styles.addClass('api-section', { padding: '4rem 0' });
styles.addClass('api-category', {
  marginBottom: '3rem',
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.5rem'
});
styles.descendant('.api-category', 'h3', {
  fontSize: '1.5rem',
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: `1px solid ${styles.var(border)}`
});
styles.addClass('api-item', {
  marginBottom: '1.5rem',
  paddingBottom: '1.5rem',
  borderBottom: `1px solid ${styles.var(border)}`
});
styles.add({ '.api-item:last-child': { marginBottom: 0, paddingBottom: 0, borderBottom: 'none' } });
styles.addClass('api-signature', {
  fontFamily: "'SF Mono', Consolas, monospace",
  background: styles.var(bgCode),
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  fontSize: '0.9rem',
  marginBottom: '0.75rem',
  overflowX: 'auto'
});
styles.addClass('api-desc', { color: styles.var(textMuted), marginBottom: '0.5rem' });
styles.addClass('api-params', { fontSize: '0.9rem', color: styles.var(textMuted) });
styles.descendant('.api-params', 'code', { color: styles.var(primary), background: 'transparent', padding: 0 });
styles.addClass('api-badge', {
  display: 'inline-block',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginLeft: '0.5rem'
});
styles.addClass('badge-class', { background: '#3b82f6', color: 'white' });
styles.addClass('badge-function', { background: '#22c55e', color: 'white' });
styles.addClass('badge-interface', { background: '#a855f7', color: 'white' });
styles.addClass('badge-type', { background: '#f59e0b', color: 'white' });
styles.addClass('badge-method', { background: '#06b6d4', color: 'white' });
styles.addClass('badge-instance', { background: '#ec4899', color: 'white' });

// Syntax highlighting colors - Dark Theme
styles.addClass('sh-keyword', { color: '#c792ea', transition: 'color 0.3s ease' });      // const, let, import, export, function, return, if, else
styles.addClass('sh-string', { color: '#c3e88d', transition: 'color 0.3s ease' });       // strings
styles.addClass('sh-number', { color: '#f78c6c', transition: 'color 0.3s ease' });       // numbers
styles.addClass('sh-comment', { color: '#546e7a', fontStyle: 'italic', transition: 'color 0.3s ease' });  // comments
styles.addClass('sh-function', { color: '#82aaff', transition: 'color 0.3s ease' });     // function names
styles.addClass('sh-class', { color: '#ffcb6b', transition: 'color 0.3s ease' });        // class names, types
styles.addClass('sh-property', { color: '#f07178', transition: 'color 0.3s ease' });     // object properties
styles.addClass('sh-operator', { color: '#89ddff', transition: 'color 0.3s ease' });     // operators: =, =>, +, -, etc.
styles.addClass('sh-punctuation', { color: '#89ddff', transition: 'color 0.3s ease' });  // brackets, braces, parentheses
styles.addClass('sh-tag', { color: '#f07178', transition: 'color 0.3s ease' });          // HTML/JSX tags
styles.addClass('sh-attr', { color: '#ffcb6b', transition: 'color 0.3s ease' });         // attributes
styles.addClass('sh-variable', { color: '#eeffff', transition: 'color 0.3s ease' });     // variables
styles.addClass('sh-builtin', { color: '#82aaff', transition: 'color 0.3s ease' });      // built-in functions like console, document

// Syntax highlighting colors - Light Theme
styles.add({
  '[data-theme="light"] .sh-keyword': { color: '#9333ea' },      // purple-600
  '[data-theme="light"] .sh-string': { color: '#16a34a' },       // green-600
  '[data-theme="light"] .sh-number': { color: '#ea580c' },       // orange-600
  '[data-theme="light"] .sh-comment': { color: '#64748b' },      // slate-500
  '[data-theme="light"] .sh-function': { color: '#2563eb' },     // blue-600
  '[data-theme="light"] .sh-class': { color: '#d97706' },        // amber-600
  '[data-theme="light"] .sh-property': { color: '#dc2626' },     // red-600
  '[data-theme="light"] .sh-operator': { color: '#0891b2' },     // cyan-600
  '[data-theme="light"] .sh-punctuation': { color: '#0891b2' },  // cyan-600
  '[data-theme="light"] .sh-tag': { color: '#dc2626' },          // red-600
  '[data-theme="light"] .sh-attr': { color: '#d97706' },         // amber-600
  '[data-theme="light"] .sh-variable': { color: '#1e293b' },     // slate-800
  '[data-theme="light"] .sh-builtin': { color: '#2563eb' }       // blue-600
});

// Stats Section
styles.addClass('stats', {
  background: styles.var(bgCard),
  borderTop: `1px solid ${styles.var(border)}`,
  borderBottom: `1px solid ${styles.var(border)}`,
  padding: '3rem 0'
});
styles.addClass('stats-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '2rem',
  textAlign: 'center'
});
styles.addClass('stat', { display: 'flex', flexDirection: 'column', gap: '0.5rem' });
styles.addClass('stat-number', {
  fontSize: '2.5rem',
  fontWeight: 800,
  color: styles.var(primary),
  lineHeight: 1
});
styles.addClass('stat-label', { color: styles.var(textMuted), fontSize: '0.95rem' });

// Quick Start Section
styles.addClass('quick-start', { padding: '4rem 0' });
styles.addClass('quick-start-content', {
  display: 'grid',
  gridTemplateColumns: '1fr 1.5fr',
  gap: '3rem',
  alignItems: 'start'
});
styles.addClass('quick-start-steps', { display: 'flex', flexDirection: 'column', gap: '1.5rem' });
styles.addClass('step', { display: 'flex', gap: '1rem', alignItems: 'flex-start' });
styles.addClass('step-number', {
  width: '32px',
  height: '32px',
  background: styles.var(primary),
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '0.875rem',
  flexShrink: 0
});
styles.addClass('step-content', { flex: 1 });
styles.descendant('.step-content', 'h3', { marginBottom: '0.5rem', fontSize: '1.1rem' });
styles.descendant('.step-content', 'pre', { margin: 0, padding: '0.75rem', fontSize: '0.85rem' });
styles.addClass('quick-start-code', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  overflow: 'hidden'
});
styles.addClass('code-header', {
  background: styles.var(bgCode),
  padding: '0.75rem 1rem',
  borderBottom: `1px solid ${styles.var(border)}`,
  fontSize: '0.875rem',
  color: styles.var(textMuted),
  fontWeight: 500
});
styles.addClass('code-block', { margin: 0, padding: '1rem', fontSize: '0.85rem' });

// Why Elit Section
styles.addClass('why-elit', { padding: '4rem 0' });
styles.addClass('section-subtitle', {
  textAlign: 'center',
  color: styles.var(textMuted),
  fontSize: '1.1rem',
  marginTop: '-1.5rem',
  marginBottom: '3rem'
});
styles.addClass('why-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1.5rem'
});
styles.addClass('why-card', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.5rem',
  textAlign: 'center',
  transition: 'border-color 0.2s, transform 0.2s, background-color 0.3s ease'
});
styles.addPseudoClass('hover', { borderColor: styles.var(primary), transform: 'translateY(-4px)' }, '.why-card');
styles.addClass('why-icon', { fontSize: '2rem', display: 'block', marginBottom: '1rem' });
styles.descendant('.why-card', 'h3', { marginBottom: '0.5rem', fontSize: '1.1rem' });
styles.descendant('.why-card', 'p', { color: styles.var(textMuted), fontSize: '0.9rem', margin: 0 });

// Code Comparison Section
styles.addClass('comparison', {
  padding: '4rem 0',
  background: styles.var(bgCard),
  transition: 'background-color 0.3s ease'
});
styles.addClass('comparison-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '2rem'
});
styles.addClass('comparison-card', {
  background: styles.var(bg),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  overflow: 'hidden'
});
styles.addClass('comparison-header', {
  padding: '0.75rem 1rem',
  fontWeight: 600,
  borderBottom: `1px solid ${styles.var(border)}`
});
styles.add({ '.comparison-header.elit': { background: styles.var(primary), color: 'white' } });
styles.add({ '.comparison-header.vanilla': { background: '#374151', color: styles.var(textMuted) } });
styles.addClass('comparison-code', { margin: 0, padding: '1rem', fontSize: '0.85rem', minHeight: '280px' });

// Featured Blogs Section
styles.addClass('featured-blogs', { padding: '4rem 0' });
styles.addClass('blogs-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1.5rem'
});
styles.addClass('blog-icon', {
  fontSize: '2.5rem',
  marginBottom: '1rem',
  display: 'block'
});
styles.addClass('blog-description', {
  color: styles.var(textMuted),
  marginBottom: '1rem',
  fontSize: '0.95rem',
  lineHeight: 1.6
});
styles.addClass('blog-link', {
  color: styles.var(primary),
  fontWeight: 500,
  display: 'inline-block',
  marginTop: '1rem',
  transition: 'color 0.2s'
});
styles.addPseudoClass('hover', { color: styles.var(primaryDark) }, '.blog-link');

// API Overview Section
styles.addClass('api-overview', { padding: '4rem 0' });
styles.addClass('api-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gap: '1rem'
});
styles.addClass('api-card', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.25rem',
  textAlign: 'center',
  transition: 'border-color 0.2s'
});
styles.addPseudoClass('hover', { borderColor: styles.var(primary) }, '.api-card');
styles.addClass('api-icon', { fontSize: '1.75rem', display: 'block', marginBottom: '0.75rem' });
styles.descendant('.api-card', 'h4', { marginBottom: '0.25rem', fontSize: '1rem' });
styles.addClass('api-desc', { color: styles.var(textMuted), fontSize: '0.8rem', margin: '0 0 0.5rem' });
styles.addClass('api-count', {
  display: 'inline-block',
  background: styles.var(bgCode),
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.75rem',
  color: styles.var(primary),
  fontWeight: 600
});

// Media queries
styles.mediaMaxWidth('1024px', {
  '.stats-grid': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '.why-grid': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '.api-grid': { gridTemplateColumns: 'repeat(3, 1fr)' },
  '.quick-start-content': { gridTemplateColumns: '1fr' },
  '.blogs-grid': { gridTemplateColumns: 'repeat(2, 1fr)' }
});

styles.mediaMaxWidth('768px', {
  '.example-container': { gridTemplateColumns: '1fr' },
  '.docs-grid': { gridTemplateColumns: '1fr' },
  '.comparison-grid': { gridTemplateColumns: '1fr' },
  '.stats-grid': { gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' },
  '.stat-number': { fontSize: '2rem' },
  '.why-grid': { gridTemplateColumns: '1fr' },
  '.api-grid': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '.blog-grid': { gridTemplateColumns: '1fr' },
  '.blogs-grid': { gridTemplateColumns: '1fr' }
});

// Blog Styles
styles.addClass('blog-page', { paddingBottom: '4rem' });

styles.addClass('blog-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: '2rem',
  marginTop: '2rem'
});

styles.addClass('blog-card', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '2rem',
  transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s ease',
  cursor: 'pointer'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-4px)',
  boxShadow: `0 8px 24px rgba(99, 102, 241, 0.15)`
}, '.blog-card');

// Roadmap Styles
styles.addClass('roadmap-page', { paddingBottom: '4rem' });

styles.addClass('roadmap-phase', { marginBottom: '3rem' });

styles.descendant('.roadmap-phase--now', '.phase-title', { color: styles.var(primary) });

styles.addClass('phase-title', {
  fontSize: '1.75rem',
  fontWeight: 700,
  marginBottom: '0.25rem'
});

styles.addClass('phase-subtitle', {
  color: styles.var(textMuted),
  fontSize: '0.95rem',
  marginBottom: '1.5rem'
});

styles.addClass('roadmap-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1.5rem'
});

styles.addClass('roadmap-item', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column'
});

styles.addClass('roadmap-badge', {
  display: 'inline-block',
  alignSelf: 'flex-start',
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.25rem 0.65rem',
  borderRadius: '999px',
  marginBottom: '0.75rem'
});

styles.addClass('roadmap-badge--done', { background: '#dcfce7', color: '#166534' });
styles.addClass('roadmap-badge--in-progress', { background: '#fef3c7', color: '#92400e' });
styles.addClass('roadmap-badge--planned', { background: '#dbeafe', color: '#1e40af' });
styles.addClass('roadmap-badge--at-risk', { background: '#fee2e2', color: '#991b1b' });

styles.addClass('roadmap-item-title', {
  fontSize: '1.15rem',
  fontWeight: 600,
  marginBottom: '0.5rem'
});

styles.addClass('roadmap-item-desc', {
  color: styles.var(textMuted),
  fontSize: '0.9rem',
  lineHeight: 1.55,
  marginBottom: '0.75rem'
});

styles.addClass('roadmap-eta', {
  marginTop: 'auto',
  fontSize: '0.8rem',
  opacity: 0.7
});

styles.mediaMaxWidth('768px', {
  '.roadmap-grid': { gridTemplateColumns: '1fr' }
});

styles.addClass('blog-card-header', { marginBottom: '1rem' });

styles.addClass('blog-card-title', {
  fontSize: '1.5rem',
  fontWeight: 600,
  marginBottom: '0.5rem'
});

styles.descendant('.blog-card-title', 'a', {
  color: styles.var(textColor),
  textDecoration: 'none',
  transition: 'color 0.2s'
});

styles.addPseudoClass('hover', { color: styles.var(primary) }, '.blog-card-title a');

styles.addClass('blog-card-meta', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontSize: '0.875rem',
  color: styles.var(textMuted),
  marginBottom: '1rem'
});

styles.addClass('blog-card-date', {});
styles.addClass('blog-card-separator', {});
styles.addClass('blog-card-author', {});

styles.addClass('blog-card-excerpt', {
  color: styles.var(textMuted),
  lineHeight: 1.6,
  marginBottom: '1.5rem'
});

styles.addClass('blog-card-tags', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: '1rem'
});

styles.addClass('blog-tag', {
  background: styles.var(bgCode),
  color: styles.var(primary),
  padding: '0.25rem 0.75rem',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: 500
});

styles.addClass('blog-card-link', {
  color: styles.var(primary),
  textDecoration: 'none',
  fontWeight: 500,
  transition: 'color 0.2s'
});

styles.addPseudoClass('hover', {
  color: styles.var(primaryDark)
}, '.blog-card-link');

// Blog Detail Styles
styles.addClass('blog-detail', {
  maxWidth: '800px',
  margin: '0 auto',
  paddingBottom: '4rem'
});

styles.addClass('blog-back-link', {
  display: 'inline-block',
  color: styles.var(textMuted),
  textDecoration: 'none',
  marginBottom: '2rem',
  transition: 'color 0.2s'
});

styles.addPseudoClass('hover', { color: styles.var(primary) }, '.blog-back-link');

styles.addClass('blog-detail-title', {
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '1rem',
  lineHeight: 1.2
});

styles.addClass('blog-detail-meta', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  color: styles.var(textMuted),
  marginBottom: '1.5rem',
  fontSize: '0.9rem'
});

styles.addClass('blog-detail-date', {});
styles.addClass('blog-detail-separator', {});
styles.addClass('blog-detail-author', {});

styles.addClass('blog-detail-tags', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: '3rem'
});

styles.addClass('blog-detail-content', {
  fontSize: '1.1rem',
  lineHeight: 1.7,
  color: styles.var(textColor)
});

styles.descendant('.blog-detail-content', 'h2', {
  fontSize: '1.75rem',
  fontWeight: 600,
  marginTop: '2.5rem',
  marginBottom: '1rem',
  paddingBottom: '0.5rem',
  borderBottom: `2px solid ${styles.var(border)}`
});

styles.descendant('.blog-detail-content', 'h3', {
  fontSize: '1.4rem',
  fontWeight: 600,
  marginTop: '2rem',
  marginBottom: '0.75rem'
});

styles.descendant('.blog-detail-content', 'p', {
  marginBottom: '1.5rem',
  color: styles.var(textColor)
});

styles.descendant('.blog-detail-content', 'ul', {
  marginBottom: '1.5rem',
  paddingLeft: '1.5rem'
});

styles.descendant('.blog-detail-content', 'li', {
  marginBottom: '0.75rem',
  color: styles.var(textColor)
});

styles.descendant('.blog-detail-content', 'pre', {
  background: styles.var(bgCode),
  padding: '1.5rem',
  borderRadius: '8px',
  overflowX: 'auto',
  marginBottom: '1.5rem'
});

styles.descendant('.blog-detail-content', 'code', {
  fontFamily: "'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
  fontSize: '0.9em'
});

styles.descendant('.blog-card-title', 'a', {
  color: styles.var(textColor),
  textDecoration: 'none',
  transition: 'color 0.2s'
});

styles.addPseudoClass('hover', { color: styles.var(primary) }, '.blog-card-title a');

// Framework Comparison Section (Elit vs Next.js)
styles.addClass('framework-comparison', {
  padding: '5rem 0',
  background: styles.var(bg)
});

styles.addClass('comparison-table', {
  marginTop: '3rem',
  background: styles.var(bgCard),
  borderRadius: '12px',
  padding: '2rem',
  overflowX: 'auto'
});

styles.addClass('table-responsive', {
  minWidth: '600px'
});

styles.addClass('comparison-row', {
  display: 'grid',
  gridTemplateColumns: '1.5fr 1fr 1fr',
  gap: '1rem',
  padding: '1rem',
  borderBottom: `1px solid ${styles.var(border)}`,
  alignItems: 'center'
});

styles.add({
  '.comparison-row:last-child': {
    borderBottom: 'none'
  }
});

styles.add({
  '.comparison-row.table-header': {
    fontWeight: 700,
    fontSize: '1.1rem',
    background: styles.var(bgCode),
    borderRadius: '8px',
    borderBottom: 'none',
    marginBottom: '0.5rem'
  }
});

styles.addClass('comparison-cell', {
  padding: '0.5rem'
});

styles.add({
  '.comparison-cell.success': {
    color: '#22c55e',
    fontWeight: 600
  }
});

styles.addClass('comparison-summary', {
  marginTop: '3rem'
});

styles.add({
  '.comparison-summary h3': {
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '2rem'
  }
});

styles.addClass('summary-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '2rem',
  marginTop: '2rem'
});

styles.addClass('summary-card', {
  background: styles.var(bgCard),
  padding: '2rem',
  borderRadius: '12px',
  border: `1px solid ${styles.var(border)}`,
  transition: 'transform 0.2s, box-shadow 0.2s'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-4px)',
  boxShadow: '0 12px 24px rgba(99, 102, 241, 0.1)'
}, '.summary-card');

styles.addClass('summary-icon', {
  fontSize: '2.5rem',
  marginBottom: '1rem',
  display: 'block'
});

styles.add({
  '.summary-card h4': {
    fontSize: '1.3rem',
    marginBottom: '1rem',
    color: styles.var(primary)
  }
});

styles.add({
  '.summary-card p': {
    color: styles.var(textMuted),
    lineHeight: 1.7
  }
});

styles.add({
  '.comparison-header.nextjs': {
    background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
    color: '#ffffff'
  }
});

// Update Stats Grid for 6 items
styles.add({
  '.stats-grid': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '2rem'
  }
});

// Responsive design for comparison table
styles.mediaMaxWidth('768px', {
  '.comparison-row': {
    gridTemplateColumns: '1fr',
    gap: '0.5rem'
  },
  '.comparison-cell': {
    padding: '0.75rem 0.5rem'
  },
  '.comparison-row.table-header .comparison-cell:first-child': {
    display: 'none'
  },
  '.comparison-table': {
    padding: '1rem'
  }
});

// Pros & Cons Section
styles.addClass('pros-cons-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '2rem',
  marginTop: '3rem'
});

styles.addClass('pros-cons-card', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '2rem',
  transition: 'border-color 0.2s, background-color 0.3s ease'
});

styles.addClass('pros-title', {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: '1.5rem',
  color: '#22c55e',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
});

styles.addClass('cons-title', {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: '1.5rem',
  color: '#ef4444',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
});

styles.addClass('pros-cons-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
});

styles.addClass('pros-cons-item', {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  fontSize: '1rem',
  lineHeight: 1.6,
  padding: '0.75rem',
  borderRadius: '8px',
  transition: 'background-color 0.2s'
});

styles.add({
  '.pros-cons-item.pros': {
    color: '#22c55e',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)'
  }
});

styles.add({
  '.pros-cons-item.cons': {
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  }
});

styles.addPseudoClass('hover', {
  background: 'rgba(34, 197, 94, 0.15)'
}, '.pros-cons-item.pros');

styles.addPseudoClass('hover', {
  background: 'rgba(239, 68, 68, 0.15)'
}, '.pros-cons-item.cons');

// All Frameworks Comparison Section
styles.addClass('all-frameworks-comparison', {
  padding: '5rem 0',
  background: styles.var(bg)
});

styles.addClass('frameworks-table-wrapper', {
  marginTop: '3rem',
  overflowX: 'auto',
  borderRadius: '12px',
  border: `1px solid ${styles.var(border)}`,
  background: styles.var(bgCard)
});

styles.addClass('frameworks-table', {
  display: 'grid',
  minWidth: '800px',
  background: styles.var(bgCard)
});

styles.addClass('frameworks-row', {
  display: 'grid',
  gridTemplateColumns: '2fr repeat(5, 1fr)',
  borderBottom: `1px solid ${styles.var(border)}`,
  transition: 'background-color 0.2s'
});

styles.add({
  '.frameworks-row:last-child': {
    borderBottom: 'none'
  }
});

styles.add({
  '.frameworks-row.header': {
    background: styles.var(bgCode),
    fontWeight: 700,
    fontSize: '0.95rem',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderBottom: `2px solid ${styles.var(border)}`
  }
});

styles.addPseudoClass('hover', {
  background: 'rgba(99, 102, 241, 0.05)'
}, '.frameworks-row:not(.header)');

styles.addClass('frameworks-cell', {
  padding: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  borderRight: `1px solid ${styles.var(border)}`,
  fontSize: '0.9rem',
  lineHeight: 1.4,
  transition: 'background-color 0.2s'
});

styles.add({
  '.frameworks-cell:last-child': {
    borderRight: 'none'
  }
});

styles.add({
  '.frameworks-cell:first-child': {
    justifyContent: 'flex-start',
    textAlign: 'left',
    fontWeight: 500,
    paddingLeft: '1.5rem'
  }
});

styles.add({
  '.frameworks-cell.highlight': {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
    color: styles.var(primary),
    fontWeight: 700,
    borderLeft: `2px solid ${styles.var(primary)}`,
    borderRight: `2px solid ${styles.var(primary)}`
  }
});

styles.add({
  '.frameworks-row.header .frameworks-cell.highlight': {
    fontSize: '1.05rem',
    color: styles.var(primary)
  }
});

styles.add({
  '.frameworks-cell.label': {
    background: 'rgba(99, 102, 241, 0.03)',
    fontWeight: 600
  }
});

styles.add({
  '.frameworks-cell.best': {
    color: '#22c55e',
    fontWeight: 600
  }
});

styles.add({
  '.frameworks-cell.good': {
    color: '#10b981',
    fontWeight: 500
  }
});

// Responsive design for Framework Comparison
styles.mediaMaxWidth('1200px', {
  '.frameworks-table': {
    minWidth: '700px',
    fontSize: '0.85rem'
  },
  '.frameworks-cell': {
    padding: '0.875rem'
  },
  '.frameworks-cell:first-child': {
    paddingLeft: '1rem'
  }
});

styles.mediaMaxWidth('768px', {
  '.pros-cons-grid': {
    gridTemplateColumns: '1fr',
    gap: '1.5rem'
  },
  '.frameworks-table': {
    minWidth: '600px',
    fontSize: '0.8rem'
  },
  '.frameworks-cell': {
    padding: '0.75rem 0.5rem'
  },
  '.frameworks-cell:first-child': {
    paddingLeft: '0.75rem'
  },
  '.frameworks-row': {
    gridTemplateColumns: '1.5fr repeat(5, 1fr)'
  }
});

// Light theme adjustments for new components
styles.add({
  '[data-theme="light"] .pros-cons-item.pros': {
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.25)'
  },
  '[data-theme="light"] .pros-cons-item.cons': {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)'
  },
  '[data-theme="light"] .frameworks-cell.highlight': {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.04) 100%)'
  },
  '[data-theme="light"] .frameworks-cell.label': {
    background: 'rgba(99, 102, 241, 0.05)'
  }
});

// Performance Benchmark Section
styles.addClass('performance-benchmark', {
  padding: '5rem 0',
  background: styles.var(bg)
});

styles.addClass('benchmark-content-multi', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '2rem',
  marginTop: '3rem'
});

styles.addClass('runtime-benchmark', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.5rem',
  transition: 'transform 0.2s, box-shadow 0.2s'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-4px)',
  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.15)'
}, '.runtime-benchmark');

styles.addClass('runtime-header', {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1.5rem',
  paddingBottom: '1rem',
  borderBottom: `2px solid ${styles.var(border)}`
});

styles.addClass('runtime-icon', {
  fontSize: '2rem',
  flexShrink: 0
});

styles.addClass('runtime-title', {
  fontSize: '1.2rem',
  fontWeight: 700,
  margin: 0,
  flex: 1
});

styles.addClass('runtime-badge', {
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.25rem 0.75rem',
  borderRadius: '12px',
  background: styles.var(primary),
  color: 'white',
  whiteSpace: 'nowrap'
});

styles.addClass('badge-fast', {
  background: '#22c55e'
});

styles.addClass('badge-secure', {
  background: '#3b82f6'
});

styles.addClass('runtime-summary', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '1rem',
  padding: '0.75rem',
  background: styles.var(bgCode),
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: 500,
  color: styles.var(primary)
});

styles.addClass('summary-icon', {
  fontSize: '1.25rem'
});

// Footer section styles
styles.addClass('benchmark-footer', {
  display: 'grid',
  gridTemplateColumns: '1fr 1.5fr',
  gap: '3rem',
  marginTop: '3rem'
});

styles.addClass('benchmark-config', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '2rem'
});

styles.addClass('config-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '0.75rem'
});

styles.addClass('benchmark-reasons', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '2rem'
});

styles.addClass('reasons-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem'
});

styles.addClass('reason-content', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem'
});

styles.addClass('reason-title', {
  fontWeight: 700,
  fontSize: '0.95rem',
  color: styles.var(textColor)
});

styles.addClass('reason-desc', {
  fontSize: '0.85rem',
  color: styles.var(textMuted)
});

styles.addClass('chart-header', {
  marginBottom: '2rem'
});

styles.descendant('.chart-header', 'h3', {
  fontSize: '1.3rem',
  marginBottom: '0.5rem'
});

styles.addClass('chart-note', {
  fontSize: '0.85rem',
  color: styles.var(textMuted),
  marginTop: '0.5rem'
});

styles.addClass('chart-bars', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  marginBottom: '2rem'
});

styles.addClass('chart-bar-wrapper', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
});

styles.addClass('chart-label', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.25rem'
});

styles.addClass('framework-name', {
  fontWeight: 600,
  fontSize: '1rem'
});

styles.add({
  '.framework-name.elit': {
    color: styles.var(primary)
  }
});

styles.addClass('chart-value', {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: styles.var(textColor)
});

styles.addClass('chart-bar-container', {
  background: styles.var(bgCode),
  borderRadius: '6px',
  height: '40px',
  overflow: 'hidden',
  position: 'relative'
});

styles.addClass('chart-bar', {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '0 1rem',
  borderRadius: '6px',
  transition: 'width 0.5s ease',
  position: 'relative'
});

styles.addClass('bar-elit', {
  background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.8) 0%, rgba(99, 102, 241, 1) 100%)'
});

styles.addClass('bar-express', {
  background: 'linear-gradient(90deg, rgba(156, 163, 175, 0.6) 0%, rgba(156, 163, 175, 0.8) 100%)'
});

styles.addClass('bar-elysia', {
  background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.8) 100%)'
});

styles.addClass('chart-latency', {
  fontSize: '0.85rem',
  color: styles.var(textMuted),
  marginTop: '0.25rem'
});

styles.addClass('chart-legend', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  padding: '1.5rem',
  background: styles.var(bgCode),
  borderRadius: '8px'
});

styles.addClass('legend-item', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontSize: '0.9rem'
});

styles.addClass('legend-color', {
  width: '20px',
  height: '20px',
  borderRadius: '4px',
  flexShrink: 0
});

styles.add({
  '.legend-color.elit': {
    background: styles.var(primary)
  },
  '.legend-color.express': {
    background: '#9ca3af'
  },
  '.legend-color.elysia': {
    background: '#22c55e'
  }
});

styles.addClass('benchmark-details', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '2rem'
});

styles.descendant('.benchmark-details', 'h4', {
  fontSize: '1.2rem',
  marginBottom: '1rem',
  color: styles.var(textColor)
});

styles.addClass('config-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: '2rem'
});

styles.addClass('config-item', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem',
  background: styles.var(bgCode),
  borderRadius: '6px'
});

styles.addClass('config-label', {
  fontSize: '0.9rem',
  color: styles.var(textMuted)
});

styles.addClass('config-value', {
  fontSize: '0.95rem',
  fontWeight: 600,
  color: styles.var(primary)
});

styles.addClass('reasons-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginBottom: '2rem'
});

styles.addClass('reason-item', {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '1rem',
  background: styles.var(bgCode),
  borderRadius: '8px',
  lineHeight: 1.6
});

styles.addClass('reason-icon', {
  fontSize: '1.5rem',
  flexShrink: 0
});

styles.addClass('benchmark-note', {
  padding: '1.5rem',
  background: styles.var(bgCode),
  borderRadius: '8px',
  marginTop: '1.5rem'
});

// Responsive design for Benchmark
styles.mediaMaxWidth('1200px', {
  '.benchmark-content-multi': {
    gridTemplateColumns: '1fr',
    gap: '1.5rem'
  },
  '.benchmark-footer': {
    gridTemplateColumns: '1fr',
    gap: '2rem'
  }
});

styles.mediaMaxWidth('1024px', {
  '.reasons-grid': {
    gridTemplateColumns: '1fr'
  },
  '.config-grid': {
    gridTemplateColumns: '1fr'
  }
});

styles.mediaMaxWidth('768px', {
  '.performance-benchmark': {
    padding: '3rem 0'
  },
  '.chart-bar-container': {
    height: '35px'
  },
  '.chart-label': {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.25rem'
  },
  '.framework-name': {
    fontSize: '0.95rem'
  },
  '.chart-value': {
    fontSize: '0.85rem'
  },
  '.runtime-header': {
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  '.runtime-badge': {
    alignSelf: 'flex-start'
  }
});

// Inject styles
export function injectStyles() {
  styles.inject('elit-docs-styles');
}
