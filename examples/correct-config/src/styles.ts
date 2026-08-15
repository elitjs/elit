import styles from '@elitjs/style';

// Global styles
styles.addTag('*', {
  margin: 0,
  padding: 0,
  boxSizing: 'border-box'
});

styles.addTag('body', {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem'
});

// Container
styles.addClass('container', {
  width: '100%',
  maxWidth: '600px'
});

// Card
styles.addClass('card', {
  background: 'white',
  borderRadius: '16px',
  padding: '3rem',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
});

// Typography
styles.addTag('h1', {
  fontSize: '2.5rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '1rem'
});

styles.addTag('h2', {
  fontSize: '1.5rem',
  color: '#333',
  marginBottom: '1rem'
});

styles.addTag('p', {
  color: '#666',
  marginBottom: '2rem',
  lineHeight: 1.6
});

// Counter section
styles.addClass('counter', {
  marginTop: '2rem',
  paddingTop: '2rem',
  borderTop: '2px solid #f0f0f0'
});

styles.addClass('count-display', {
  fontSize: '3rem',
  fontWeight: 'bold',
  color: '#667eea',
  textAlign: 'center',
  margin: '2rem 0'
});

// Button group
styles.addClass('button-group', {
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center'
});

// Buttons
styles.addClass('btn', {
  padding: '0.75rem 1.5rem',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
});

styles.addClass('btn-primary', {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-2px)',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
}, '.btn-primary');

styles.addClass('btn-secondary', {
  background: '#f0f0f0',
  color: '#333'
});

styles.addPseudoClass('hover', {
  background: '#e0e0e0',
  transform: 'translateY(-2px)'
}, '.btn-secondary');

styles.addPseudoClass('active', {
  transform: 'translateY(0)'
}, '.btn');

styles.inject('global-styles');
export default styles;
