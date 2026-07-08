import { button, div, h1, input, p, span } from '@elitjs/el';

function mobileTodo(label: string, checked: boolean) {
    return div(
        {
            style: {
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#ffffff'
            }
        },
        input({ type: 'checkbox', checked }),
        span(label)
    );
}

export const screen = () => div(
    {
        style: {
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: '#f7efe8'
        }
    },
    h1('Todo Companion'),
    p('A native-friendly preview for the fullstack todo starter.'),
    mobileTodo('Review the database-backed API routes', true),
    mobileTodo('Add your first team-specific workflow', false),
    mobileTodo('Clear the sample tasks before launch', false),
    button({ onClick: () => undefined }, 'Sync mobile shell')
);