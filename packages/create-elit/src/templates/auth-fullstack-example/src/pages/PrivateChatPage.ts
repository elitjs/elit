import { div, h2, p, input, button, span } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import type { Router } from '@elitjs/router';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export function PrivateChatPage(router: Router, otherUserId: string) {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    router.push('/login');
    return div({ className: 'chat-page' }, p('Redirecting to login...'));
  }

  const userData = JSON.parse(user);

  // Create room ID (sorted IDs to ensure same room for both users)
  const roomId = [userData.id, otherUserId].sort().join('_');

  // Use regular state for messages
  const messages = createState<ChatMessage[]>([]);
  const otherUser = createState<{ id: string; name: string; email: string; bio: string; avatar: string} | null>(null);
  const newMessage = createState('');
  const error = createState('');
  const isLoading = createState(false);

  // Load other user info
  const loadOtherUser = async () => {
    try {
      const response = await fetch(`/api/users/${otherUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        otherUser.value = data.user;
      }
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  // Load messages
  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?roomId=${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        messages.value = data.messages || [];
        console.log('Loaded messages:', messages.value);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Initial load
  loadOtherUser();
  loadMessages();

  // Connect to SSE for real-time messages
  const eventSource = new EventSource(`/api/chat/events?roomId=${roomId}`);

  eventSource.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);

      if (event.type === 'new-message') {
        const newMsg = event.data as ChatMessage;
        // Only add if message belongs to this room
        if (newMsg.roomId === roomId) {
          messages.value = [...messages.value, newMsg];
          console.log('New message received:', newMsg);
        }
      }
    } catch (err) {
      console.error('Failed to parse SSE data:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE error:', err);
  };

  console.log('PrivateChatPage mounted for room:', roomId);

  // Setup button state management - will run after DOM is rendered
  const setupButtonState = () => {
    const sendBtn = document.querySelector('.chat-send-button') as HTMLButtonElement;
    if (!sendBtn) return;

    const updateButtonState = () => {
      sendBtn.disabled = isLoading.value || !newMessage.value.trim();
      sendBtn.textContent = isLoading.value ? 'Sending...' : 'Send';
    };

    // Subscribe to state changes to update button
    isLoading.subscribe(updateButtonState);
    newMessage.subscribe(updateButtonState);

    // Initial state
    updateButtonState();
  };

  // Schedule setup after render
  setTimeout(setupButtonState, 0);

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();

    const messageText = newMessage.value.trim();
    if (!messageText) {
      error.value = 'Please enter a message';
      return;
    }

    console.log('Sending message:', messageText, 'to room:', roomId);

    // Clear input via DOM (not state to avoid re-render)
    const inputEl = document.querySelector('.chat-input') as HTMLInputElement;
    if (inputEl) {
      inputEl.value = '';
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
          roomId: roomId,
          message: messageText
        })
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        // Message will be added via SSE, don't add locally to avoid duplicates
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        error.value = errorData.error || 'Failed to send message';
      }

      isLoading.value = false;
    } catch (err) {
      console.error('Network error:', err);
      error.value = 'Network error. Please try again.';
      isLoading.value = false;
    }
  };

  return div({ className: 'chat-page' },
    div({ className: 'chat-container' },
      // Header
      div({ className: 'chat-header' },
        button({
          className: 'btn btn-secondary btn-sm',
          onclick: () => {
            eventSource.close();
            router.push('/chat/list');
          }
        }, '← Back'),
        reactive(otherUser, (u) =>
          u ? div({ className: 'chat-header-info' },
            h2({ className: 'chat-title' }, u.name),
            p({ className: 'chat-subtitle' }, u.email)
          ) : div({ className: 'chat-header-info' },
            h2({ className: 'chat-title' }, 'Chat'),
            p({ className: 'chat-subtitle' }, 'Loading...')
          )
        )
      ),

      // Messages Area
      div({ className: 'chat-messages' },
        reactive(messages, (msgs: ChatMessage[]) => {
          if (msgs.length === 0) {
            return div({ className: 'chat-empty' },
              p({ className: 'chat-empty-text' }, 'No messages yet. Say hello!')
            );
          }

          return div({ className: 'chat-messages-list' },
            ...msgs.map((msg: ChatMessage) =>
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
        reactive(isLoading, (loading) => loading ? div({ className: 'chat-typing' },
          span({ className: 'typing-dot' }, '.'),
          span({ className: 'typing-dot' }, '.'),
          span({ className: 'typing-dot' }, '.')
        ) : null)
      ),

      // Error Display
      reactive(error, (err) => err ? div({ className: 'auth-error' }, err) : null),

      // Input Area - button disabled state managed via subscription
      div({ className: 'chat-input-area' },
        input({
          type: 'text',
          className: 'chat-input',
          placeholder: 'Type your message...',
          oninput: (e: Event) => {
            newMessage.value = (e.target as HTMLInputElement).value;
            console.log('Input changed:', newMessage.value);
            error.value = '';
          },
          onkeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' && newMessage.value.trim()) {
              console.log('Enter pressed');
              e.preventDefault();
              handleSendMessage(e);
            }
          }
        }),
        button({
          className: 'btn btn-primary chat-send-button',
          onclick: (e: MouseEvent) => {
            console.log('Button clicked, newMessage:', newMessage.value);
            e.preventDefault();
            handleSendMessage(new Event('submit'));
          }
        }, 'Send')
      )
    )
  );
}
