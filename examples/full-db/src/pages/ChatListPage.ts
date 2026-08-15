import { div, h2, h3, p, button, span, input } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import type { Router } from '@elitjs/router';

interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatar: string;
}

export function ChatListPage(router: Router) {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    router.push('/login');
    return div({ className: 'chat-page' }, p('Redirecting to login...'));
  }

  const userData = JSON.parse(user);

  const users = createState<User[]>([]);
  const searchQuery = createState('');
  const isLoading = createState(false);
  const error = createState('');

  // Load users
  const loadUsers = async () => {
    isLoading.value = true;
    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Current user ID:', userData.id);
        console.log('All users:', data.users);

        // Filter out current user
        const allUsers = data.users || [];
        users.value = allUsers.filter((u: User) => u.id !== userData.id);

        console.log('Filtered users:', users.value);
      } else {
        error.value = 'Failed to load users';
      }
    } catch (err) {
      console.error('Error loading users:', err);
      error.value = 'Network error. Please try again.';
    } finally {
      isLoading.value = false;
    }
  };

  // Load users on mount
  loadUsers();

  // Open chat with specific user
  const openChat = (userId: string) => {
    router.push(`/chat/dm/${userId}`);
  };

  return div({ className: 'chat-list-page' },
    div({ className: 'chat-container' },
      // Header
      div({ className: 'chat-header' },
        div({ className: 'chat-header-info' },
          h2({ className: 'chat-title' }, 'Messages'),
          p({ className: 'chat-subtitle' }, 'Select a user to start chatting')
        ),
        button({
          className: 'btn btn-secondary btn-sm',
          onclick: () => router.push('/profile')
        }, 'Back to Profile')
      ),

      // Search
      div({ className: 'chat-search' },
        input({
          type: 'text',
          className: 'chat-input',
          placeholder: 'Search users...',
          oninput: (e: Event) => {
            searchQuery.value = (e.target as HTMLInputElement).value;
          }
        })
      ),

      // Error Display
      reactive(error, (err) => err ? div({ className: 'auth-error' }, err) : null),

      // Users List
      div({ className: 'chat-users-list' },
        reactive(isLoading, (loading) => {
          if (loading) {
            return div({ className: 'chat-loading' }, p('Loading users...'));
          }
          return reactive(users, (userList) => {
          const filteredUsers = searchQuery.value
            ? userList.filter(u =>
                u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.value.toLowerCase())
              )
            : userList;

          if (filteredUsers.length === 0) {
            return div({ className: 'chat-empty' },
              p({ className: 'chat-empty-text' }, searchQuery.value ? 'No users found' : 'No other users yet')
            );
          }

          return div({ className: 'chat-users-grid' },
            ...filteredUsers.map(u =>
              div({
                className: 'chat-user-card',
                onclick: () => openChat(u.id)
              },
                div({ className: 'chat-user-avatar' },
                  span({ className: 'chat-avatar-text' }, u.name.charAt(0).toUpperCase())
                ),
                div({ className: 'chat-user-info' },
                  h3({ className: 'chat-user-name' }, u.name),
                  p({ className: 'chat-user-email' }, u.email),
                  u.bio ? p({ className: 'chat-user-bio' }, u.bio) : null
                ),
                button({
                  className: 'btn btn-primary btn-sm chat-chat-button'
                }, 'Chat')
              )
            )
          );
        });
        })
      )
    )
  );
}
