function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escapeStyleText(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}

export function buildDesktopAutoHtml(options: { css: string; markup: string; title: string }): string {
  const styleTag = options.css
    ? `  <style>${escapeStyleText(options.css)}</style>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
${styleTag}
</head>
<body>
  ${options.markup}
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-desktop-message], [data-elit-action], [data-elit-route]').forEach((element) => {
        element.addEventListener('click', (event) => {
          const action = element.getAttribute('data-elit-action');
          const route = element.getAttribute('data-elit-route');
          const payload = element.getAttribute('data-elit-payload');
          const desktopMessage = element.getAttribute('data-desktop-message');

          if (action || route || payload || desktopMessage) {
            event.preventDefault();
          }

          if (action || route || payload) {
            window.ipc?.postMessage(JSON.stringify({ type: 'bridge', action, route, payload }));
            return;
          }

          if (desktopMessage) {
            window.ipc?.postMessage(desktopMessage);
          }
        });
      });

      window.ipc?.postMessage('desktop:ready');
    });
  </script>
</body>
</html>`;
}