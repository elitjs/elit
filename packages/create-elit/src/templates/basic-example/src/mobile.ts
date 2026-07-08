import { button, div, h1, p, span } from '@elitjs/el';

function Tile(title: string, body: string) {
  return div(
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '14px 16px',
        borderRadius: '18px',
        background: '#fffaf4'
      }
    },
    span({ style: { fontWeight: '700', color: '#173447' } }, title),
    p({ style: { margin: '0', color: '#6d7c88' } }, body)
  );
}

export const screen = () => div(
  {
    style: {
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      background: '#f4ede5'
    }
  },
  h1({ style: { margin: '0', color: '#173447' } }, 'Basic Example'),
  p({ style: { margin: '0', color: '#607180' } }, 'A small native-friendly preview for the create-elit basic starter.'),
  Tile('One page first', 'Keep the initial scope small and prove the interaction model quickly.'),
  Tile('Reactive state', 'Use the same Elit syntax to sketch mobile or desktop follow-up views.'),
  button({ onClick: () => undefined }, 'Sync mobile shell')
);