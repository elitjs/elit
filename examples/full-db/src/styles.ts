import styles from '@elitjs/style';

// Global styles
styles.addTag('*', {
  margin: 0,
  padding: 0,
  boxSizing: 'border-box'
});

styles.addTag('body', {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  background: '#f8fafc',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column'
});

styles.addTag('h1', { color: '#1e293b' });
styles.addTag('h2', { color: '#1e293b' });
styles.addTag('h3', { color: '#1e293b' });
styles.addTag('p', { color: '#64748b' });

// Buttons
styles.addClass('btn', {
  padding: '0.75rem 1.5rem',
  border: 'none',
  borderRadius: '12px',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem'
});

styles.addClass('btn-primary', {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-1px)',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
}, '.btn-primary');

styles.addClass('btn-secondary', {
  background: '#f1f5f9',
  color: '#475569'
});

styles.addPseudoClass('hover', { background: '#e2e8f0' }, '.btn-secondary');

styles.addClass('btn-outline', {
  background: 'transparent',
  border: '2px solid #667eea',
  color: '#667eea'
});

styles.addPseudoClass('hover', {
  background: 'transparent',
  borderColor: '#764ba2',
  color: '#764ba2'
}, '.btn-outline');

styles.addClass('btn-lg', { padding: '1rem 2rem', fontSize: '1rem' });
styles.addClass('btn-block', { width: '100%' });

// Header
styles.addClass('header', {
  background: 'white',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  position: 'sticky',
  top: 0,
  zIndex: 100
});

styles.addClass('nav', {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '1rem 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
});

styles.addClass('brand-title', {
  fontSize: '1.5rem',
  margin: 0,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
});

styles.addClass('nav-menu', {
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem'
});

styles.addClass('nav-link', {
  color: '#64748b',
  textDecoration: 'none',
  fontWeight: '500',
  fontSize: '0.875rem'
});

styles.addPseudoClass('hover', { color: '#667eea' }, '.nav-link');

styles.addClass('nav-user', {
  color: '#64748b',
  fontWeight: '500',
  fontSize: '0.875rem',
  marginRight: '1rem'
});

styles.addClass('btn-sm', { padding: '0.5rem 1rem', fontSize: '0.875rem' });

// Main content
styles.addTag('main', {
  flex: 1,
  padding: '0'
});

// Footer
styles.addClass('footer', {
  background: 'white',
  borderTop: '1px solid #e2e8f0',
  marginTop: 'auto'
});

styles.addClass('footer-content', {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '2rem',
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '2rem'
});

styles.addClass('footer-section', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
});

styles.addClass('footer-title', {
  fontWeight: 'bold',
  color: '#1e293b',
  margin: 0
});

styles.addClass('footer-text', {
  color: '#64748b',
  fontSize: '0.875rem',
  margin: 0
});

styles.addClass('footer-link', {
  color: '#667eea',
  textDecoration: 'none',
  fontSize: '0.875rem'
});

styles.addClass('footer-copyright', {
  color: '#94a3b8',
  fontSize: '0.875rem',
  margin: 0
});

// ===== HOME PAGE STYLES =====
styles.addClass('home-page', {
  width: '100%'
});

styles.addClass('hero-section', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '4rem',
  padding: '4rem 2rem',
  maxWidth: '1400px',
  margin: '0 auto',
  alignItems: 'center'
});

styles.addClass('hero-content', {});

styles.addClass('hero-badge', {
  display: 'inline-block',
  padding: '0.5rem 1rem',
  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
  color: '#667eea',
  borderRadius: '100px',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginBottom: '1.5rem'
});

styles.addClass('hero-title', {
  fontSize: '3.5rem',
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: '1.5rem',
  color: '#1e293b'
});

styles.addClass('hero-highlight', {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
});

styles.addClass('hero-description', {
  fontSize: '1.125rem',
  color: '#64748b',
  marginBottom: '2rem',
  lineHeight: 1.6
});

styles.addClass('hero-buttons', {
  display: 'flex',
  gap: '1rem',
  marginBottom: '3rem'
});

styles.addClass('hero-stats', {
  display: 'flex',
  gap: '2rem'
});

styles.addClass('hero-stat', {
  display: 'flex',
  flexDirection: 'column'
});

styles.addClass('hero-stat-number', {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#1e293b'
});

styles.addClass('hero-stat-label', {
  fontSize: '0.875rem',
  color: '#64748b'
});

styles.addClass('hero-visual', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
});

styles.addClass('hero-card-preview', {
  width: '100%',
  maxWidth: '400px',
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden'
});

styles.addClass('preview-header', {
  padding: '1rem',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0'
});

styles.addClass('preview-dots', {
  display: 'flex',
  gap: '0.5rem'
});

styles.addClass('preview-dot', {
  width: '12px',
  height: '12px',
  borderRadius: '50%'
});

styles.addClass('preview-dot-red', { background: '#ef4444' });
styles.addClass('preview-dot-yellow', { background: '#f59e0b' });
styles.addClass('preview-dot-green', { background: '#10b981' });

styles.addClass('preview-body', {
  padding: '1.5rem'
});

styles.addClass('preview-line', {
  height: '12px',
  background: '#e2e8f0',
  borderRadius: '6px',
  marginBottom: '0.75rem'
});

styles.addClass('preview-line-long', { width: '100%' });
styles.addClass('preview-line-medium', { width: '75%' });
styles.addClass('preview-line-short', { width: '50%' });

styles.addClass('preview-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '0.75rem',
  marginTop: '1.5rem'
});

styles.addClass('preview-grid-item', {
  aspectRatio: '1',
  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
  borderRadius: '8px'
});

styles.addClass('features-section', {
  padding: '4rem 2rem',
  maxWidth: '1400px',
  margin: '0 auto',
  textAlign: 'center'
});

styles.addClass('section-title', {
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '1rem'
});

styles.addClass('section-subtitle', {
  fontSize: '1.125rem',
  color: '#64748b',
  marginBottom: '3rem'
});

styles.addClass('features-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '2rem',
  textAlign: 'left'
});

styles.addClass('feature-item', {
  padding: '2rem',
  background: 'white',
  borderRadius: '16px',
  border: '1px solid #e2e8f0'
});

styles.addClass('feature-icon', {
  width: '48px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
  marginBottom: '1rem'
});

styles.addClass('feature-title', {
  fontSize: '1.125rem',
  fontWeight: 600,
  marginBottom: '0.5rem'
});

styles.addClass('feature-description', {
  fontSize: '0.875rem',
  color: '#64748b',
  lineHeight: 1.6,
  margin: 0
});

styles.addClass('cta-section', {
  padding: '4rem 2rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  textAlign: 'center'
});

styles.addClass('cta-content', {
  maxWidth: '600px',
  margin: '0 auto'
});

styles.addClass('cta-title', {
  fontSize: '2.5rem',
  fontWeight: 700,
  color: 'white',
  marginBottom: '1rem'
});

styles.addClass('cta-description', {
  fontSize: '1.125rem',
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '2rem'
});

styles.addClass('cta-button', {
  background: 'white',
  color: '#667eea'
});

// ===== AUTH PAGE STYLES =====
styles.addClass('auth-page', {
  minHeight: 'calc(100vh - 200px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem'
});

styles.addClass('auth-container', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  maxWidth: '1200px',
  width: '100%',
  background: 'white',
  borderRadius: '24px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden'
});

styles.addClass('auth-branding', {
  padding: '3rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  display: 'flex',
  alignItems: 'center'
});

styles.addClass('branding-content', {});

styles.addClass('branding-title', {
  fontSize: '2.5rem',
  fontWeight: 700,
  color: 'white',
  marginBottom: '1rem'
});

styles.addClass('branding-description', {
  fontSize: '1.125rem',
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '2rem'
});

styles.addClass('branding-features', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
});

styles.addClass('branding-feature', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem'
});

styles.addClass('feature-icon', {
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255, 255, 255, 0.2)',
  borderRadius: '50%',
  fontSize: '0.75rem'
});

styles.addClass('feature-text', {
  fontSize: '0.875rem',
  color: 'rgba(255, 255, 255, 0.9)'
});

styles.addClass('auth-form-wrapper', {
  padding: '3rem'
});

styles.addClass('auth-form-card', {});

styles.addClass('auth-header', {
  marginBottom: '2rem'
});

styles.addClass('auth-title', {
  fontSize: '1.75rem',
  fontWeight: 700,
  marginBottom: '0.5rem'
});

styles.addClass('auth-subtitle', {
  fontSize: '0.875rem',
  color: '#64748b',
  margin: 0
});

styles.addClass('auth-error', {
  padding: '0.75rem 1rem',
  background: '#fee2e2',
  color: '#dc2626',
  borderRadius: '8px',
  fontSize: '0.875rem',
  marginBottom: '1.5rem'
});

styles.addClass('form-group', {
  marginBottom: '1.25rem'
});

styles.addClass('form-label', {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.5rem'
});

styles.addClass('input-wrapper', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
});

styles.addClass('input-icon', {
  position: 'absolute',
  left: '1rem',
  fontSize: '1.25rem',
  pointerEvents: 'none'
});

styles.addClass('form-input', {
  width: '100%',
  padding: '0.75rem 1rem 0.75rem 3rem',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.875rem',
  transition: 'border-color 0.2s'
});

styles.addClass('form-input-sm', {
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  border: 'none',
  background: 'transparent'
});

styles.addPseudoClass('focus', {
  outline: 'none',
  borderColor: '#667eea'
}, '.form-input');

styles.addClass('form-options', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem'
});

styles.addClass('checkbox-label', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: '#64748b',
  cursor: 'pointer'
});

styles.addClass('checkbox', {
  width: '16px',
  height: '16px',
  cursor: 'pointer'
});

styles.addClass('link-button', {
  background: 'none',
  border: 'none',
  color: '#667eea',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  padding: 0
});

styles.addClass('link-button-inline', {
  background: 'none',
  border: 'none',
  color: '#667eea',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0
});

styles.addClass('auth-divider', {
  display: 'flex',
  alignItems: 'center',
  textAlign: 'center',
  margin: '1.5rem 0',
  color: '#94a3b8',
  fontSize: '0.875rem'
});

styles.addClass('social-login', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
});

styles.addClass('social-button', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  background: 'white',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#334155',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

styles.addPseudoClass('hover', {
  background: '#f8fafc',
  borderColor: '#cbd5e1'
}, '.social-button');

styles.addClass('social-icon', {
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700
});

styles.addClass('auth-footer', {
  marginTop: '2rem',
  textAlign: 'center'
});

styles.addClass('footer-text', {
  fontSize: '0.875rem',
  color: '#64748b',
  margin: 0
});

// Forgot password page specific styles
styles.addClass('auth-container-single', {
  gridTemplateColumns: '1fr',
  maxWidth: '500px'
});

styles.addClass('auth-form-wrapper-full', {
  padding: '3rem'
});

styles.addClass('back-button', {
  background: 'none',
  border: 'none',
  color: '#64748b',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
  padding: '0',
  marginBottom: '1rem',
  display: 'inline-flex',
  alignItems: 'center'
});

styles.addPseudoClass('hover', { color: '#667eea' }, '.back-button');

styles.addClass('success-message', {
  textAlign: 'center',
  padding: '2rem 0'
});

styles.addClass('success-icon', {
  width: '64px',
  height: '64px',
  margin: '0 auto 1.5rem',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: 'white',
  fontSize: '2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold'
});

styles.addClass('success-title', {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: '1rem'
});

styles.addClass('success-text', {
  fontSize: '1rem',
  color: '#64748b',
  marginBottom: '0.5rem'
});

styles.addClass('success-email', {
  fontWeight: 600,
  color: '#667eea'
});

styles.addClass('success-description', {
  fontSize: '0.875rem',
  color: '#94a3b8',
  marginBottom: '2rem'
});

// ===== PROFILE PAGE STYLES =====
styles.addClass('profile-page', {
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem'
});

styles.addClass('profile-header-section', {
  position: 'relative',
  marginBottom: '4rem'
});

styles.addClass('profile-cover', {
  height: '200px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '16px'
});

styles.addClass('profile-avatar-section', {
  position: 'absolute',
  bottom: '-60px',
  left: '2rem',
  display: 'flex',
  alignItems: 'flex-end',
  gap: '1rem'
});

styles.addClass('profile-avatar', {
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  fontWeight: 700,
  color: '#667eea',
  border: '4px solid white',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
});

styles.addClass('avatar-edit-button', {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'white',
  border: '2px solid white',
  fontSize: '1.25rem',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
});

styles.addClass('profile-content', {
  display: 'grid',
  gridTemplateColumns: '350px 1fr',
  gap: '2rem'
});

styles.addClass('profile-sidebar', {});

styles.addClass('profile-main', {});

styles.addClass('profile-card', {
  background: 'white',
  borderRadius: '16px',
  padding: '1.5rem',
  border: '1px solid #e2e8f0',
  marginBottom: '1.5rem'
});

styles.addClass('profile-info-display', {
  textAlign: 'center',
  marginBottom: '1.5rem'
});

styles.addClass('profile-name', {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: '0.25rem'
});

styles.addClass('profile-email', {
  fontSize: '0.875rem',
  color: '#64748b',
  margin: '0'
});

styles.addClass('profile-meta', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginBottom: '1.5rem'
});

styles.addClass('meta-item', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem'
});

styles.addClass('meta-icon', {
  fontSize: '1.25rem'
});

styles.addClass('meta-text', {
  fontSize: '0.875rem',
  color: '#64748b'
});

styles.addClass('edit-form', {
  marginBottom: '1.5rem'
});

styles.addClass('edit-actions', {
  display: 'flex',
  gap: '0.75rem'
});

styles.addClass('stats-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1rem',
  marginBottom: '1.5rem'
});

styles.addClass('stat-card', {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1rem',
  background: 'white',
  borderRadius: '12px',
  border: '1px solid #e2e8f0'
});

styles.addClass('stat-icon', {
  fontSize: '1.5rem'
});

styles.addClass('stat-info', {
  display: 'flex',
  flexDirection: 'column'
});

styles.addClass('stat-value', {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#1e293b'
});

styles.addClass('stat-label', {
  fontSize: '0.75rem',
  color: '#64748b'
});

styles.addClass('card-title', {
  fontSize: '1.125rem',
  fontWeight: 600,
  marginBottom: '1rem'
});

styles.addClass('profile-bio', {
  fontSize: '0.875rem',
  color: '#64748b',
  lineHeight: 1.6,
  margin: 0
});

styles.addClass('activity-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
});

styles.addClass('activity-item', {
  display: 'flex',
  gap: '1rem',
  alignItems: 'flex-start'
});

styles.addClass('activity-icon', {
  fontSize: '1.25rem'
});

styles.addClass('activity-content', {
  flex: 1
});

styles.addClass('activity-title', {
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#1e293b',
  marginBottom: '0.125rem'
});

styles.addClass('activity-time', {
  fontSize: '0.75rem',
  color: '#94a3b8',
  margin: 0
});

styles.addClass('profile-actions', {
  display: 'flex',
  gap: '1rem'
});

// Chat Page Styles
styles.addClass('chat-page', {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem'
});

styles.addClass('chat-container', {
  width: '100%',
  maxWidth: '800px',
  height: '600px',
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

styles.addClass('chat-header', {
  padding: '1.5rem',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
});

styles.addClass('chat-header-info', {});

styles.addClass('chat-title', {
  fontSize: '1.5rem',
  fontWeight: 700,
  margin: '0 0 0.25rem 0',
  color: '#1e293b'
});

styles.addClass('chat-subtitle', {
  fontSize: '0.875rem',
  color: '#64748b',
  margin: 0
});

styles.addClass('chat-messages', {
  flex: 1,
  overflowY: 'auto',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
});

styles.addClass('chat-empty', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%'
});

styles.addClass('chat-empty-text', {
  color: '#94a3b8',
  fontSize: '0.875rem'
});

styles.addClass('chat-messages-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
});

styles.addClass('chat-message', {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '70%'
});

styles.addClass('chat-message-user', {
  alignSelf: 'flex-end',
  alignItems: 'flex-end'
});

styles.addClass('chat-message-other', {
  alignSelf: 'flex-start',
  alignItems: 'flex-start'
});

styles.addClass('chat-message-content', {
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  marginBottom: '0.25rem'
});

styles.addClass('chat-message-user .chat-message-content', {
  background: '#3b82f6',
  color: '#ffffff',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
});

styles.addClass('chat-message-other .chat-message-content', {
  background: '#e2e8f0',
  color: '#000000'
});

styles.addClass('chat-message-sender', {
  fontSize: '0.75rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  display: 'block'
});

styles.addClass('chat-message-text', {
  margin: 0,
  fontSize: '0.875rem',
  lineHeight: 1.5,
  color: '#000000'
});

styles.addClass('chat-message-time', {
  fontSize: '0.75rem',
  color: '#94a3b8'
});

styles.addClass('chat-input-area', {
  padding: '1rem',
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  gap: '0.75rem'
});

styles.addClass('chat-input', {
  flex: 1,
  padding: '0.75rem 1rem',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.875rem',
  outline: 'none'
});

styles.addClass('chat-input:focus', {
  borderColor: '#3b82f6'
});

styles.addClass('chat-typing', {
  padding: '0.5rem 1rem',
  display: 'flex',
  gap: '0.25rem',
  alignItems: 'center'
});

styles.addClass('typing-dot', {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#94a3b8'
});

// Chat List Styles
styles.addClass('chat-list-page', {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem'
});

styles.addClass('chat-search', {
  padding: '1rem 1.5rem',
  borderBottom: '1px solid #e2e8f0'
});

styles.addClass('chat-users-list', {
  flex: 1,
  overflowY: 'auto',
  padding: '1.5rem'
});

styles.addClass('chat-loading', {
  display: 'flex',
  justifyContent: 'center',
  padding: '2rem'
});

styles.addClass('chat-users-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1rem'
});

styles.addClass('chat-user-card', {
  background: 'white',
  borderRadius: '12px',
  padding: '1rem',
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '1px solid #e2e8f0'
});

styles.addClass('chat-user-card:hover', {
  borderColor: '#3b82f6',
  transform: 'translateY(-2px)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
});

styles.addClass('chat-user-avatar', {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
});

styles.addClass('chat-avatar-text', {
  color: 'white',
  fontSize: '1.25rem',
  fontWeight: 700
});

styles.addClass('chat-user-info', {
  flex: 1,
  minWidth: 0
});

styles.addClass('chat-user-name', {
  fontSize: '1rem',
  fontWeight: 600,
  margin: '0 0 0.25rem 0',
  color: '#1e293b'
});

styles.addClass('chat-user-email', {
  fontSize: '0.875rem',
  color: '#64748b',
  margin: '0 0 0.25rem 0'
});

styles.addClass('chat-user-bio', {
  fontSize: '0.75rem',
  color: '#94a3b8',
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
});

styles.addClass('chat-chat-button', {
  flexShrink: 0
});

export function injectStyles() {
  styles.inject('global-styles');
}

export default styles;
