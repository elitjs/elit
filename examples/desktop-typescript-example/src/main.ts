import { renderToString } from '@elitjs/dom';
import { button, code, div, h1, li, p, strong, ul } from '@elitjs/el';
import { createWindow, onMessage, windowQuit, windowSetTitle } from '@elitjs/desktop';

const APP_TITLE = 'Elit Desktop TypeScript Example';
const shouldAutoClose = typeof process !== 'undefined' && process.env?.ELIT_DESKTOP_AUTO_CLOSE === '1';

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #fff7ed 0%, #fffbeb 50%, #ecfeff 100%)',
  color: '#111827',
  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  padding: '32px',
};

const shellStyle = {
  maxWidth: '960px',
  margin: '0 auto',
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  borderRadius: '28px',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.12)',
  padding: '32px',
};

const eyebrowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: '#111827',
  color: '#f8fafc',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.08em',
  padding: '8px 12px',
  textTransform: 'uppercase',
};

const gridStyle = {
  display: 'grid',
  gap: '18px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginTop: '24px',
};

const panelStyle = {
  background: '#fffdf8',
  border: '1px solid rgba(245, 158, 11, 0.22)',
  borderRadius: '20px',
  padding: '20px',
};

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginTop: '20px',
};

const buttonBaseStyle = {
  border: 'none',
  borderRadius: '14px',
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: '700',
  padding: '12px 16px',
  transition: 'transform 120ms ease, opacity 120ms ease',
};

function createActionButton(label: string, message: string, accent: string) {
  return button(
    {
      'data-desktop-message': message,
      style: {
        ...buttonBaseStyle,
        background: accent,
        cursor: 'pointer',
        opacity: '1',
      },
      type: 'button',
    },
    label,
  );
}

const desktopActions = div(
  { style: buttonRowStyle },
  createActionButton('Ping native shell', 'desktop:ping', '#fde68a'),
  createActionButton('Show docs state', 'desktop:docs', '#bfdbfe'),
  createActionButton('Reset title', 'desktop:reset', '#fecaca'),
  createActionButton('Quit window', 'desktop:quit', '#c7d2fe'),
);

const app = div(
  { style: pageStyle },
  div(
    { style: shellStyle },
    div({ style: eyebrowStyle }, 'Elit', code('surface: desktop')),
    h1(
      {
        style: {
          fontSize: '44px',
          lineHeight: '1.05',
          margin: '18px 0 12px',
        },
      },
      'Desktop repo example with one TypeScript entry',
    ),
    p(
      {
        style: {
          fontSize: '18px',
          lineHeight: '1.7',
          margin: '0 0 10px',
          maxWidth: '760px',
        },
      },
      'This project uses public Elit APIs only. The same ',
      code('src/main.ts'),
      ' file renders the UI into an HTML string, then opens it in the desktop shell with native message handling.',
    ),
    desktopActions,
    div(
      { style: gridStyle },
      div(
        { style: panelStyle },
        strong('How to run'),
        ul(
          {
            style: {
              margin: '14px 0 0',
              paddingLeft: '20px',
              lineHeight: '1.8',
            },
          },
          li(code('npm install')),
          li(code('npm run desktop:run')),
          li(code('npm run desktop:build')),
          li(code('$env:ELIT_DESKTOP_AUTO_CLOSE = 1; npm run desktop:run')),
        ),
      ),
      div(
        { style: panelStyle },
        strong('What to inspect'),
        ul(
          {
            style: {
              margin: '14px 0 0',
              paddingLeft: '20px',
              lineHeight: '1.8',
            },
          },
          li('Window title changes after the ping action.'),
          li('The docs button swaps the title to a second state.'),
          li('The same TypeScript file owns markup and desktop behavior.'),
        ),
      ),
    ),
    p(
      {
        style: {
          marginTop: '24px',
          padding: '16px 18px',
          background: '#eff6ff',
          border: '1px solid rgba(59, 130, 246, 0.18)',
          borderRadius: '16px',
          lineHeight: '1.7',
        },
      },
      'This example stays intentionally small: Elit builds the UI tree, ',
      code('renderToString(...)'),
      ' serializes it, and the desktop runtime handles the native window lifecycle.',
    ),
  ),
);

onMessage((message) => {
  if (message === 'desktop:ready') {
    windowSetTitle(APP_TITLE);

    if (shouldAutoClose) {
      windowQuit();
    }

    return;
  }

  if (message === 'desktop:ping') {
    windowSetTitle(`${APP_TITLE} - IPC OK`);
    return;
  }

  if (message === 'desktop:docs') {
    windowSetTitle(`${APP_TITLE} - /docs/desktop`);
    return;
  }

  if (message === 'desktop:reset') {
    windowSetTitle(APP_TITLE);
    return;
  }

  if (message === 'desktop:quit') {
    windowQuit();
  }
});

createWindow({
  center: true,
  height: 700,
  icon: './public/favicon.svg',
  title: APP_TITLE,
  width: 1080,
  html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_TITLE}</title>
  </head>
  <body style="margin:0;">
    ${renderToString(app)}
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-desktop-message]').forEach((element) => {
          element.addEventListener('click', (event) => {
            event.preventDefault();
            const message = element.getAttribute('data-desktop-message');

            if (message) {
              window.ipc?.postMessage(message);
            }
          });
        });

        window.ipc?.postMessage('desktop:ready');
      });
    </script>
  </body>
</html>`,
});