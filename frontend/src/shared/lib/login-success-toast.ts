export const loginSuccessToastKeys = {
  pelamar: 'pelamar_login_success_toast',
  adminStaff: 'admin_staff_login_success_toast',
  staff: 'staff_login_success_toast',
  superAdmin: 'super_admin_login_success_toast',
} as const;

type LoginToastTarget = keyof typeof loginSuccessToastKeys;

export const queueLoginSuccessToast = (target: LoginToastTarget) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(loginSuccessToastKeys[target], '1');
};

export const consumeLoginSuccessToast = (target: LoginToastTarget) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const key = loginSuccessToastKeys[target];
  const shouldShow = window.sessionStorage.getItem(key) === '1';
  if (!shouldShow) {
    return false;
  }

  window.sessionStorage.removeItem(key);
  return true;
};
