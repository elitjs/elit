import { createRouter, createRouterView, type RouteParams, type Router } from '@elitjs/router';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ChatPage } from './pages/ChatPage';
import { ChatListPage } from './pages/ChatListPage';
import { PrivateChatPage } from './pages/PrivateChatPage';

// Initialize router
export const router = createRouter({
  mode: 'hash',
  base: '/',
  routes: []
});

// Define routes
const routes = [
  { path: '/', component: () => HomePage(router) },
  { path: '/login', component: () => LoginPage(router) },
  { path: '/register', component: () => RegisterPage(router) },
  { path: '/profile', component: () => ProfilePage(router) },
  { path: '/forgot-password', component: () => ForgotPasswordPage(router) },
  { path: '/chat', component: () => ChatPage(router) },
  { path: '/chat/list', component: () => ChatListPage(router) },
  { path: '/chat/dm/:userId', component: (params: RouteParams) => PrivateChatPage(router, params.userId as string) }
];

export const RouterView = createRouterView(router, { mode: 'hash', routes });
