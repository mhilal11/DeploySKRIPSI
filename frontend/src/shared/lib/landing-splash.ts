const LANDING_SPLASH_SHOWN_KEY = 'landing_splash_shown_v2';
const LANDING_SPLASH_SKIP_ONCE_KEY = 'landing_splash_skip_once_v1';
const STRICT_MODE_SKIP_GRACE_MS = 1000;

let lastSkipConsumedAt = 0;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage;
}

export function hasLandingSplashShown(): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  return storage.getItem(LANDING_SPLASH_SHOWN_KEY) === '1';
}

export function markLandingSplashShown(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(LANDING_SPLASH_SHOWN_KEY, '1');
}

export function markLandingSplashSkipOnce(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(LANDING_SPLASH_SKIP_ONCE_KEY, '1');
}

export function consumeLandingSplashSkipOnce(): boolean {
  const now = Date.now();
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  const shouldSkip = storage.getItem(LANDING_SPLASH_SKIP_ONCE_KEY) === '1';
  if (shouldSkip) {
    storage.removeItem(LANDING_SPLASH_SKIP_ONCE_KEY);
    lastSkipConsumedAt = now;
    return true;
  }

  // React Strict Mode (dev) can mount/unmount/remount once. Keep a short
  // grace window so the second mount still respects the same skip request.
  return now - lastSkipConsumedAt <= STRICT_MODE_SKIP_GRACE_MS;
}
