export const MOBILE_AUTH_KEY = 'vinzons_mobile_logged_in';
export const MOBILE_USER_KEY = 'vinzons_mobile_user';
export const MOBILE_ASSIGNED_CENTER_KEY = 'vinzons_mobile_assigned_center';
export const MOBILE_ASSIGNED_CENTER_ID_KEY = 'vinzons_mobile_assigned_center_id';

export function isMobileLoggedIn() {
  try {
    return window.localStorage.getItem(MOBILE_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getMobileUser() {
  try {
    const raw = window.localStorage.getItem(MOBILE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loginMobileSession(username) {
  try {
    window.localStorage.setItem(MOBILE_AUTH_KEY, 'true');
    window.localStorage.setItem(
      MOBILE_USER_KEY,
      JSON.stringify({
        username: username || 'aaugorio@gmail.com',
        loggedInAt: Date.now(),
      })
    );
  } catch (error) {
    console.warn('Could not persist mobile login session:', error);
  }
}

export function logoutMobileSession() {
  try {
    window.localStorage.removeItem(MOBILE_AUTH_KEY);
    window.localStorage.removeItem(MOBILE_USER_KEY);
    window.localStorage.removeItem(MOBILE_ASSIGNED_CENTER_KEY);
    window.localStorage.removeItem(MOBILE_ASSIGNED_CENTER_ID_KEY);
  } catch (error) {
    console.warn('Could not clear mobile login session:', error);
  }
}

export function getMobilePostLoginRoute() {
  if (!isMobileLoggedIn()) {
    return '/login';
  }
  try {
    const assignedCenter = window.localStorage.getItem(MOBILE_ASSIGNED_CENTER_KEY);
    return assignedCenter ? '/mobile/dashboard' : '/mobile/select-center';
  } catch {
    return '/mobile/select-center';
  }
}
