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
	background: 'radial-gradient(circle at top left, #fff6ef 0%, #f4ede5 45%, #eadfd5 100%)'
});

styles.addTag('button', {
	fontFamily: 'inherit'
});

styles.addTag('input', {
	fontFamily: 'inherit'
});

styles.addTag('textarea', {
	fontFamily: 'inherit'
});

styles.addTag('select', {
	fontFamily: 'inherit'
});

styles.addTag('a', {
	color: 'inherit'
});

styles.addClass('app-shell', {
	minHeight: '100vh',
	position: 'relative',
	overflow: 'hidden'
});

styles.addClass('app-main', {
	width: '100%',
	padding: '0 1.5rem 3rem',
	position: 'relative',
	zIndex: 1
});

styles.addClass('ambient-orb', {
	position: 'fixed',
	borderRadius: '999px',
	filter: 'blur(0px)',
	opacity: 0.75,
	pointerEvents: 'none',
	zIndex: 0
});

styles.addClass('ambient-orb-one', {
	width: '22rem',
	height: '22rem',
	top: '-7rem',
	right: '-5rem',
	background: 'radial-gradient(circle, rgba(244, 91, 72, 0.34) 0%, rgba(244, 91, 72, 0) 72%)'
});

styles.addClass('ambient-orb-two', {
	width: '18rem',
	height: '18rem',
	bottom: '4rem',
	left: '-6rem',
	background: 'radial-gradient(circle, rgba(63, 166, 138, 0.24) 0%, rgba(63, 166, 138, 0) 74%)'
});

styles.addClass('btn', {
	border: 'none',
	borderRadius: '999px',
	padding: '0.85rem 1.2rem',
	fontSize: '0.95rem',
	fontWeight: 700,
	cursor: 'pointer',
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	gap: '0.5rem',
	transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease'
});

styles.addClass('btn-primary', {
	color: '#fffaf4',
	background: 'linear-gradient(135deg, #f45b48 0%, #ff8f5a 100%)',
	boxShadow: '0 14px 28px rgba(244, 91, 72, 0.22)'
});

styles.addPseudoClass('hover', {
	transform: 'translateY(-1px)',
	boxShadow: '0 18px 34px rgba(244, 91, 72, 0.28)'
}, '.btn-primary');

styles.addClass('btn-secondary', {
	color: '#173447',
	background: 'rgba(255, 250, 244, 0.8)',
	border: '1px solid rgba(23, 52, 71, 0.12)',
	boxShadow: '0 8px 22px rgba(23, 52, 71, 0.08)'
});

styles.addPseudoClass('hover', {
	transform: 'translateY(-1px)',
	background: '#fffaf4'
}, '.btn-secondary');

styles.addClass('btn-ghost', {
	color: '#173447',
	background: 'transparent',
	border: '1px solid rgba(23, 52, 71, 0.14)'
});

styles.addPseudoClass('hover', {
	background: 'rgba(23, 52, 71, 0.05)'
}, '.btn-ghost');

styles.addClass('btn-danger', {
	color: '#b64031',
	background: 'rgba(244, 91, 72, 0.1)',
	border: '1px solid rgba(244, 91, 72, 0.18)'
});

styles.addPseudoClass('hover', {
	background: 'rgba(244, 91, 72, 0.16)'
}, '.btn-danger');

styles.addClass('btn[disabled]', {
	cursor: 'not-allowed',
	opacity: 0.6,
	boxShadow: 'none',
	transform: 'none'
});

styles.addClass('app-header', {
	position: 'relative',
	zIndex: 1,
	padding: '1.5rem'
});

styles.addClass('app-header-inner', {
	maxWidth: '1180px',
	margin: '0 auto',
	borderRadius: '28px',
	background: 'rgba(255, 250, 244, 0.72)',
	border: '1px solid rgba(255, 255, 255, 0.7)',
	boxShadow: '0 18px 44px rgba(23, 52, 71, 0.08)',
	backdropFilter: 'blur(14px)',
	padding: '1.25rem 1.5rem',
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	gap: '1rem',
	flexWrap: 'wrap'
});

styles.addClass('brand-block', {
	display: 'flex',
	flexDirection: 'column',
	gap: '0.45rem'
});

styles.addClass('brand-link', {
	display: 'inline-flex',
	alignItems: 'center',
	gap: '0.85rem',
	textDecoration: 'none'
});

styles.addPseudoClass('hover', {
	transform: 'translateY(-1px)'
}, '.brand-link');

styles.addClass('brand-mark', {
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	width: '2.75rem',
	height: '2.75rem',
	borderRadius: '18px',
	background: 'linear-gradient(135deg, #173447 0%, #26566f 100%)',
	color: '#fffaf4',
	fontWeight: 800,
	letterSpacing: '0.08em'
});

styles.addClass('brand-title-group', {
	display: 'flex',
	flexDirection: 'column',
	gap: '0.15rem'
});

styles.addClass('brand-title', {
	fontSize: '1.1rem',
	lineHeight: 1.2,
	color: '#173447'
});

styles.addClass('brand-subtitle', {
	fontSize: '0.92rem',
	color: '#526575',
	maxWidth: '40rem'
});

styles.addClass('header-pill', {
	display: 'inline-flex',
	alignItems: 'center',
	gap: '0.55rem',
	padding: '0.85rem 1rem',
	borderRadius: '999px',
	background: 'rgba(23, 52, 71, 0.05)',
	border: '1px solid rgba(23, 52, 71, 0.08)',
	color: '#173447',
	fontSize: '0.92rem',
	fontWeight: 700
});

styles.addClass('header-pill-label', {
	color: '#7a6c62',
	fontWeight: 600,
	textTransform: 'uppercase',
	letterSpacing: '0.06em',
	fontSize: '0.74rem'
});

styles.addClass('header-pill-value', {
	color: '#173447'
});

styles.addClass('app-footer', {
	position: 'relative',
	zIndex: 1,
	padding: '0 1.5rem 2rem'
});

styles.addClass('app-footer-inner', {
	maxWidth: '1180px',
	margin: '0 auto',
	padding: '1.25rem 1.5rem',
	borderRadius: '24px',
	background: 'rgba(255, 250, 244, 0.65)',
	border: '1px solid rgba(255, 255, 255, 0.72)',
	display: 'flex',
	justifyContent: 'space-between',
	gap: '1rem',
	flexWrap: 'wrap',
	color: '#667686'
});

styles.addClass('footer-copy', {
	fontSize: '0.92rem',
	lineHeight: 1.5,
	maxWidth: '36rem'
});

styles.addClass('footer-links', {
	display: 'flex',
	alignItems: 'center',
	gap: '1rem',
	flexWrap: 'wrap'
});

styles.addClass('footer-link', {
	textDecoration: 'none',
	color: '#173447',
	fontWeight: 700,
	fontSize: '0.92rem'
});

styles.addPseudoClass('hover', {
	color: '#f45b48'
}, '.footer-link');

styles.addClass('todo-page', {
	maxWidth: '1180px',
	margin: '0 auto',
	display: 'flex',
	flexDirection: 'column',
	gap: '1.5rem'
});

styles.addClass('todo-panel', {
	position: 'relative',
	background: 'rgba(255, 250, 244, 0.82)',
	borderRadius: '30px',
	border: '1px solid rgba(255, 255, 255, 0.72)',
	boxShadow: '0 22px 48px rgba(23, 52, 71, 0.08)',
	backdropFilter: 'blur(18px)',
	padding: '1.5rem'
});

styles.addClass('todo-hero', {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
	gap: '1.25rem',
	alignItems: 'stretch'
});

styles.addClass('todo-hero-copy', {
	display: 'flex',
	flexDirection: 'column',
	gap: '1rem'
});

styles.addClass('todo-kicker', {
	display: 'inline-flex',
	alignItems: 'center',
	width: 'fit-content',
	padding: '0.45rem 0.85rem',
	borderRadius: '999px',
	background: 'rgba(244, 91, 72, 0.12)',
	color: '#b64031',
	fontWeight: 800,
	letterSpacing: '0.06em',
	fontSize: '0.75rem',
	textTransform: 'uppercase'
});

styles.addClass('todo-headline', {
	fontSize: 'clamp(2.3rem, 4vw, 4.4rem)',
	lineHeight: 0.96,
	color: '#173447',
	maxWidth: '10ch'
});

styles.addClass('todo-description', {
	fontSize: '1.02rem',
	lineHeight: 1.7,
	color: '#566879',
	maxWidth: '42rem'
});

styles.addClass('todo-hero-actions', {
	display: 'flex',
	gap: '0.85rem',
	flexWrap: 'wrap',
	alignItems: 'center'
});

styles.addClass('storage-tag', {
	display: 'inline-flex',
	alignItems: 'center',
	padding: '0.7rem 0.95rem',
	borderRadius: '999px',
	background: 'rgba(23, 52, 71, 0.06)',
	color: '#526575',
	fontWeight: 700,
	fontSize: '0.88rem'
});

styles.addClass('todo-hero-card', {
	background: 'linear-gradient(160deg, #173447 0%, #24556c 100%)',
	color: '#fffaf4',
	borderRadius: '28px',
	padding: '1.5rem',
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'space-between',
	minHeight: '100%'
});

styles.addClass('todo-hero-card-title', {
	fontSize: '1.3rem',
	marginBottom: '0.45rem',
	color: '#fffaf4'
});

styles.addClass('todo-hero-card-text', {
	fontSize: '0.95rem',
	lineHeight: 1.7,
	color: 'rgba(255, 250, 244, 0.82)',
	marginBottom: '1.25rem'
});

styles.addClass('hero-metrics', {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
	gap: '0.85rem'
});

styles.addClass('hero-metric', {
	padding: '0.9rem',
	borderRadius: '20px',
	background: 'rgba(255, 255, 255, 0.08)',
	display: 'flex',
	flexDirection: 'column',
	gap: '0.25rem'
});

styles.addClass('hero-metric-value', {
	fontSize: '1.5rem',
	fontWeight: 800,
	color: '#fffaf4'
});

styles.addClass('hero-metric-label', {
	fontSize: '0.85rem',
	color: 'rgba(255, 250, 244, 0.72)'
});

styles.addClass('todo-workspace', {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
	gap: '1.25rem'
});

styles.addClass('todo-section-title', {
	fontSize: '1.4rem',
	color: '#173447',
	marginBottom: '0.35rem'
});

styles.addClass('todo-section-copy', {
	color: '#6a7a88',
	fontSize: '0.95rem',
	lineHeight: 1.6,
	marginBottom: '1.2rem'
});

styles.addClass('todo-form', {
	display: 'flex',
	flexDirection: 'column',
	gap: '1rem'
});

styles.addClass('todo-field', {
	display: 'flex',
	flexDirection: 'column',
	gap: '0.45rem'
});

styles.addClass('todo-field-row', {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
	gap: '0.9rem'
});

styles.addClass('todo-label', {
	fontSize: '0.83rem',
	textTransform: 'uppercase',
	letterSpacing: '0.06em',
	fontWeight: 800,
	color: '#7a6c62'
});

styles.addClass('todo-input', {
	width: '100%',
	border: '1px solid rgba(23, 52, 71, 0.12)',
	background: '#fffaf4',
	color: '#173447',
	borderRadius: '18px',
	padding: '0.95rem 1rem',
	fontSize: '0.96rem',
	outline: 'none',
	boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)'
});

styles.addClass('todo-textarea', {
	minHeight: '120px',
	resize: 'vertical'
});

styles.addClass('todo-input:focus', {
	borderColor: 'rgba(244, 91, 72, 0.5)',
	boxShadow: '0 0 0 4px rgba(244, 91, 72, 0.12)'
});

styles.addClass('todo-submit-row', {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	gap: '1rem',
	flexWrap: 'wrap'
});

styles.addClass('todo-hint', {
	color: '#7a6c62',
	fontSize: '0.84rem',
	lineHeight: 1.5,
	maxWidth: '22rem'
});

styles.addClass('summary-grid', {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
	gap: '0.85rem',
	marginBottom: '1rem'
});

styles.addClass('summary-card', {
	padding: '1rem',
	borderRadius: '22px',
	background: 'rgba(23, 52, 71, 0.04)',
	border: '1px solid rgba(23, 52, 71, 0.05)',
	display: 'flex',
	flexDirection: 'column',
	gap: '0.25rem'
});

styles.addClass('summary-value', {
	fontSize: '1.55rem',
	fontWeight: 800,
	color: '#173447'
});

styles.addClass('summary-label', {
	fontSize: '0.84rem',
	color: '#677887'
});

styles.addClass('filter-label', {
	fontSize: '0.83rem',
	fontWeight: 800,
	color: '#7a6c62',
	textTransform: 'uppercase',
	letterSpacing: '0.06em',
	marginBottom: '0.6rem'
});

styles.addClass('filter-group', {
	display: 'flex',
	gap: '0.7rem',
	flexWrap: 'wrap'
});

styles.addClass('filter-chip', {
	border: '1px solid rgba(23, 52, 71, 0.1)',
	background: '#fffaf4',
	color: '#526575',
	borderRadius: '999px',
	padding: '0.7rem 0.95rem',
	fontSize: '0.88rem',
	fontWeight: 700,
	cursor: 'pointer',
	transition: 'background 0.2s ease, color 0.2s ease, transform 0.2s ease'
});

styles.addPseudoClass('hover', {
	transform: 'translateY(-1px)',
	background: 'rgba(23, 52, 71, 0.05)'
}, '.filter-chip');

styles.addClass('filter-chip-active', {
	color: '#fffaf4',
	background: '#173447',
	borderColor: '#173447'
});

styles.addClass('todo-banner', {
	borderRadius: '22px',
	padding: '0.9rem 1.1rem',
	fontWeight: 700,
	boxShadow: '0 10px 24px rgba(23, 52, 71, 0.06)'
});

styles.addClass('todo-banner-error', {
	background: 'rgba(244, 91, 72, 0.12)',
	color: '#b64031',
	border: '1px solid rgba(244, 91, 72, 0.18)'
});

styles.addClass('todo-banner-success', {
	background: 'rgba(63, 166, 138, 0.12)',
	color: '#1f7b63',
	border: '1px solid rgba(63, 166, 138, 0.2)'
});

styles.addClass('todo-board-toolbar', {
	display: 'flex',
	justifyContent: 'space-between',
	gap: '1rem',
	flexWrap: 'wrap',
	alignItems: 'center',
	marginBottom: '1.1rem'
});

styles.addClass('todo-search-wrap', {
	flex: 1,
	minWidth: '240px'
});

styles.addClass('todo-toolbar-actions', {
	display: 'flex',
	alignItems: 'center',
	gap: '0.75rem',
	flexWrap: 'wrap'
});

styles.addClass('todo-toolbar-note', {
	fontSize: '0.84rem',
	color: '#7a6c62'
});

styles.addClass('todo-list', {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
	gap: '1rem'
});

styles.addClass('todo-card', {
	background: '#fffaf4',
	borderRadius: '24px',
	border: '1px solid rgba(23, 52, 71, 0.08)',
	padding: '1rem',
	display: 'flex',
	flexDirection: 'column',
	gap: '1rem',
	transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
});

styles.addPseudoClass('hover', {
	transform: 'translateY(-2px)',
	borderColor: 'rgba(244, 91, 72, 0.18)',
	boxShadow: '0 16px 36px rgba(23, 52, 71, 0.08)'
}, '.todo-card');

styles.addClass('todo-card-done', {
	background: 'rgba(255, 250, 244, 0.74)',
	borderColor: 'rgba(23, 52, 71, 0.06)'
});

styles.addClass('todo-card-done .todo-card-title', {
	color: '#7f8b97',
	textDecoration: 'line-through'
});

styles.addClass('todo-card-done .todo-card-notes', {
	color: '#8f9aa5'
});

styles.addClass('todo-card-main', {
	display: 'flex',
	gap: '0.9rem',
	alignItems: 'flex-start'
});

styles.addClass('todo-check', {
	width: '2.15rem',
	height: '2.15rem',
	borderRadius: '999px',
	border: '1px solid rgba(23, 52, 71, 0.14)',
	background: '#fffaf4',
	color: '#173447',
	fontWeight: 800,
	fontSize: '0.82rem',
	cursor: 'pointer',
	flexShrink: 0
});

styles.addClass('todo-check-active', {
	background: '#1f7b63',
	borderColor: '#1f7b63',
	color: '#fffaf4'
});

styles.addClass('todo-card-copy', {
	display: 'flex',
	flexDirection: 'column',
	gap: '0.55rem',
	minWidth: 0,
	flex: 1
});

styles.addClass('todo-card-meta', {
	display: 'flex',
	justifyContent: 'space-between',
	gap: '0.75rem',
	alignItems: 'center',
	flexWrap: 'wrap'
});

styles.addClass('todo-priority', {
	display: 'inline-flex',
	alignItems: 'center',
	borderRadius: '999px',
	padding: '0.38rem 0.72rem',
	fontSize: '0.76rem',
	fontWeight: 800,
	textTransform: 'uppercase',
	letterSpacing: '0.05em'
});

styles.addClass('todo-priority-high', {
	color: '#b64031',
	background: 'rgba(244, 91, 72, 0.12)'
});

styles.addClass('todo-priority-medium', {
	color: '#9b6b12',
	background: 'rgba(255, 190, 92, 0.18)'
});

styles.addClass('todo-priority-low', {
	color: '#1f7b63',
	background: 'rgba(63, 166, 138, 0.14)'
});

styles.addClass('todo-date', {
	fontSize: '0.8rem',
	color: '#7a8792',
	fontWeight: 700
});

styles.addClass('todo-card-title', {
	fontSize: '1.08rem',
	lineHeight: 1.35,
	color: '#173447'
});

styles.addClass('todo-card-notes', {
	fontSize: '0.92rem',
	lineHeight: 1.6,
	color: '#607180'
});

styles.addClass('todo-card-notes-muted', {
	color: '#90a0aa'
});

styles.addClass('todo-card-actions', {
	display: 'flex',
	justifyContent: 'space-between',
	gap: '0.75rem',
	flexWrap: 'wrap'
});

styles.addClass('todo-empty', {
	padding: '2.5rem 1rem',
	textAlign: 'center',
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	gap: '0.65rem'
});

styles.addClass('todo-empty-mark', {
	width: '4rem',
	height: '4rem',
	borderRadius: '22px',
	background: 'rgba(23, 52, 71, 0.06)',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	color: '#173447',
	fontSize: '1.5rem',
	fontWeight: 800
});

styles.addClass('todo-empty-title', {
	fontSize: '1.1rem',
	color: '#173447'
});

styles.addClass('todo-empty-copy', {
	color: '#6f7f8b',
	maxWidth: '30rem',
	lineHeight: 1.6,
	fontSize: '0.94rem'
});

export function injectStyles() {
	styles.inject('todo-fullstack-styles');
}

export default styles;
