import styles from '@elitjs/style';

styles.addTag('*', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
});

styles.addTag('body', {
  fontFamily: 'Aptos, Trebuchet MS, Segoe UI, sans-serif',
  background: 'radial-gradient(circle at top, #f4efe6 0%, #d8e4ea 38%, #6b7e87 100%)',
  color: '#1f2a30',
  minHeight: '100vh',
});

styles.addClass('webmail-app', {
  minHeight: '100vh',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
});

styles.addClass('hero', {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '22px 24px',
  borderRadius: '24px',
  background: 'linear-gradient(135deg, rgba(255, 250, 244, 0.92), rgba(232, 244, 245, 0.9))',
  border: '1px solid rgba(57, 86, 92, 0.12)',
  boxShadow: '0 18px 40px rgba(38, 57, 64, 0.14)',
});

styles.addClass('eyebrow', {
  fontSize: '0.72rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#6e5b46',
  marginBottom: '8px',
});

styles.addClass('headline', {
  fontFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
  fontSize: '2.4rem',
  lineHeight: 1.05,
  maxWidth: '640px',
  color: '#1d3640',
  marginBottom: '10px',
});

styles.addClass('subhead', {
  maxWidth: '680px',
  color: '#496069',
  lineHeight: 1.65,
});

styles.addClass('hero-actions', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  alignItems: 'flex-start',
  justifyContent: 'flex-end',
});

styles.addClass('layout', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '18px',
  alignItems: 'stretch',
});

styles.addClass('panel', {
  background: 'rgba(255, 249, 242, 0.9)',
  borderRadius: '24px',
  padding: '18px',
  border: '1px solid rgba(57, 86, 92, 0.12)',
  boxShadow: '0 18px 40px rgba(30, 48, 54, 0.12)',
});

styles.addClass('sidebar', {
  width: '260px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  flexShrink: 0,
});

styles.addClass('list-panel', {
  width: '360px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  flexShrink: 0,
});

styles.addClass('preview-panel', {
  flex: 1,
  minWidth: '300px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
});

styles.addClass('panel-title', {
  fontFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
  fontSize: '1.25rem',
  color: '#223841',
  marginBottom: '6px',
});

styles.addClass('panel-copy', {
  color: '#58717a',
  fontSize: '0.95rem',
  lineHeight: 1.5,
});

styles.addClass('smtp-box', {
  marginTop: '8px',
  padding: '12px 14px',
  borderRadius: '16px',
  background: 'rgba(33, 74, 84, 0.08)',
  color: '#214a54',
  lineHeight: 1.5,
});

styles.addClass('mailbox-button', {
  width: '100%',
  border: '1px solid rgba(57, 86, 92, 0.12)',
  background: 'rgba(255, 255, 255, 0.65)',
  borderRadius: '16px',
  padding: '14px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  color: '#29444d',
  fontSize: '0.98rem',
  textAlign: 'left',
});

styles.addClass('mailbox-button-active', {
  background: 'linear-gradient(135deg, #c76943, #df9c63)',
  color: '#fffaf4',
  border: '1px solid rgba(145, 72, 44, 0.24)',
});

styles.addClass('mailbox-count', {
  minWidth: '34px',
  height: '34px',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(34, 56, 65, 0.08)',
  fontSize: '0.9rem',
});

styles.addClass('mailbox-button-active-count', {
  background: 'rgba(255, 250, 244, 0.2)',
});

styles.addClass('toolbar', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  justifyContent: 'space-between',
  alignItems: 'center',
});

styles.addClass('toolbar-actions', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
});

styles.addClass('field', {
  width: '100%',
  border: '1px solid rgba(57, 86, 92, 0.16)',
  borderRadius: '14px',
  padding: '12px 14px',
  background: 'rgba(255, 255, 255, 0.78)',
  color: '#1f2a30',
  fontSize: '0.98rem',
});

styles.addClass('message-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

styles.addClass('message-item', {
  width: '100%',
  padding: '14px',
  borderRadius: '18px',
  border: '1px solid rgba(57, 86, 92, 0.12)',
  background: 'rgba(255, 255, 255, 0.65)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  textAlign: 'left',
});

styles.addClass('message-item-active', {
  background: 'rgba(215, 233, 235, 0.95)',
  border: '1px solid rgba(48, 94, 105, 0.22)',
});

styles.addClass('message-meta', {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  color: '#5d747c',
  fontSize: '0.86rem',
});

styles.addClass('message-subject', {
  fontWeight: 700,
  color: '#233942',
});

styles.addClass('message-snippet', {
  color: '#567079',
  lineHeight: 1.45,
});

styles.addClass('unread-dot', {
  width: '10px',
  height: '10px',
  borderRadius: '999px',
  background: '#c76943',
  display: 'inline-block',
  marginRight: '8px',
});

styles.addClass('preview-header', {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: '10px',
  paddingBottom: '12px',
  borderBottom: '1px solid rgba(57, 86, 92, 0.12)',
});

styles.addClass('preview-subject', {
  fontFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
  fontSize: '1.6rem',
  color: '#213841',
});

styles.addClass('preview-body', {
  whiteSpace: 'pre-wrap',
  lineHeight: 1.7,
  color: '#334c55',
  fontSize: '0.98rem',
});

styles.addClass('placeholder', {
  color: '#6a8087',
  lineHeight: 1.6,
  padding: '20px 0',
});

styles.addClass('pill', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 10px',
  borderRadius: '999px',
  background: 'rgba(199, 105, 67, 0.12)',
  color: '#8e4b32',
  fontSize: '0.82rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
});

styles.addClass('action-button', {
  border: 'none',
  borderRadius: '999px',
  padding: '11px 16px',
  cursor: 'pointer',
  fontSize: '0.96rem',
  fontWeight: 700,
});

styles.addClass('action-primary', {
  background: 'linear-gradient(135deg, #1e5f67, #4e8a86)',
  color: '#f9f5ef',
});

styles.addClass('action-secondary', {
  background: 'rgba(34, 56, 65, 0.08)',
  color: '#29444d',
});

styles.addClass('notice', {
  padding: '12px 14px',
  borderRadius: '14px',
  background: 'rgba(50, 120, 98, 0.12)',
  color: '#1f5d4a',
  lineHeight: 1.5,
});

styles.addClass('error', {
  padding: '12px 14px',
  borderRadius: '14px',
  background: 'rgba(180, 70, 60, 0.12)',
  color: '#8a3229',
  lineHeight: 1.5,
});

styles.addClass('compose-panel', {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

styles.addClass('compose-grid', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
});

styles.addClass('compose-half', {
  flex: 1,
  minWidth: '220px',
});

styles.addClass('compose-actions', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  justifyContent: 'flex-end',
});

styles.addClass('register-panel', {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

styles.addClass('account-list', {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

styles.addClass('account-item', {
  padding: '10px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(57, 86, 92, 0.12)',
  background: 'rgba(255, 255, 255, 0.7)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

styles.addClass('account-avatar', {
  width: '36px',
  height: '36px',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #1e5f67, #4e8a86)',
  color: '#f0f8f8',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '1rem',
  flexShrink: 0,
});

styles.addClass('account-info', {
  flex: 1,
});

styles.addClass('account-email', {
  fontWeight: 700,
  color: '#223841',
  fontSize: '0.95rem',
});

styles.addClass('account-name', {
  color: '#58717a',
  fontSize: '0.86rem',
  marginTop: '2px',
});

styles.addClass('account-default-badge', {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 9px',
  borderRadius: '999px',
  background: 'rgba(199, 105, 67, 0.12)',
  color: '#8e4b32',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  flexShrink: 0,
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-1px)',
  boxShadow: '0 10px 24px rgba(38, 57, 64, 0.12)',
}, '.message-item');

styles.addPseudoClass('hover', {
  filter: 'brightness(1.02)',
}, '.action-primary');

styles.addPseudoClass('hover', {
  background: 'rgba(34, 56, 65, 0.12)',
}, '.action-secondary');

styles.inject('webmail-example-styles');

export default styles;