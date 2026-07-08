import styles from '@elitjs/style';

styles.addTag('*', {
  margin: 0,
  padding: 0,
  boxSizing: 'border-box'
});

styles.addTag('body', {
  minHeight: '100vh',
  fontFamily: "'Aptos', 'Trebuchet MS', sans-serif",
  color: '#173447',
  background: 'linear-gradient(160deg, #f7f1e9 0%, #efe4d8 54%, #e6d8c9 100%)'
});

styles.addTag('button', {
  fontFamily: 'inherit'
});

styles.addClass('app-shell', {
  maxWidth: '1120px',
  margin: '0 auto',
  padding: '32px 20px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
});

styles.addClass('hero-panel', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px',
  alignItems: 'stretch'
});

styles.addClass('hero-copy', {
  background: 'rgba(255, 250, 244, 0.8)',
  borderRadius: '30px',
  padding: '28px',
  border: '1px solid rgba(255, 255, 255, 0.7)',
  boxShadow: '0 22px 46px rgba(23, 52, 71, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px'
});

styles.addClass('hero-kicker', {
  display: 'inline-flex',
  width: 'fit-content',
  padding: '7px 12px',
  borderRadius: '999px',
  background: 'rgba(47, 125, 109, 0.12)',
  color: '#25695d',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
});

styles.addClass('hero-title', {
  fontSize: 'clamp(2.4rem, 4vw, 4.4rem)',
  lineHeight: 0.98,
  color: '#173447',
  maxWidth: '11ch'
});

styles.addClass('hero-description', {
  fontSize: '1rem',
  lineHeight: 1.7,
  color: '#5f6f7d',
  maxWidth: '40rem'
});

styles.addClass('hero-actions', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginTop: '4px'
});

styles.addClass('counter-panel', {
  background: 'linear-gradient(160deg, #173447 0%, #24566c 100%)',
  borderRadius: '30px',
  padding: '28px',
  color: '#fffaf4',
  boxShadow: '0 24px 48px rgba(23, 52, 71, 0.16)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  justifyContent: 'space-between'
});

styles.addClass('counter-label', {
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255, 250, 244, 0.74)'
});

styles.addClass('counter-value', {
  fontSize: 'clamp(4rem, 10vw, 6rem)',
  lineHeight: 0.9,
  fontWeight: 800,
  color: '#fffaf4'
});

styles.addClass('counter-copy', {
  fontSize: '0.96rem',
  lineHeight: 1.7,
  color: 'rgba(255, 250, 244, 0.78)'
});

styles.addClass('counter-row', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px'
});

styles.addClass('content-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px'
});

styles.addClass('panel', {
  background: 'rgba(255, 250, 244, 0.82)',
  borderRadius: '30px',
  padding: '28px',
  border: '1px solid rgba(255, 255, 255, 0.72)',
  boxShadow: '0 22px 46px rgba(23, 52, 71, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
});

styles.addClass('panel-accent', {
  background: 'linear-gradient(150deg, #2f7d6d 0%, #3b8f7d 60%, #f18f5a 130%)'
});

styles.addClass('section-title', {
  fontSize: '1.4rem',
  color: '#173447'
});

styles.addClass('section-title-light', {
  color: '#fffaf4'
});

styles.addClass('section-copy', {
  fontSize: '0.96rem',
  lineHeight: 1.7,
  color: '#61707e'
});

styles.addClass('section-copy-light', {
  color: 'rgba(255, 250, 244, 0.82)'
});

styles.addClass('highlight-grid', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px'
});

styles.addClass('highlight-card', {
  background: '#fffaf4',
  borderRadius: '22px',
  padding: '18px',
  border: '1px solid rgba(23, 52, 71, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
});

styles.addClass('highlight-title', {
  fontSize: '1rem',
  color: '#173447'
});

styles.addClass('highlight-copy', {
  fontSize: '0.9rem',
  lineHeight: 1.6,
  color: '#64727f'
});

styles.addClass('steps-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
});

styles.addClass('step-item', {
  display: 'grid',
  gridTemplateColumns: '54px 1fr',
  gap: '12px',
  alignItems: 'start',
  padding: '14px 0',
  borderTop: '1px solid rgba(255, 250, 244, 0.18)'
});

styles.addClass('step-index', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '54px',
  height: '54px',
  borderRadius: '18px',
  background: 'rgba(255, 250, 244, 0.15)',
  color: '#fffaf4',
  fontWeight: 800
});

styles.addClass('step-copy', {
  paddingTop: '10px',
  color: '#fffaf4',
  lineHeight: 1.6,
  fontSize: '0.95rem'
});

styles.addClass('btn', {
  border: 'none',
  borderRadius: '999px',
  padding: '14px 18px',
  fontSize: '0.95rem',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease'
});

styles.addClass('btn-primary', {
  background: 'linear-gradient(135deg, #f18f5a 0%, #f06f45 100%)',
  color: '#fffaf4',
  boxShadow: '0 16px 30px rgba(240, 111, 69, 0.22)'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-1px)',
  boxShadow: '0 20px 36px rgba(240, 111, 69, 0.28)'
}, '.btn-primary');

styles.addClass('btn-secondary', {
  background: '#fffaf4',
  color: '#173447',
  border: '1px solid rgba(23, 52, 71, 0.12)',
  boxShadow: '0 10px 22px rgba(23, 52, 71, 0.08)'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-1px)',
  background: '#ffffff'
}, '.btn-secondary');

styles.addClass('btn-ghost', {
  background: 'transparent',
  color: '#fffaf4',
  border: '1px solid rgba(255, 250, 244, 0.2)'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-1px)',
  background: 'rgba(255, 250, 244, 0.08)'
}, '.btn-ghost');

export function injectStyles() {
  styles.inject('basic-example-styles');
}

export default styles;