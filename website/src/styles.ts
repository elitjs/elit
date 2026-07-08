import { CreateStyle } from '@elitjs/style';

const cs = new CreateStyle();

// --- Theme variables (default: dark) ----------------------------------------
cs.addVar('color-bg', '#07080d');
cs.addVar('color-bg-rgb', '7, 8, 13');
cs.addVar('color-elev', '#0d1018');
cs.addVar('color-elev-rgb', '13, 16, 28');
cs.addVar('color-bg-glass', 'rgba(255, 255, 255, 0.025)');
cs.addVar('color-bg-glass-hover', 'rgba(255, 255, 255, 0.05)');
cs.addVar('color-bg-elev-glass', 'rgba(13, 16, 28, 0.6)');
cs.addVar('color-bg-elev-glass-strong', 'rgba(13, 16, 28, 0.85)');
cs.addVar('color-bg-elev-glass-light', 'rgba(13, 16, 28, 0.5)');
cs.addVar('color-bg-header', 'rgba(7, 8, 13, 0.7)');
cs.addVar('color-bg-subheader', 'rgba(255, 255, 255, 0.03)');
cs.addVar('color-bg-codeblock', 'rgba(13, 16, 28, 0.85)');
cs.addVar('color-bg-terminal', 'rgba(13, 16, 28, 0.7)');
cs.addVar('color-bg-playground', 'rgba(13, 16, 28, 0.6)');
cs.addVar('color-bg-footer', 'rgba(13, 16, 28, 0.5)');
cs.addVar('color-border', 'rgba(255, 255, 255, 0.08)');
cs.addVar('color-border-strong', 'rgba(255, 255, 255, 0.14)');
cs.addVar('color-text', '#f5f7fb');
cs.addVar('color-text-dim', '#a8b0c4');
cs.addVar('color-text-mute', '#6b748a');
cs.addVar('color-brand', '#a78bfa');
cs.addVar('color-brand-bright', '#c4b5fd');
cs.addVar('color-brand-dim', '#7c3aed');
cs.addVar('color-accent', '#22d3ee');
cs.addVar('color-accent-dim', '#0891b2');
cs.addVar('color-green', '#34d399');
cs.addVar('color-yellow', '#fbbf24');
cs.addVar('color-pink', '#f472b6');
cs.addVar('color-orange', '#fb923c');
cs.addVar('color-shadow-orb-1', 'radial-gradient(circle, #7c3aed 0%, transparent 70%)');
cs.addVar('color-shadow-orb-2', 'radial-gradient(circle, #0891b2 0%, transparent 70%)');
cs.addVar('color-shadow-brand', 'rgba(124, 58, 237, 0.35)');
cs.addVar('color-shadow-brand-strong', 'rgba(124, 58, 237, 0.5)');
cs.addVar('color-shadow-brand-soft', 'rgba(124, 58, 237, 0.3)');
cs.addVar('color-selection-bg', 'rgba(167, 139, 250, 0.35)');

// --- Light theme overrides ---------------------------------------------------
cs.add({
    '[data-theme="light"]': {
        '--color-bg': '#fafafb',
        '--color-bg-rgb': '250, 250, 251',
        '--color-elev': '#ffffff',
        '--color-elev-rgb': '255, 255, 255',
        '--color-bg-glass': 'rgba(0, 0, 0, 0.025)',
        '--color-bg-glass-hover': 'rgba(0, 0, 0, 0.05)',
        '--color-bg-elev-glass': 'rgba(255, 255, 255, 0.7)',
        '--color-bg-elev-glass-strong': 'rgba(255, 255, 255, 0.92)',
        '--color-bg-elev-glass-light': 'rgba(255, 255, 255, 0.5)',
        '--color-bg-header': 'rgba(250, 250, 251, 0.8)',
        '--color-bg-subheader': 'rgba(0, 0, 0, 0.025)',
        '--color-bg-codeblock': 'rgba(247, 248, 250, 0.9)',
        '--color-bg-terminal': 'rgba(247, 248, 250, 0.8)',
        '--color-bg-playground': 'rgba(247, 248, 250, 0.6)',
        '--color-bg-footer': 'rgba(247, 248, 250, 0.6)',
        '--color-border': 'rgba(0, 0, 0, 0.08)',
        '--color-border-strong': 'rgba(0, 0, 0, 0.14)',
        '--color-text': '#0f1115',
        '--color-text-dim': '#4a5168',
        '--color-text-mute': '#6c7086',
        '--color-brand': '#7c3aed',
        '--color-brand-bright': '#6d28d9',
        '--color-brand-dim': '#a78bfa',
        '--color-accent': '#0891b2',
        '--color-accent-dim': '#22d3ee',
        '--color-shadow-orb-1': 'radial-gradient(circle, rgba(124, 58, 237, 0.25) 0%, transparent 70%)',
        '--color-shadow-orb-2': 'radial-gradient(circle, rgba(8, 145, 178, 0.2) 0%, transparent 70%)',
        '--color-shadow-brand': 'rgba(124, 58, 237, 0.25)',
        '--color-shadow-brand-strong': 'rgba(124, 58, 237, 0.4)',
        '--color-shadow-brand-soft': 'rgba(124, 58, 237, 0.2)',
        '--color-selection-bg': 'rgba(124, 58, 237, 0.25)',
    },
});

// --- Base styles -------------------------------------------------------------
cs.add({
    'html, body': {
        margin: 0,
        padding: 0,
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
        fontSize: '15px',
        lineHeight: '1.6',
        fontFeatureSettings: '"cv11", "ss01", "ss03"',
        '-webkit-font-smoothing': 'antialiased',
        '-moz-osx-font-smoothing': 'grayscale',
        scrollBehavior: 'smooth',
        overflowX: 'hidden',
        transition: 'background 200ms ease, color 200ms ease',
    },
    'body::before, body::after': {
        content: '""',
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '0',
        borderRadius: '50%',
        filter: 'blur(120px)',
        opacity: '0.5',
    },
    'body::before': {
        top: '-200px',
        left: '-150px',
        width: '600px',
        height: '600px',
        background: 'var(--color-shadow-orb-1)',
        animation: 'orb1 22s ease-in-out infinite',
    },
    'body::after': {
        top: '200px',
        right: '-200px',
        width: '700px',
        height: '700px',
        background: 'var(--color-shadow-orb-2)',
        animation: 'orb2 28s ease-in-out infinite',
    },
    '#app': { position: 'relative', zIndex: '1' },
    'a': {
        color: 'var(--color-brand)',
        textDecoration: 'none',
        transition: 'color 150ms ease',
    },
    'a:hover': { color: 'var(--color-accent)' },
    'code, pre': {
        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
    },
    '::selection': {
        background: 'var(--color-selection-bg)',
        color: 'var(--color-text)',
    },
    'h1, h2, h3, h4': {
        margin: '0 0 0.4em',
        lineHeight: '1.15',
        fontWeight: '700',
        letterSpacing: '-0.025em',
    },
    'h1': { fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '800', letterSpacing: '-0.04em' },
    'h2': { fontSize: 'clamp(26px, 3.5vw, 38px)' },
    'h3': { fontSize: '18px' },
    'p': { margin: '0 0 1em' },
});

// --- Layout ------------------------------------------------------------------
cs.add({
    '.container': { maxWidth: '1140px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: '1' },
    '.section': { padding: '96px 24px', maxWidth: '1140px', margin: '0 auto', position: 'relative', zIndex: '1' },
    '.section-head': { textAlign: 'center', marginBottom: '56px' },
    '.section-label': {
        display: 'inline-block',
        color: 'var(--color-brand)',
        fontSize: '12px',
        fontWeight: '600',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '14px',
        padding: '4px 12px',
        background: 'var(--color-bg-glass)',
        border: '1px solid var(--color-border)',
        borderRadius: '999px',
    },
    '.section-subtitle': {
        color: 'var(--color-text-dim)',
        fontSize: '17px',
        maxWidth: '580px',
        margin: '16px auto 0',
    },
});

// --- Header ------------------------------------------------------------------
cs.add({
    '.header': {
        position: 'sticky',
        top: '0',
        zIndex: '50',
        backdropFilter: 'blur(20px) saturate(180%)',
        '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
        background: 'var(--color-bg-header)',
        borderBottom: '1px solid var(--color-border)',
    },
    '.header-inner': {
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
    },
    '.brand': {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        color: 'var(--color-text)',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        fontSize: '18px',
    },
    '.brand-dot': {
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-bg)',
        fontWeight: '800',
        fontSize: '16px',
        boxShadow: '0 4px 20px var(--color-shadow-brand)',
    },
    '.brand-dot img': { width: '22px', height: '22px', borderRadius: '4px', display: 'block' },
    '.nav': { display: 'flex', gap: '4px', alignItems: 'center' },
    '.nav-link': {
        color: 'var(--color-text-dim)',
        fontSize: '14px',
        fontWeight: '500',
        padding: '8px 14px',
        borderRadius: '8px',
        transition: 'color 150ms ease, background 150ms ease',
    },
    '.nav-link:hover': { color: 'var(--color-text)', background: 'var(--color-bg-glass)' },
    '.theme-toggle': {
        background: 'var(--color-bg-glass)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-dim)',
        width: '34px',
        height: '34px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        lineHeight: '1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 150ms ease, background 150ms ease, border-color 150ms ease',
        marginLeft: '4px',
    },
    '.theme-toggle:hover': {
        color: 'var(--color-text)',
        background: 'var(--color-bg-glass-hover)',
        borderColor: 'var(--color-border-strong)',
    },
    '.cta-primary': {
        background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-dim) 100%)',
        color: 'white',
        padding: '9px 18px',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '13px',
        boxShadow: '0 4px 20px var(--color-shadow-brand), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        marginLeft: '8px',
    },
    '.cta-primary:hover': {
        transform: 'translateY(-1px)',
        boxShadow: '0 8px 30px var(--color-shadow-brand-strong), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        color: 'white',
    },
});

// --- Hero --------------------------------------------------------------------
cs.add({
    '.hero': {
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '120px 24px 80px',
        textAlign: 'center',
        position: 'relative',
    },
    '.hero-eyebrow': {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '999px',
        background: 'var(--color-bg-glass)',
        border: '1px solid var(--color-border-strong)',
        color: 'var(--color-text-dim)',
        fontSize: '12px',
        letterSpacing: '0.06em',
        marginBottom: '28px',
        backdropFilter: 'blur(10px)',
    },
    '.hero-eyebrow .dot': {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'var(--color-green)',
        boxShadow: '0 0 8px var(--color-green)',
        animation: 'pulse 2s ease-in-out infinite',
    },
    '.hero-eyebrow strong': { color: 'var(--color-brand-bright)', fontWeight: '600' },
    '.hero-title': {
        background: 'linear-gradient(180deg, var(--color-text) 0%, var(--color-text-dim) 130%)',
        '-webkit-background-clip': 'text',
        backgroundClip: 'text',
        '-webkit-text-fill-color': 'transparent',
        marginBottom: '24px',
        maxWidth: '900px',
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    '.hero-title .accent': {
        background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 50%, var(--color-pink) 100%)',
        '-webkit-background-clip': 'text',
        backgroundClip: 'text',
        '-webkit-text-fill-color': 'transparent',
    },
    '.hero-lead': {
        color: 'var(--color-text-dim)',
        fontSize: '20px',
        lineHeight: '1.5',
        maxWidth: '680px',
        margin: '0 auto 40px',
        fontWeight: '400',
    },
    '.hero-actions': { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
    '.btn-primary': {
        background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-dim) 100%)',
        color: 'white',
        padding: '14px 28px',
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '15px',
        boxShadow: '0 8px 32px var(--color-shadow-brand-strong), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
    },
    '.btn-primary:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 12px 40px var(--color-shadow-brand-strong), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        color: 'white',
    },
    '.btn-secondary': {
        background: 'var(--color-bg-glass)',
        backdropFilter: 'blur(10px)',
        color: 'var(--color-text)',
        padding: '14px 28px',
        borderRadius: '10px',
        border: '1px solid var(--color-border-strong)',
        fontWeight: '500',
        fontSize: '15px',
        transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
    },
    '.btn-secondary:hover': {
        borderColor: 'var(--color-brand)',
        background: 'var(--color-bg-glass-hover)',
        transform: 'translateY(-2px)',
        color: 'var(--color-text)',
    },
});

// --- Hero stats --------------------------------------------------------------
cs.add({
    '.hero-stats': { display: 'flex', gap: '32px', justifyContent: 'center', marginTop: '64px', flexWrap: 'wrap' },
    '.hero-stat': { textAlign: 'center' },
    '.hero-stat-num': {
        fontSize: '28px',
        fontWeight: '700',
        background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)',
        '-webkit-background-clip': 'text',
        backgroundClip: 'text',
        '-webkit-text-fill-color': 'transparent',
        letterSpacing: '-0.02em',
    },
    '.hero-stat-label': {
        color: 'var(--color-text-mute)',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginTop: '4px',
    },
});

// --- Terminal ----------------------------------------------------------------
cs.add({
    '.terminal': {
        maxWidth: '720px',
        margin: '56px auto 0',
        background: 'var(--color-bg-terminal)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        textAlign: 'left',
    },
    '.terminal-header': {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: 'var(--color-bg-subheader)',
        borderBottom: '1px solid var(--color-border)',
    },
    '.terminal-dot': { width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block' },
    '.terminal-dot.red': { background: '#ff5f57' },
    '.terminal-dot.yellow': { background: '#febc2e' },
    '.terminal-dot.green': { background: '#28c840' },
    '.terminal-title': {
        flex: '1',
        textAlign: 'center',
        color: 'var(--color-text-mute)',
        fontSize: '12px',
        fontFamily: '"JetBrains Mono", monospace',
    },
    '.terminal-body': {
        padding: '24px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px',
        lineHeight: '1.7',
        color: 'var(--color-text-dim)',
    },
    '.terminal-body .prompt': { color: 'var(--color-green)', userSelect: 'none' },
    '.terminal-body .cmd': { color: 'var(--color-text)' },
    '.terminal-body .out': { color: 'var(--color-text-mute)' },
    '.terminal-body .kw': { color: 'var(--color-brand)' },
    '.terminal-body .str': { color: 'var(--color-green)' },
    '.terminal-body .num': { color: 'var(--color-yellow)' },
    '.terminal-body .fn': { color: 'var(--color-accent)' },
});

// --- Feature grid ------------------------------------------------------------
cs.add({
    '.features-grid': {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
    },
    '.feature-card': {
        background: 'var(--color-bg-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border)',
        padding: '28px 24px',
        borderRadius: '16px',
        transition: 'border-color 200ms ease, transform 200ms ease, background 200ms ease',
        position: 'relative',
        overflow: 'hidden',
    },
    '.feature-card::before': {
        content: '""',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--color-brand) 50%, transparent)',
        opacity: '0',
        transition: 'opacity 200ms ease',
    },
    '.feature-card:hover': {
        borderColor: 'var(--color-border-strong)',
        background: 'var(--color-bg-glass-hover)',
        transform: 'translateY(-3px)',
    },
    '.feature-card:hover::before': { opacity: '1' },
    '.feature-icon': {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, var(--color-brand-dim), var(--color-accent-dim))',
        color: 'white',
        fontSize: '20px',
        marginBottom: '16px',
        boxShadow: '0 8px 24px var(--color-shadow-brand-soft)',
    },
    '.feature-title': { fontSize: '16px', marginBottom: '8px', fontWeight: '600' },
    '.feature-desc': { color: 'var(--color-text-dim)', fontSize: '14px', margin: '0', lineHeight: '1.55' },
});

// --- Two-col / install box ---------------------------------------------------
cs.add({
    '.two-col': { display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '48px', alignItems: 'center' },
    '.two-col-text h2': { marginBottom: '16px' },
    '.two-col-text p': { color: 'var(--color-text-dim)', fontSize: '16px', lineHeight: '1.65' },
    '.install-box': {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--color-bg-glass)',
        border: '1px solid var(--color-border-strong)',
        padding: '8px 8px 8px 16px',
        borderRadius: '10px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px',
        color: 'var(--color-text)',
        margin: '8px 0 24px',
    },
    '.install-box .dollar': { color: 'var(--color-green)', userSelect: 'none' },
    '.install-box .pkg': { color: 'var(--color-accent)' },
    '.install-box .copy-btn': {
        background: 'var(--color-bg-glass-hover)',
        border: 'none',
        color: 'var(--color-text-dim)',
        padding: '6px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: 'inherit',
        transition: 'background 150ms ease, color 150ms ease',
    },
    '.install-box .copy-btn:hover': { background: 'var(--color-brand)', color: 'white' },
});

// --- Packages ----------------------------------------------------------------
cs.add({
    '.pkg-category': {
        color: 'var(--color-text-mute)',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        margin: '32px 0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    '.pkg-category::after': {
        content: '""',
        flex: '1',
        height: '1px',
        background: 'linear-gradient(90deg, var(--color-border), transparent)',
    },
    '.pkg-category:first-child': { marginTop: '0' },
    '.pkg-grid': {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px',
    },
    '.pkg-card': {
        background: 'var(--color-bg-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border)',
        padding: '16px 18px',
        borderRadius: '12px',
        transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
    },
    '.pkg-card:hover': {
        borderColor: 'var(--color-border-strong)',
        background: 'var(--color-bg-glass-hover)',
        transform: 'translateY(-1px)',
    },
    '.pkg-name': {
        color: 'var(--color-brand-bright)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px',
        fontWeight: '600',
    },
    '.pkg-desc': { color: 'var(--color-text-dim)', fontSize: '13px', marginTop: '6px', lineHeight: '1.5' },
});

// --- Code block --------------------------------------------------------------
cs.add({
    '.code-block': {
        background: 'var(--color-bg-codeblock)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '16px 0',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
    },
    '.code-header': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--color-bg-subheader)',
        borderBottom: '1px solid var(--color-border)',
    },
    '.code-header-left': { display: 'flex', alignItems: 'center', gap: '12px' },
    '.code-dots': { display: 'flex', gap: '6px' },
    '.code-dot': { width: '11px', height: '11px', borderRadius: '50%' },
    '.code-dot.red': { background: '#ff5f57' },
    '.code-dot.yellow': { background: '#febc2e' },
    '.code-dot.green': { background: '#28c840' },
    '.code-label': {
        color: 'var(--color-text-mute)',
        fontSize: '11px',
        fontFamily: '"JetBrains Mono", monospace',
        textTransform: 'lowercase',
        letterSpacing: '0.04em',
    },
    '.code-copy': {
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-dim)',
        padding: '4px 10px',
        borderRadius: '6px',
        fontFamily: 'inherit',
        fontSize: '11px',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        cursor: 'pointer',
        transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
    },
    '.code-copy:hover': {
        background: 'var(--color-brand)',
        color: 'white',
        borderColor: 'var(--color-brand)',
    },
    '.code-copy.copied': {
        background: 'var(--color-green)',
        color: 'var(--color-bg)',
        borderColor: 'var(--color-green)',
    },
    '.code-block pre': {
        margin: '0',
        padding: '16px 18px',
        background: 'transparent',
        border: 'none',
        overflow: 'auto',
        maxHeight: '360px',
    },
    '.code-block code': {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px',
        lineHeight: '1.65',
        color: 'var(--color-text)',
    },
    '.code-label-standalone': {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: 'var(--color-text-mute)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '4px',
    },
});

// --- Docs --------------------------------------------------------------------
cs.add({
    '.docs-layout': {
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: '48px',
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '48px 24px',
    },
    '.docs-sidebar': { position: 'sticky', top: '96px', alignSelf: 'start' },
    '.docs-sidebar h4': {
        color: 'var(--color-text-mute)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        margin: '24px 0 10px',
        fontWeight: '600',
    },
    '.docs-sidebar h4:first-child': { marginTop: '0' },
    '.docs-sidebar a': {
        display: 'block',
        color: 'var(--color-text-dim)',
        padding: '6px 12px',
        fontSize: '14px',
        borderRadius: '6px',
        marginLeft: '-12px',
        transition: 'color 150ms ease, background 150ms ease',
    },
    '.docs-sidebar a:hover, .docs-sidebar a.active': {
        color: 'var(--color-text)',
        background: 'var(--color-bg-glass)',
    },
    '.docs-content': { maxWidth: '760px' },
    '.docs-content h1': { fontSize: '36px', marginBottom: '12px' },
    '.docs-content h2': {
        fontSize: '24px',
        marginTop: '40px',
        paddingTop: '24px',
        borderTop: '1px solid var(--color-border)',
    },
    '.docs-content h2:first-of-type': { borderTop: 'none', paddingTop: '0' },
    '.docs-content h3': { fontSize: '18px', marginTop: '28px' },
    '.docs-content p': { color: 'var(--color-text-dim)', fontSize: '15px', lineHeight: '1.7' },
    '.docs-content p strong': { color: 'var(--color-text)', fontWeight: '600' },
});

// --- Playground --------------------------------------------------------------
cs.add({
    '.playground-layout': {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0',
        height: 'calc(100vh - 61px)',
    },
    '.playground-editor': {
        background: 'var(--color-bg-playground)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
    },
    '.playground-preview': { background: 'white' },
    '.playground-toolbar': {
        padding: '10px 14px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: 'var(--color-text-dim)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '12px',
        background: 'var(--color-bg-subheader)',
    },
    '.playground-toolbar .file-name': { color: 'var(--color-text-dim)' },
    '.playground-run': {
        background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-dim) 100%)',
        color: 'white',
        border: 'none',
        padding: '6px 14px',
        borderRadius: '6px',
        fontWeight: '600',
        fontSize: '12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        boxShadow: '0 4px 12px var(--color-shadow-brand-soft)',
        transition: 'transform 150ms ease',
    },
    '.playground-run:hover': { transform: 'translateY(-1px)' },
    '.playground-editor-container': { position: 'relative', flex: '1', overflow: 'hidden' },
    '.playground-highlight': {
        position: 'absolute',
        inset: '0',
        margin: '0',
        padding: '16px 18px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px',
        lineHeight: '1.65',
        color: 'var(--color-text)',
        background: 'transparent',
        border: 'none',
        pointerEvents: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre',
        tabSize: '4',
    },
    '.playground-textarea': {
        position: 'absolute',
        inset: '0',
        margin: '0',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'transparent',
        caretColor: 'var(--color-text)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px',
        padding: '16px 18px',
        resize: 'none',
        lineHeight: '1.65',
        whiteSpace: 'pre',
        overflow: 'auto',
        tabSize: '4',
    },
});

// --- Examples ----------------------------------------------------------------
cs.add({
    '.examples-grid': {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
        alignItems: 'start',
    },
    '.example-card': {
        background: 'var(--color-bg-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border)',
        padding: '0',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'border-color 200ms ease, transform 200ms ease',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
    },
    '.example-card:hover': {
        borderColor: 'var(--color-border-strong)',
        transform: 'translateY(-3px)',
    },
    '.example-preview': {
        background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(34, 211, 238, 0.05) 100%)',
        padding: '32px 20px',
        minHeight: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid var(--color-border)',
    },
    '.example-info': { padding: '20px 22px 0' },
    '.example-title': { fontSize: '16px', marginBottom: '6px', fontWeight: '600' },
    '.example-desc': { color: 'var(--color-text-dim)', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.55' },
    '.example-code': { padding: '0 22px 22px' },
    '.example-code .code-block': { margin: '0' },
});

// --- Footer ------------------------------------------------------------------
cs.add({
    '.footer': {
        marginTop: '80px',
        padding: '56px 24px 32px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg-footer)',
        backdropFilter: 'blur(20px)',
    },
    '.footer-inner': {
        maxWidth: '1140px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '40px',
        color: 'var(--color-text-dim)',
        fontSize: '14px',
    },
    '.footer-brand-row': {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: 'var(--color-text)',
        fontWeight: '700',
        marginBottom: '12px',
        fontSize: '17px',
    },
    '.footer-brand-sub': {
        maxWidth: '320px',
        lineHeight: '1.6',
        color: 'var(--color-text-dim)',
        fontSize: '14px',
    },
    '.footer-col-title': {
        color: 'var(--color-text)',
        fontWeight: '600',
        marginBottom: '14px',
        fontSize: '13px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
    },
    '.footer-list': {
        listStyle: 'none',
        padding: '0',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    '.footer-link': { color: 'var(--color-text-dim)', fontSize: '14px' },
    '.footer-link:hover': { color: 'var(--color-brand)' },
    '.footer-copy': {
        maxWidth: '1140px',
        margin: '40px auto 0',
        paddingTop: '24px',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text-mute)',
        fontSize: '13px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
    },
});

// --- Keyframes ---------------------------------------------------------------
cs.keyframe('orb1', {
    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
    '50%': { transform: 'translate(100px, 80px) scale(1.1)' },
});
cs.keyframe('orb2', {
    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
    '50%': { transform: 'translate(-120px, 100px) scale(0.9)' },
});
cs.keyframe('pulse', {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.4' },
});

// --- Responsive --------------------------------------------------------------
cs.media('screen', 'max-width: 900px', {
    '.two-col': { gridTemplateColumns: '1fr', gap: '32px' },
});
cs.media('screen', 'max-width: 768px', {
    '.nav-link': { display: 'none' },
    '.nav .cta-primary': { display: 'inline-flex' },
    '.nav .theme-toggle': { display: 'inline-flex' },
    '.docs-layout': { gridTemplateColumns: '1fr', gap: '24px' },
    '.docs-sidebar': { position: 'static' },
    '.playground-layout': { gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr', height: 'auto' },
    '.playground-editor': { borderRight: 'none', borderBottom: '1px solid var(--color-border)' },
    '.footer-inner': { gridTemplateColumns: '1fr 1fr', gap: '32px' },
    '.hero': { padding: '80px 24px 60px' },
    '.section': { padding: '64px 24px' },
    '.hero-stats': { gap: '20px' },
    '.terminal': { display: 'none' },
});

let injected = false;

export const injectGlobalStyles = (): void => {
    if (injected) return;
    if (typeof document === 'undefined') return;
    const styleEl = cs.inject();
    styleEl.setAttribute('data-elit-website', 'global');
    injected = true;
};
