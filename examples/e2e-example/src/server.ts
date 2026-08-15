import { ServerRouter } from '@elitjs/server';

interface Todo {
    id: string;
    title: string;
    done: boolean;
}

// Each call gets a fresh in-memory store, so every test starts from a clean slate.
export function createTodoRouter(): ServerRouter {
    const todos = new Map<string, Todo>();
    const router = new ServerRouter();

    // GET /api/todos — list all todos
    router.get('/api/todos', (_req, res) => {
        res.json({ todos: [...todos.values()] });
    });

    // POST /api/todos — create a todo { title }
    router.post('/api/todos', (req, res) => {
        const { title } = req.body ?? {};

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'title is required' });
        }

        const todo: Todo = { id: `todo_${todos.size + 1}`, title: title.trim(), done: false };
        todos.set(todo.id, todo);

        return res.status(201).json(todo);
    });

    // GET /api/todos/:id — fetch one todo
    router.get('/api/todos/:id', (req, res) => {
        const todo = todos.get(req.params.id);

        if (!todo) {
            return res.status(404).json({ error: 'todo not found' });
        }

        return res.json(todo);
    });

    // PUT /api/todos/:id — toggle done
    router.put('/api/todos/:id', (req, res) => {
        const todo = todos.get(req.params.id);

        if (!todo) {
            return res.status(404).json({ error: 'todo not found' });
        }

        todo.done = !todo.done;

        return res.json(todo);
    });

    // DELETE /api/todos/:id
    router.delete('/api/todos/:id', (req, res) => {
        if (!todos.delete(req.params.id)) {
            return res.status(404).json({ error: 'todo not found' });
        }

        return res.json({ deleted: req.params.id });
    });

    // GET / — tiny HTML page so browser tests (page.goto/screenshot) have UI to hit
    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h1>Elit E2E Example</h1>
                <p id="status">server running</p>
              </body>
            </html>`);
    });

    return router;
}
