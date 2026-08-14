import { div, h2, p, input, button, span, form } from '@elitjs/el';
import { createState, reactive, createSharedState } from '@elitjs/state';
import type { Router } from '@elitjs/router';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export function ChatPage(router: Router) {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    router.push('/login');
    return div({ className: 'chat-page' }, p('Redirecting to login...'));
  }

  const userData = JSON.parse(user);

  // Create shared state for chat messages with WebSocket sync
  const chatMessages = createSharedState<ChatMessage[]>('chat:general', [], `ws://${location.host}`);
  const newMessage = createState('');
  const error = createState('');
  const isLoading = createState(false);

  // Load initial messages from API
  const loadMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages?roomId=general', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        chatMessages.value = data.messages || [];
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Load messages on mount
  loadMessages();

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();

    const messageText = newMessage.value.trim();
    if (!messageText) {
      error.value = 'Please enter a message';
      return;
    }

    newMessage.value = '';
    error.value = '';
    isLoading.value = true;

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId: 'general',
          message: messageText
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Add the sent message to shared state (syncs with other clients)
        if (data.message) {
          chatMessages.value = [...chatMessages.value, data.message];
        }
      } else {
        const errorData = await response.json();
        error.value = errorData.error || 'Failed to send message';
      }

      isLoading.value = false;
    } catch (err) {
      error.value = 'Network error. Please try again.';
      isLoading.value = false;
    }
  };

  // Cleanup shared state on unmount
  const cleanup = () => {
    chatMessages.disconnect();
  };

  // Poll for new messages every 2 seconds (fallback if WebSocket is not available)
  const pollInterval = setInterval(() => {
    if (!chatMessages.value || chatMessages.value.length === 0) {
      loadMessages();
    }
  }, 2000);

  return div({ className: 'chat-page' },
    div({ className: 'chat-container' },
      // Chat Header
      div({ className: 'chat-header' },
        div({ className: 'chat-header-info' },
          h2({ className: 'chat-title' }, 'Chat Room'),
          p({ className: 'chat-subtitle' }, `Logged in as ${userData.name}`)
        ),
        button({
          className: 'btn btn-secondary btn-sm',
          onclick: () => {
            clearInterval(pollInterval);
            cleanup();
            router.push('/profile');
          }
        }, 'Back to Profile')
      ),

      // Messages Area
      div({ className: 'chat-messages' },
        reactive(chatMessages.state, (msgs) => {
          if (!msgs || msgs.length === 0) {
            return div({ className: 'chat-empty' },
              p({ className: 'chat-empty-text' }, 'No messages yet. Start the conversation!')
            );
          }

          return div({ className: 'chat-messages-list' },
            ...msgs.map(msg =>
              div({
                className: `chat-message ${msg.userId === userData.id ? 'chat-message-user' : 'chat-message-other'}`
              },
                div({ className: 'chat-message-content' },
                  span({ className: 'chat-message-sender' },
                    msg.userId === userData.id ? 'You' : msg.userName
                  ),
                  p({ className: 'chat-message-text' }, msg.text)
                ),
                span({ className: 'chat-message-time' },
                  new Date(msg.timestamp).toLocaleTimeString()
                )
              )
            )
          );
        }),
        isLoading.value ? div({ className: 'chat-typing' },
          span({ className: 'typing-dot' }, '.'),
          span({ className: 'typing-dot' }, '.'),
          span({ className: 'typing-dot' }, '.')
        ) : null
      ),

      // Error Display
      reactive(error, (err) => err ? div({ className: 'auth-error' }, err) : null),

      // Input Area
      form({ className: 'chat-input-area', onsubmit: handleSendMessage },
        input({
          type: 'text',
          className: 'chat-input',
          placeholder: 'Type your message...',
          value: newMessage.value,
          oninput: (e: Event) => {
            newMessage.value = (e.target as HTMLInputElement).value;
            error.value = '';
          }
        }),
        button({
          type: 'submit',
          className: 'btn btn-primary',
          disabled: isLoading.value || !newMessage.value.trim()
        }, isLoading.value ? 'Sending...' : 'Send')
      )
    )
  );
}
