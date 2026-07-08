import { Database } from '@elitjs/database';
import { ServerRouter, json, type ServerRouteContext } from '@elitjs/server';
import { resolve } from 'path';
import type { TodoItem, TodoPriority, TodoSummary } from './todo-types';

const priorityWeight: Record<TodoPriority, number> = {
	high: 0,
	medium: 1,
	low: 2
};

export const router = new ServerRouter();

const db = new Database({
	dir: resolve(process.cwd(), 'databases'),
	language: 'ts'
});

function normalizePriority(value: unknown): TodoPriority {
	if (value === 'high' || value === 'low') {
		return value;
	}

	return 'medium';
}

function summarizeTodos(items: TodoItem[]): TodoSummary {
	const completed = items.filter((todo) => todo.completed).length;
	const active = items.length - completed;
	const highPriority = items.filter((todo) => !todo.completed && todo.priority === 'high').length;

	return {
		total: items.length,
		active,
		completed,
		highPriority
	};
}

function sortTodos(items: TodoItem[]): TodoItem[] {
	return [...items].sort((left, right) =>
		Number(left.completed) - Number(right.completed)
		|| priorityWeight[left.priority] - priorityWeight[right.priority]
		|| right.updatedAt.localeCompare(left.updatedAt)
	);
}

async function readTodos(): Promise<TodoItem[]> {
	const result = await db.execute(`
		import { todos } from '@db/todo';
		console.log(JSON.stringify(todos));
	`);

	const payload = result.logs.find((entry: { type: string }) => entry.type === 'log')?.args?.[0];

	if (typeof payload === 'string') {
		return sortTodos(JSON.parse(payload) as TodoItem[]);
	}

	if (Array.isArray(payload)) {
		return sortTodos(payload as TodoItem[]);
	}

	return [];
}

function writeTodos(items: TodoItem[]): TodoItem[] {
	const sortedTodos = sortTodos(items);
	db.update('todo', 'todos', sortedTodos);
	return sortedTodos;
}

function createTodoId(): string {
	return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTitle(body: any): string {
	return typeof body?.title === 'string' ? body.title.trim() : '';
}

function getNotes(body: any): string {
	return typeof body?.notes === 'string' ? body.notes.trim() : '';
}

function sendTodoPayload(ctx: ServerRouteContext, todos: TodoItem[], status = 200, extras: Record<string, unknown> = {}) {
	return json(ctx.res, {
		...extras,
		todos,
		summary: summarizeTodos(todos)
	}, status);
}

router.get('/api/health', async (ctx: ServerRouteContext) => {
	json(ctx.res, {
		ok: true,
		storage: 'elit/database',
		file: 'databases/todo.ts'
	});
});

router.get('/api/todos', async (ctx: ServerRouteContext) => {
	const todos = await readTodos();
	sendTodoPayload(ctx, todos);
});

router.post('/api/todos', async (ctx: ServerRouteContext) => {
	const title = getTitle(ctx.body);
	const notes = getNotes(ctx.body);
	const priority = normalizePriority(ctx.body?.priority);

	if (!title) {
		return json(ctx.res, { error: 'Add a task title before saving.' }, 400);
	}

	if (title.length > 120) {
		return json(ctx.res, { error: 'Keep task titles under 120 characters.' }, 400);
	}

	if (notes.length > 280) {
		return json(ctx.res, { error: 'Notes should stay under 280 characters.' }, 400);
	}

	const now = new Date().toISOString();
	const todo: TodoItem = {
		id: createTodoId(),
		title,
		notes,
		priority,
		completed: false,
		createdAt: now,
		updatedAt: now
	};

	const nextTodos = writeTodos([todo, ...(await readTodos())]);

	return sendTodoPayload(ctx, nextTodos, 201, {
		message: 'Task added to databases/todo.ts.',
		todo
	});
});

router.patch('/api/todos/:id', async (ctx: ServerRouteContext) => {
	const todoId = ctx.params.id;
	const currentTodos = await readTodos();
	const todoIndex = currentTodos.findIndex((todo) => todo.id === todoId);

	if (todoIndex === -1) {
		return json(ctx.res, { error: 'Task not found.' }, 404);
	}

	const currentTodo = currentTodos[todoIndex];
	const nextTitle = typeof ctx.body?.title === 'string' ? ctx.body.title.trim() : currentTodo.title;
	const nextNotes = typeof ctx.body?.notes === 'string' ? ctx.body.notes.trim() : currentTodo.notes;
	const nextPriority = ctx.body && 'priority' in ctx.body
		? normalizePriority(ctx.body.priority)
		: currentTodo.priority;
	const nextCompleted = typeof ctx.body?.completed === 'boolean'
		? ctx.body.completed
		: currentTodo.completed;

	if (!nextTitle) {
		return json(ctx.res, { error: 'Task title cannot be empty.' }, 400);
	}

	if (nextTitle.length > 120) {
		return json(ctx.res, { error: 'Keep task titles under 120 characters.' }, 400);
	}

	if (nextNotes.length > 280) {
		return json(ctx.res, { error: 'Notes should stay under 280 characters.' }, 400);
	}

	const updatedTodo: TodoItem = {
		...currentTodo,
		title: nextTitle,
		notes: nextNotes,
		priority: nextPriority,
		completed: nextCompleted,
		updatedAt: new Date().toISOString()
	};

	const nextTodos = writeTodos(currentTodos.map((todo) =>
		todo.id === todoId ? updatedTodo : todo
	));

	return sendTodoPayload(ctx, nextTodos, 200, {
		message: updatedTodo.completed ? 'Task marked complete.' : 'Task updated.',
		todo: updatedTodo
	});
});

router.delete('/api/todos/completed', async (ctx: ServerRouteContext) => {
	const currentTodos = await readTodos();
	const nextTodos = currentTodos.filter((todo) => !todo.completed);

	if (nextTodos.length === currentTodos.length) {
		return json(ctx.res, { error: 'There are no completed tasks to clear.' }, 400);
	}

	const removedCount = currentTodos.length - nextTodos.length;
	const savedTodos = writeTodos(nextTodos);

	return sendTodoPayload(ctx, savedTodos, 200, {
		message: `Cleared ${removedCount} completed task${removedCount === 1 ? '' : 's'}.`,
		removedCount
	});
});

router.delete('/api/todos/:id', async (ctx: ServerRouteContext) => {
	const todoId = ctx.params.id;
	const currentTodos = await readTodos();
	const todo = currentTodos.find((entry) => entry.id === todoId);

	if (!todo) {
		return json(ctx.res, { error: 'Task not found.' }, 404);
	}

	const nextTodos = writeTodos(currentTodos.filter((entry) => entry.id !== todoId));

	return sendTodoPayload(ctx, nextTodos, 200, {
		message: 'Task removed from the board.',
		todo
	});
});

export const server = router;
