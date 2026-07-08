import { div, h3, p, button, span, input, label } from '@elitjs/el';
import { createState, reactive, reactiveAs } from '@elitjs/state';
import type { Router } from '@elitjs/router';

export function ProfilePage(router: Router) {
  const isEditing = createState(false);
  const name = createState('');
  const email = createState('');
  const bio = createState('');
  const location = createState('');
  const website = createState('');
  const isLoading = createState(false);
  const isLoaded = createState(false);
  const error = createState('');

  const stats = {
    projects: 0,
    followers: 0,
    following: 0,
    stars: 0
  };

  // Load profile data
  const loadProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      const user = data.user;

      name.value = user.name;
      email.value = user.email;
      bio.value = user.bio;
      location.value = user.location;
      website.value = user.website;
      stats.projects = user.stats.projects;
      stats.followers = user.stats.followers;
      stats.following = user.stats.following;
      stats.stars = user.stats.stars;

      isLoaded.value = true;
    } catch (err) {
      error.value = 'Failed to load profile';
      isLoaded.value = true;
    }
  };

  // Load profile on mount
  loadProfile();

  const handleSave = async () => {
    isLoading.value = true;
    error.value = '';

    const token = localStorage.getItem('token');
    if (!token) {
      error.value = 'Not authenticated';
      isLoading.value = false;
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.value,
          bio: bio.value,
          location: location.value,
          website: website.value
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      const updatedUser = data.user;

      // Update local storage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      isLoading.value = false;
      isEditing.value = false;
    } catch (err) {
      error.value = 'Failed to save profile';
      isLoading.value = false;
    }
  };

  const handleCancel = () => {
    // Reset to original values from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.name) {
      name.value = user.name;
    }
    if (user.email) {
      email.value = user.email;
    }
    if (user.bio) {
      bio.value = user.bio;
    }
    if (user.location) {
      location.value = user.location;
    }
    if (user.website) {
      website.value = user.website;
    }
    isEditing.value = false;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Dispatch custom event to notify Header
    window.dispatchEvent(new Event('elit:storage'));
    router.push('/');
  };

  return div({ className: 'profile-page' },
    // Error display
    reactive(error, (err) => err ? div({ className: 'auth-error' }, err) : null),

    // Profile Header
    div({ className: 'profile-header-section' },
      div({ className: 'profile-cover' }),
      div({ className: 'profile-avatar-section' },
        div({ className: 'profile-avatar' },
          reactive(name, (nm) => nm ? nm.charAt(0).toUpperCase() : '?')
        ),
        button({ className: 'avatar-edit-button' }, '📷')
      ),
    ),

    // Profile Content
    reactive(isLoaded, (loaded) => {
      if (!loaded) {
        return div({ className: 'profile-content' }, p('Loading...'));
      }

      return div({ className: 'profile-content' },
        // Left column
        div({ className: 'profile-sidebar' },
          div({ className: 'profile-card' },
            reactive(isEditing, (editing) => {
              if (editing) {
                return div({ className: 'edit-form' },
                  div({ className: 'form-group' },
                    label({ className: 'form-label' }, 'Display Name'),
                    input({
                      type: 'text',
                      className: 'form-input',
                      value: name.value,
                      oninput: (e: Event) => { name.value = (e.target as HTMLInputElement).value; }
                    })
                  ),
                  div({ className: 'form-group' },
                    label({ className: 'form-label' }, 'Email'),
                    input({
                      type: 'email',
                      className: 'form-input',
                      value: email.value,
                      disabled: true
                    })
                  )
                );
              }
              return div({ className: 'profile-info-display' },
                reactive(name, (nm) => h3({ className: 'profile-name' }, nm)),
                reactive(email, (em) => p({ className: 'profile-email' }, em))
              );
            }),

            div({ className: 'profile-meta' },
              div({ className: 'meta-item' },
                span({ className: 'meta-icon' }, '📍'),
                reactive(isEditing, (editing) => {
                  if (editing) {
                    return input({
                      type: 'text',
                      className: 'form-input form-input-sm',
                      value: location.value,
                      oninput: (e: Event) => { location.value = (e.target as HTMLInputElement).value; }
                    });
                  }
                  return span({ className: 'meta-text' }, location.value || 'No location');
                })
              ),
              div({ className: 'meta-item' },
                span({ className: 'meta-icon' }, '🔗'),
                reactive(isEditing, (editing) => {
                  if (editing) {
                    return input({
                      type: 'url',
                      className: 'form-input form-input-sm',
                      value: website.value,
                      oninput: (e: Event) => { website.value = (e.target as HTMLInputElement).value; }
                    });
                  }
                  return span({ className: 'meta-text' }, website.value || 'No website')
                })
              )
            ),

            // Use reactiveAs with a stable div wrapper to handle structure changes
            reactiveAs('div', isEditing, (editing) => {
              if (editing) {
                return div({ className: 'edit-actions' },
                  button({
                    className: 'btn btn-secondary',
                    onclick: () => {
                      console.log('Cancel button clicked');
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      console.log('User from localStorage:', user);
                      name.value = user.name || '';
                      email.value = user.email || '';
                      bio.value = user.bio || '';
                      location.value = user.location || '';
                      website.value = user.website || '';
                      console.log('States reset, setting isEditing to false');
                      isEditing.value = false;
                      console.log('isEditing.value:', isEditing.value);
                    },
                    disabled: isLoading.value
                  }, 'Cancel'),
                  button({
                    className: 'btn btn-primary',
                    onclick: handleSave,
                    disabled: isLoading.value
                  }, isLoading.value ? 'Saving...' : 'Save Changes')
                );
              }
              return button({
                className: 'btn btn-primary btn-block',
                onclick: () => isEditing.value = true
              }, 'Edit Profile');
            }, { className: 'profile-action-wrapper' })
          )
        ),

        // Right column
        div({ className: 'profile-main' },
          // Stats Card
          div({ className: 'stats-grid' },
            div({ className: 'stat-card' },
              span({ className: 'stat-icon' }, '📁'),
              div({ className: 'stat-info' },
                span({ className: 'stat-value' }, stats.projects.toString()),
                span({ className: 'stat-label' }, 'Projects')
              )
            ),
            div({ className: 'stat-card' },
              span({ className: 'stat-icon' }, '⭐'),
              div({ className: 'stat-info' },
                span({ className: 'stat-value' }, stats.stars.toString()),
                span({ className: 'stat-label' }, 'Stars')
              )
            ),
            div({ className: 'stat-card' },
              span({ className: 'stat-icon' }, '👥'),
              div({ className: 'stat-info' },
                span({ className: 'stat-value' }, stats.followers.toString()),
                span({ className: 'stat-label' }, 'Followers')
              )
            ),
            div({ className: 'stat-card' },
              span({ className: 'stat-icon' }, '👣'),
              div({ className: 'stat-info' },
                span({ className: 'stat-value' }, stats.following.toString()),
                span({ className: 'stat-label' }, 'Following')
              )
            )
          ),

          // About Card
          div({ className: 'profile-card' },
            h3({ className: 'card-title' }, 'About'),
            reactive(isEditing, (editing) => {
              if (editing) {
                return div({ className: 'form-group' },
                  label({ className: 'form-label' }, 'Bio'),
                  input({
                    type: 'text',
                    className: 'form-input',
                    value: bio.value,
                    oninput: (e: Event) => { bio.value = (e.target as HTMLInputElement).value; }
                  })
                );
              }
              return reactive(bio, (b) => p({ className: 'profile-bio' }, b || 'No bio yet'));
            })
          ),

          // Activity Card
          div({ className: 'profile-card' },
            h3({ className: 'card-title' }, 'Recent Activity'),
            div({ className: 'activity-list' },
              div({ className: 'activity-item' },
                span({ className: 'activity-icon' }, '🚀'),
                div({ className: 'activity-content' },
                  p({ className: 'activity-title' }, 'Account created'),
                  p({ className: 'activity-time' }, 'Just now')
                )
              )
            )
          ),

          // Actions
          div({ className: 'profile-actions' },
            button({ className: 'btn btn-outline btn-block' }, 'View Public Profile'),
            button({ className: 'btn btn-secondary btn-block', onclick: handleLogout }, 'Logout')
          )
        )
      );
    })
  );
}
