import {
  article,
  button,
  div,
  form,
  h1,
  h2,
  h3,
  input,
  label,
  option,
  p,
  section,
  select,
  span,
  textarea
} from '@elitjs/el';
import { bindValue, createState, reactive } from '@elitjs/state';
import type { TodoFilter, TodoItem, TodoPriority, TodoSummary } from '../todo-types';

interface TodoResponse {
  message?: string;
  todos: TodoItem[];
  summary: TodoSummary;
}

const emptySummary: TodoSummary = {
  total: 0,
  active: 0,
  completed: 0,
  highPriority: 0
};

const priorityLabel: Record<TodoPriority, string> = {
  high: 'Ship first',
  medium: 'Steady pace',
  low: 'Backlog'
};

const priorityWeight: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2
};

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function getVisibleTodos(items: TodoItem[], filter: TodoFilter, query: string): TodoItem[] {
  const search = query.trim().toLowerCase();

  return [...items]
    .filter((todo) => {
      if (filter === 'active' && todo.completed) {
        return false;
      }

      if (filter === 'completed' && !todo.completed) {
        return false;
      }

      if (!search) {
        return true;
      }

      return `${todo.title} ${todo.notes}`.toLowerCase().includes(search);
    })
    .sort((left, right) =>
      Number(left.completed) - Number(right.completed)
      || priorityWeight[left.priority] - priorityWeight[right.priority]
      || right.updatedAt.localeCompare(left.updatedAt)
    );
}

export function TodoPage() {
  const todos = createState<TodoItem[]>([]);
  const summary = createState<TodoSummary>(emptySummary);
  const draftTitle = createState('');
  const draftNotes = createState('');
  const draftPriority = createState<TodoPriority>('medium');
  const filter = createState<TodoFilter>('all');
  const search = createState('');
  const isLoading = createState(true);
  const isSaving = createState(false);
  const isClearing = createState(false);
  const error = createState('');
  const notice = createState('');
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  function syncPayload(payload: TodoResponse) {
    todos.value = payload.todos;
    summary.value = payload.summary || summarizeTodos(payload.todos);
  }

  function setNotice(message: string) {
    notice.value = message;

    if (noticeTimer) {
      clearTimeout(noticeTimer);
    }

    noticeTimer = setTimeout(() => {
      notice.value = '';
    }, 2600);
  }

  async function request(url: string, init?: RequestInit): Promise<TodoResponse> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      ...init
    });

    const payload = await response.json() as TodoResponse & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || 'The todo request failed.');
    }

    return payload;
  }

  async function loadTodos() {
    isLoading.value = true;
    error.value = '';

    try {
      const payload = await request('/api/todos');
      syncPayload(payload);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to load tasks.';
    } finally {
      isLoading.value = false;
    }
  }

  async function createTodo(event: Event) {
    event.preventDefault();

    const title = draftTitle.value.trim();
    const notes = draftNotes.value.trim();

    if (!title) {
      error.value = 'Add a task title before saving.';
      return;
    }

    isSaving.value = true;
    error.value = '';

    try {
      const payload = await request('/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          title,
          notes,
          priority: draftPriority.value
        })
      });

      syncPayload(payload);
      draftTitle.value = '';
      draftNotes.value = '';
      draftPriority.value = 'medium';
      setNotice(payload.message || 'Task added.');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to save the task.';
    } finally {
      isSaving.value = false;
    }
  }

  async function toggleTodo(todo: TodoItem) {
    error.value = '';

    try {
      const payload = await request(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          completed: !todo.completed
        })
      });

      syncPayload(payload);
      setNotice(payload.message || 'Task updated.');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to update the task.';
    }
  }

  async function deleteTodo(todo: TodoItem) {
    error.value = '';

    try {
      const payload = await request(`/api/todos/${todo.id}`, {
        method: 'DELETE'
      });

      syncPayload(payload);
      setNotice(payload.message || 'Task removed.');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to remove the task.';
    }
  }

  async function clearCompleted() {
    if (!summary.value.completed) {
      return;
    }

    isClearing.value = true;
    error.value = '';

    try {
      const payload = await request('/api/todos/completed', {
        method: 'DELETE'
      });

      syncPayload(payload);
      setNotice(payload.message || 'Completed tasks cleared.');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to clear completed tasks.';
    } finally {
      isClearing.value = false;
    }
  }

  void loadTodos();

  return div({ className: 'todo-page' },
    section({ className: 'todo-panel todo-hero' },
      div({ className: 'todo-hero-copy' },
        span({ className: 'todo-kicker' }, 'Todo Fullstack Starter'),
        h1({ className: 'todo-headline' }, 'Small tasks. Clear ownership. Visible progress.'),
        p({ className: 'todo-description' },
          'This starter gives you a real CRUD board with API routes and a file-backed database. Add tasks, complete them, clear the finished work, and watch every change persist to ',
          span({ className: 'storage-tag' }, 'databases/todo.ts'),
          '.'
        ),
        div({ className: 'todo-hero-actions' },
          button({ className: 'btn btn-primary', type: 'button', onclick: () => { void loadTodos(); } }, 'Refresh board'),
          span({ className: 'storage-tag' }, 'Powered by elit/database')
        )
      ),
      reactive(summary, (stats) =>
        div({ className: 'todo-hero-card' },
          div(
            h2({ className: 'todo-hero-card-title' }, 'Current snapshot'),
            p({ className: 'todo-hero-card-text' }, 'Keep the queue short, surface the real blockers, and use the data file as a simple local source of truth while you shape the app.')
          ),
          div({ className: 'hero-metrics' },
            div({ className: 'hero-metric' },
              span({ className: 'hero-metric-value' }, String(stats.total)),
              span({ className: 'hero-metric-label' }, 'Total tasks')
            ),
            div({ className: 'hero-metric' },
              span({ className: 'hero-metric-value' }, String(stats.active)),
              span({ className: 'hero-metric-label' }, 'Open now')
            ),
            div({ className: 'hero-metric' },
              span({ className: 'hero-metric-value' }, String(stats.highPriority)),
              span({ className: 'hero-metric-label' }, 'High priority')
            )
          )
        )
      )
    ),

    div({ className: 'todo-workspace' },
      section({ className: 'todo-panel' },
        h2({ className: 'todo-section-title' }, 'Compose a new task'),
        p({ className: 'todo-section-copy' }, 'Use the form below to add work directly into the local database file. Keep titles sharp and notes short.'),
        form({ className: 'todo-form', onsubmit: createTodo },
          div({ className: 'todo-field' },
            label({ className: 'todo-label', htmlFor: 'todo-title' }, 'Task title'),
            input({
              id: 'todo-title',
              className: 'todo-input',
              placeholder: 'Prepare the stakeholder demo',
              ...bindValue(draftTitle)
            })
          ),
          div({ className: 'todo-field' },
            label({ className: 'todo-label', htmlFor: 'todo-notes' }, 'Notes'),
            textarea({
              id: 'todo-notes',
              className: 'todo-input todo-textarea',
              placeholder: 'Add delivery notes, constraints, or handoff details.',
              ...bindValue(draftNotes)
            })
          ),
          div({ className: 'todo-field-row' },
            div({ className: 'todo-field' },
              label({ className: 'todo-label', htmlFor: 'todo-priority' }, 'Priority'),
              select({
                id: 'todo-priority',
                className: 'todo-input',
                ...bindValue(draftPriority)
              },
                option({ value: 'high' }, 'High'),
                option({ value: 'medium' }, 'Medium'),
                option({ value: 'low' }, 'Low')
              )
            )
          ),
          div({ className: 'todo-submit-row' },
            p({ className: 'todo-hint' }, 'Every successful action updates the TypeScript file in the databases folder, so the starter stays inspectable and easy to debug.'),
            reactive(isSaving, (saving) =>
              button({
                className: 'btn btn-primary',
                type: 'submit',
                disabled: saving
              }, saving ? 'Saving task...' : 'Add task')
            )
          )
        )
      ),

      section({ className: 'todo-panel' },
        h2({ className: 'todo-section-title' }, 'Shape the queue'),
        p({ className: 'todo-section-copy' }, 'Filter the board, keep an eye on high-priority work, and use this side panel as the place to add team-specific rules later.'),
        reactive(summary, (stats) =>
          div({ className: 'summary-grid' },
            div({ className: 'summary-card' },
              span({ className: 'summary-value' }, String(stats.active)),
              span({ className: 'summary-label' }, 'Need attention')
            ),
            div({ className: 'summary-card' },
              span({ className: 'summary-value' }, String(stats.completed)),
              span({ className: 'summary-label' }, 'Already done')
            ),
            div({ className: 'summary-card' },
              span({ className: 'summary-value' }, String(stats.highPriority)),
              span({ className: 'summary-label' }, 'Ship-first items')
            )
          )
        ),
        p({ className: 'filter-label' }, 'Board filter'),
        reactive(filter, (activeFilter) =>
          div({ className: 'filter-group' },
            button({
              className: `filter-chip ${activeFilter === 'all' ? 'filter-chip-active' : ''}`,
              type: 'button',
              onclick: () => {
                filter.value = 'all';
              }
            }, 'All tasks'),
            button({
              className: `filter-chip ${activeFilter === 'active' ? 'filter-chip-active' : ''}`,
              type: 'button',
              onclick: () => {
                filter.value = 'active';
              }
            }, 'Open'),
            button({
              className: `filter-chip ${activeFilter === 'completed' ? 'filter-chip-active' : ''}`,
              type: 'button',
              onclick: () => {
                filter.value = 'completed';
              }
            }, 'Completed')
          )
        )
      )
    ),

    reactive(error, (message) => message
      ? div({ className: 'todo-banner todo-banner-error' }, message)
      : null
    ),

    reactive(notice, (message) => message
      ? div({ className: 'todo-banner todo-banner-success' }, message)
      : null
    ),

    section({ className: 'todo-panel' },
      div({ className: 'todo-board-toolbar' },
        div({ className: 'todo-search-wrap' },
          input({
            className: 'todo-input',
            placeholder: 'Search title or notes',
            ...bindValue(search)
          })
        ),
        div({ className: 'todo-toolbar-actions' },
          p({ className: 'todo-toolbar-note' }, 'Sorted by completion state, priority, and latest update.'),
          reactive(isClearing, (clearing) =>
            reactive(summary, (stats) =>
              button({
                className: 'btn btn-secondary',
                type: 'button',
                disabled: clearing || !stats.completed,
                onclick: () => {
                  void clearCompleted();
                }
              }, clearing ? 'Clearing...' : stats.completed ? `Clear ${stats.completed} done` : 'Nothing to clear')
            )
          )
        )
      ),
      reactive(isLoading, (loading) => {
        if (loading) {
          return div({ className: 'todo-empty' },
            div({ className: 'todo-empty-mark' }, '...'),
            h3({ className: 'todo-empty-title' }, 'Loading the board'),
            p({ className: 'todo-empty-copy' }, 'Reading your starter tasks from databases/todo.ts.')
          );
        }

        return reactive(todos, (items) =>
          reactive(filter, (activeFilter) =>
            reactive(search, (query) => {
              const visibleTodos = getVisibleTodos(items, activeFilter, query);

              if (!visibleTodos.length) {
                return div({ className: 'todo-empty' },
                  div({ className: 'todo-empty-mark' }, '0'),
                  h3({ className: 'todo-empty-title' }, 'No tasks match this view'),
                  p({ className: 'todo-empty-copy' }, 'Try another filter, clear the search query, or create a new task to repopulate the board.')
                );
              }

              return div({ className: 'todo-list' },
                ...visibleTodos.map((todo) =>
                  article({ className: `todo-card ${todo.completed ? 'todo-card-done' : ''}` },
                    div({ className: 'todo-card-main' },
                      button({
                        className: `todo-check ${todo.completed ? 'todo-check-active' : ''}`,
                        type: 'button',
                        onclick: () => {
                          void toggleTodo(todo);
                        }
                      }, todo.completed ? 'OK' : ''),
                      div({ className: 'todo-card-copy' },
                        div({ className: 'todo-card-meta' },
                          span({ className: `todo-priority todo-priority-${todo.priority}` }, priorityLabel[todo.priority]),
                          span({ className: 'todo-date' }, formatDate(todo.updatedAt))
                        ),
                        h3({ className: 'todo-card-title' }, todo.title),
                        todo.notes
                          ? p({ className: 'todo-card-notes' }, todo.notes)
                          : p({ className: 'todo-card-notes todo-card-notes-muted' }, 'No extra notes yet. Add context only when it helps handoff.')
                      )
                    ),
                    div({ className: 'todo-card-actions' },
                      button({
                        className: 'btn btn-ghost',
                        type: 'button',
                        onclick: () => {
                          void toggleTodo(todo);
                        }
                      }, todo.completed ? 'Reopen' : 'Complete'),
                      button({
                        className: 'btn btn-danger',
                        type: 'button',
                        onclick: () => {
                          void deleteTodo(todo);
                        }
                      }, 'Delete')
                    )
                  )
                )
              );
            })
          )
        );
      })
    )
  );
}