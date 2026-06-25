import { createRouter, createRouterView, type RouteParams } from 'elit';
import { HomePage, ExamplesListPage, ExampleDetailPage, DocsPage, ApiPage, BlogPage, BlogDetailPage, RoadmapPage } from './pages/index.ts';

// Define routes
const routes = [
  { path: '/', component: () => HomePage(router) },
  { path: '/examples', component: () => ExamplesListPage(router) },
  { path: '/examples/:id', component: (params: RouteParams) => ExampleDetailPage(router, params.id) },
  { path: '/docs', component: () => DocsPage() },
  { path: '/api', component: () => ApiPage() },
  { path: '/blog', component: () => BlogPage(router) },
  { path: '/blog/:id', component: (params: RouteParams) => BlogDetailPage(router, params.id) },
  { path: '/roadmap', component: () => RoadmapPage(router) }
];

// Initialize router
export const router = createRouter({
  mode: 'hash',
  base: '/elit',
  routes
});

export const RouterView = createRouterView(router, { mode: 'hash', routes });
