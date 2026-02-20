import { lazy } from 'react';

import type { RouteConfig } from '@/runtime/routing/types';
import { usePageManager } from '@/shared/lib/inertia';

const loadLandingPage = () => import('@/modules/LandingPage/Index');
const loadLogin = () => import('@/modules/Auth/Login');
const loadRegister = () => import('@/modules/Auth/Register');
const loadForgotPassword = () => import('@/modules/Auth/ForgotPassword');
const loadResetPassword = () => import('@/modules/Auth/ResetPassword');
const loadSetPassword = () => import('@/modules/Auth/SetPassword');
const loadConfirmPassword = () => import('@/modules/Auth/ConfirmPassword');
const loadVerifyEmail = () => import('@/modules/Auth/VerifyEmail');
const loadDashboard = () => import('@/modules/Dashboard');
const loadProfileEdit = () => import('@/modules/Profile/Edit');

const loadStaffDashboard = () => import('@/modules/Staff/Dashboard');
const loadStaffComplaints = () => import('@/modules/Staff/Complaints');
const loadStaffResignation = () => import('@/modules/Staff/Resignation');

const loadPelamarDashboard = () => import('@/modules/Pelamar/Dashboard');
const loadPelamarProfile = () => import('@/modules/Pelamar/Profile');
const loadPelamarApplications = () => import('@/modules/Pelamar/Applications');

const loadAdminStaffDashboard = () => import('@/modules/AdminStaff/Dashboard');
const loadAdminStaffLetters = () => import('@/modules/AdminStaff/Letters');
const loadAdminStaffRecruitment = () => import('@/modules/AdminStaff/Recruitment');

const loadSuperAdminDashboard = () => import('@/modules/SuperAdmin/Dashboard');
const loadSuperAdminAdminHRDashboard = () => import('@/modules/SuperAdmin/AdminHR/Dashboard');
const loadSuperAdminRecruitment = () => import('@/modules/SuperAdmin/KelolaRekrutmen/Index');
const loadSuperAdminRecruitmentAnalytics = () => import('@/modules/SuperAdmin/KelolaRekrutmen/Analytics');
const loadSuperAdminDivisions = () => import('@/modules/SuperAdmin/KelolaDivisi/Index');
const loadSuperAdminLetters = () => import('@/modules/SuperAdmin/KelolaSurat/Index');
const loadSuperAdminStaff = () => import('@/modules/SuperAdmin/KelolaStaff/Index');
const loadSuperAdminComplaints = () => import('@/modules/SuperAdmin/KelolaPengaduan/Index');
const loadSuperAdminAuditLog = () => import('@/modules/SuperAdmin/AuditLog/Index');
const loadSuperAdminAccountsIndex = () => import('@/modules/SuperAdmin/KelolaAkun/Index');
const loadSuperAdminAccountsCreate = () => import('@/modules/SuperAdmin/KelolaAkun/Create');
const loadSuperAdminAccountsEdit = () => import('@/modules/SuperAdmin/KelolaAkun/Edit');
const loadAuthenticatedLayout = () => import('@/shared/layouts/AuthenticatedLayout');

const LandingPage = lazy(loadLandingPage);
const Login = lazy(loadLogin);
const Register = lazy(loadRegister);
const ForgotPassword = lazy(loadForgotPassword);
const ResetPassword = lazy(loadResetPassword);
const SetPassword = lazy(loadSetPassword);
const ConfirmPassword = lazy(loadConfirmPassword);
const VerifyEmail = lazy(loadVerifyEmail);
const Dashboard = lazy(loadDashboard);
const ProfileEdit = lazy(loadProfileEdit);

const StaffDashboard = lazy(loadStaffDashboard);
const StaffComplaints = lazy(loadStaffComplaints);
const StaffResignation = lazy(loadStaffResignation);

const PelamarDashboard = lazy(loadPelamarDashboard);
const PelamarProfile = lazy(loadPelamarProfile);
const PelamarApplications = lazy(loadPelamarApplications);

const AdminStaffDashboard = lazy(loadAdminStaffDashboard);
const AdminStaffLetters = lazy(loadAdminStaffLetters);
const AdminStaffRecruitment = lazy(loadAdminStaffRecruitment);

const SuperAdminDashboard = lazy(loadSuperAdminDashboard);
const SuperAdminAdminHRDashboard = lazy(loadSuperAdminAdminHRDashboard);
const SuperAdminRecruitment = lazy(loadSuperAdminRecruitment);
const SuperAdminRecruitmentAnalytics = lazy(loadSuperAdminRecruitmentAnalytics);
const SuperAdminDivisions = lazy(loadSuperAdminDivisions);
const SuperAdminLetters = lazy(loadSuperAdminLetters);
const SuperAdminStaff = lazy(loadSuperAdminStaff);
const SuperAdminComplaints = lazy(loadSuperAdminComplaints);
const SuperAdminAuditLog = lazy(loadSuperAdminAuditLog);
const SuperAdminAccountsIndex = lazy(loadSuperAdminAccountsIndex);
const SuperAdminAccountsCreate = lazy(loadSuperAdminAccountsCreate);
const SuperAdminAccountsEdit = lazy(loadSuperAdminAccountsEdit);
const AuthenticatedLayout = lazy(loadAuthenticatedLayout);

function DashboardRedirect() {
  const { props } = usePageManager();
  const redirect = props?.redirect_to as string | undefined;

  if (!redirect) {
    return (
      <AuthenticatedLayout>
        <div className="p-6 text-slate-600">Memuat dashboard...</div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 text-slate-600">Mengalihkan...</div>
    </AuthenticatedLayout>
  );
}

export const ROUTES: RouteConfig[] = [
  { path: '/', name: 'landing', component: LandingPage, api: '/public/landing' },
  { path: '/login', name: 'login', component: Login, api: '/login' },
  { path: '/register', name: 'register', component: Register, api: '/register' },
  {
    path: '/forgot-password',
    name: 'password.request',
    component: ForgotPassword,
    loader: ({ search }) => ({ status: search.get('status') ?? '' }),
  },
  {
    path: '/reset-password/:token',
    name: 'password.reset',
    component: ResetPassword,
    loader: ({ params, search }) => ({
      token: params.token ?? '',
      email: search.get('email') ?? '',
    }),
  },
  {
    path: '/set-password/:token',
    name: 'password.setup',
    component: SetPassword,
    loader: ({ params, search }) => ({
      token: params.token ?? '',
      email: search.get('email') ?? '',
    }),
  },
  {
    path: '/verify-email',
    name: 'verification.notice',
    component: VerifyEmail,
    loader: ({ search }) => ({ status: search.get('status') ?? undefined }),
  },
  {
    path: '/confirm-password',
    name: 'password.confirm',
    component: ConfirmPassword,
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardRedirect,
    api: '/dashboard',
  },
  {
    path: '/admin/dashboard',
    name: 'admin.dashboard',
    component: Dashboard,
  },
  {
    path: '/profile',
    name: 'profile.edit',
    component: ProfileEdit,
    api: '/profile',
  },
  {
    path: '/staff/dashboard',
    name: 'staff.dashboard',
    component: StaffDashboard,
    api: '/staff/dashboard',
  },
  {
    path: '/staff/keluhan-dan-saran',
    name: 'staff.complaints.index',
    component: StaffComplaints,
    api: '/staff/keluhan-dan-saran',
  },
  {
    path: '/staff/pengajuan-resign',
    name: 'staff.resignation.index',
    component: StaffResignation,
    api: '/staff/pengajuan-resign',
  },
  {
    path: '/pelamar/dashboard',
    name: 'pelamar.dashboard',
    component: PelamarDashboard,
    api: '/pelamar/dashboard',
  },
  {
    path: '/pelamar/profil',
    name: 'pelamar.profile',
    component: PelamarProfile,
    api: '/pelamar/profil',
  },
  {
    path: '/pelamar/lamaran-saya',
    name: 'pelamar.applications',
    component: PelamarApplications,
    api: '/pelamar/lamaran-saya',
  },
  {
    path: '/admin-staff/dashboard',
    name: 'admin-staff.dashboard',
    component: AdminStaffDashboard,
    api: '/admin-staff/dashboard',
  },
  {
    path: '/admin-staff/kelola-surat',
    name: 'admin-staff.letters',
    component: AdminStaffLetters,
    api: '/admin-staff/kelola-surat',
  },
  {
    path: '/admin-staff/recruitment',
    name: 'admin-staff.recruitment',
    component: AdminStaffRecruitment,
    api: '/admin-staff/recruitment',
  },
  {
    path: '/super-admin/dashboard',
    name: 'super-admin.dashboard',
    component: SuperAdminDashboard,
    api: '/super-admin/dashboard',
  },
  {
    path: '/super-admin/admin-hr/dashboard',
    name: 'super-admin.admin-hr.dashboard',
    component: SuperAdminAdminHRDashboard,
    api: '/super-admin/admin-hr/dashboard',
  },
  {
    path: '/super-admin/recruitment',
    name: 'super-admin.recruitment',
    component: SuperAdminRecruitment,
    api: '/super-admin/recruitment',
  },
  {
    path: '/super-admin/recruitment/analytics',
    name: 'super-admin.recruitment.analytics',
    component: SuperAdminRecruitmentAnalytics,
    api: '/super-admin/recruitment/analytics',
  },
  {
    path: '/super-admin/kelola-divisi',
    name: 'super-admin.divisions.index',
    component: SuperAdminDivisions,
    api: '/super-admin/kelola-divisi',
  },
  {
    path: '/super-admin/kelola-surat',
    name: 'super-admin.letters.index',
    component: SuperAdminLetters,
    api: '/super-admin/kelola-surat',
  },
  {
    path: '/super-admin/kelola-staff',
    name: 'super-admin.staff.index',
    component: SuperAdminStaff,
    api: '/super-admin/kelola-staff',
  },
  {
    path: '/super-admin/kelola-pengaduan',
    name: 'super-admin.complaints.index',
    component: SuperAdminComplaints,
    api: '/super-admin/kelola-pengaduan',
  },
  {
    path: '/super-admin/audit-log',
    name: 'super-admin.audit-log',
    component: SuperAdminAuditLog,
    api: '/super-admin/audit-log',
  },
  {
    path: '/super-admin/accounts',
    name: 'super-admin.accounts.index',
    component: SuperAdminAccountsIndex,
    api: '/super-admin/accounts',
  },
  {
    path: '/super-admin/accounts/create',
    name: 'super-admin.accounts.create',
    component: SuperAdminAccountsCreate,
    api: '/super-admin/accounts/create',
  },
  {
    path: '/super-admin/accounts/:id/edit',
    name: 'super-admin.accounts.edit',
    component: SuperAdminAccountsEdit,
    api: ({ params }) => `/super-admin/accounts/${params.id}/edit`,
  },
];

function isSuperAdminRole(role: unknown): boolean {
  return role === 'SuperAdmin' || role === 'Super Admin';
}

function isHumanCapitalDivision(division: unknown): boolean {
  return typeof division === 'string' && /human\s+(capital|resources)/i.test(division);
}

export function getWarmupLoaders(user: any): Array<() => Promise<unknown>> {
  const warmups: Array<() => Promise<unknown>> = [loadProfileEdit];

  if (isSuperAdminRole(user.role)) {
    warmups.push(
      loadSuperAdminDashboard,
      loadSuperAdminRecruitment,
      loadSuperAdminRecruitmentAnalytics,
      loadSuperAdminLetters,
      loadSuperAdminStaff,
      loadSuperAdminAuditLog,
    );
  } else if (user.role === 'Admin') {
    const isHumanCapitalAdmin = isHumanCapitalDivision(user.division);
    if (isHumanCapitalAdmin) {
      warmups.push(
        loadSuperAdminAdminHRDashboard,
        loadSuperAdminRecruitment,
        loadSuperAdminRecruitmentAnalytics,
        loadSuperAdminLetters,
      );
    } else {
      warmups.push(loadAdminStaffDashboard, loadAdminStaffLetters, loadAdminStaffRecruitment);
    }
  } else if (user.role === 'Staff') {
    warmups.push(loadStaffDashboard, loadStaffComplaints, loadStaffResignation);
  } else if (user.role === 'Pelamar') {
    warmups.push(loadPelamarDashboard, loadPelamarProfile, loadPelamarApplications);
  }

  return Array.from(new Set(warmups));
}

export function getWarmupApiEndpoints(user: any): string[] {
  const endpoints: string[] = ['/dashboard', '/profile'];

  if (isSuperAdminRole(user.role)) {
    endpoints.push(
      '/super-admin/dashboard',
      '/super-admin/recruitment',
      '/super-admin/recruitment/analytics',
      '/super-admin/kelola-divisi',
      '/super-admin/kelola-surat',
      '/super-admin/kelola-staff',
      '/super-admin/kelola-pengaduan',
      '/super-admin/audit-log',
      '/super-admin/accounts',
    );
  } else if (user.role === 'Admin') {
    if (isHumanCapitalDivision(user.division)) {
      endpoints.push(
        '/super-admin/admin-hr/dashboard',
        '/super-admin/recruitment',
        '/super-admin/recruitment/analytics',
        '/super-admin/kelola-divisi',
        '/super-admin/kelola-surat',
      );
    } else {
      endpoints.push(
        '/admin-staff/dashboard',
        '/admin-staff/kelola-surat',
        '/admin-staff/recruitment',
      );
    }
  } else if (user.role === 'Staff') {
    endpoints.push('/staff/dashboard', '/staff/keluhan-dan-saran', '/staff/pengajuan-resign');
  } else if (user.role === 'Pelamar') {
    endpoints.push('/pelamar/dashboard', '/pelamar/profil', '/pelamar/lamaran-saya');
  }

  return Array.from(new Set(endpoints));
}

export function NotFound() {
  return <div className="p-6 text-slate-600">Halaman tidak ditemukan.</div>;
}
