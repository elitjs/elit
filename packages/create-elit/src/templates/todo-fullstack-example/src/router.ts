import { createRouter, createRouterView } from '@elitjs/router';
import { TodoPage } from './pages/TodoPage';

// Initialize router
export const router = createRouter({
  mode: 'hash',
  base: '/',
  routes: []
});

// Define routes
const routes = [
  { path: '/', component: () => TodoPage() }
];

export const RouterView = createRouterView(router, { mode: 'hash', routes });
