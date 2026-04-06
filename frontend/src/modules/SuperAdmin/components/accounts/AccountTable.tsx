import { Edit, Eye, ToggleLeft, Trash2, AlertTriangle } from 'lucide-react';
import { ReactNode } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import { AccountRecord, PaginationLink } from './types';

interface AccountTableProps {
    users: AccountRecord[];
    links: PaginationLink[];
    from?: number;
    onPaginationNavigateStart?: () => void;
    onPaginationNavigate?: (url: string) => void;
    onView: (user: AccountRecord) => void;
    onEdit: (user: AccountRecord) => void;
    onToggleStatus: (user: AccountRecord) => void;
    onDelete: (user: AccountRecord) => void;
}

export default function AccountTable({
    users,
    links,
    from = 1,
    onPaginationNavigateStart,
    onPaginationNavigate,
    onView,
    onEdit,
    onToggleStatus,
    onDelete,
}: AccountTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {/* Mobile Card View */}
            <div className="block md:hidden">
                {users.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-slate-500">
                        Tidak ada data pengguna.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <div key={user.id} className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="mr-2 font-medium text-slate-900 border-r pr-2">
                                        {(from ?? 1) + users.indexOf(user)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-xs text-slate-900 truncate">{user.name}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                                    </div>
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${user.status === 'Active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-slate-200 text-slate-600'
                                            }`}
                                    >
                                        {user.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                    <div>
                                        <p className="text-[10px] text-slate-400">User ID</p>
                                        <p className="text-[11px] text-slate-700 truncate">{user.employee_code ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Role</p>
                                        <p className="text-[11px] text-slate-700 truncate">{user.role}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Divisi</p>
                                        <p className="text-[11px] text-slate-700 truncate">{user.division ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Login Terakhir</p>
                                        <p className="text-[10px] text-slate-700 truncate">{user.last_login_at ?? '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5 pt-1.5 border-t border-slate-100">
                                    <IconButton label="Detail" onClick={() => onView(user)} size="sm">
                                        <Eye className="h-3.5 w-3.5" />
                                    </IconButton>
                                    <IconButton label="Edit" onClick={() => onEdit(user)} size="sm">
                                        <Edit className="h-3.5 w-3.5" />
                                    </IconButton>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <div className="inline-block">
                                                <IconButton label={user.status === 'Active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'} onClick={() => { }} size="sm">
                                                    <ToggleLeft className={`h-3.5 w-3.5 ${user.status === 'Active' ? 'text-orange-500' : 'text-green-600'}`} />
                                                </IconButton>
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-white">
                                            <AlertDialogHeader>
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className={`h-5 w-5 ${user.status === 'Active' ? 'text-orange-500' : 'text-green-600'}`} />
                                                    <AlertDialogTitle>{user.status === 'Active' ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?'}</AlertDialogTitle>
                                                </div>
                                                <AlertDialogDescription>
                                                    Apakah Anda yakin ingin {user.status === 'Active' ? 'menonaktifkan' : 'mengaktifkan'} akun <span className="font-semibold text-slate-900">{user.name}</span>?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => onToggleStatus(user)}
                                                    className={user.status === 'Active' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
                                                >
                                                    Ya, {user.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <div className="inline-block">
                                                <IconButton label="Hapus Akun" onClick={() => { }} size="sm">
                                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                </IconButton>
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-white">
                                            <AlertDialogHeader>
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                                    <AlertDialogTitle>Hapus Akun?</AlertDialogTitle>
                                                </div>
                                                <AlertDialogDescription>
                                                    Apakah Anda yakin ingin menghapus akun <span className="font-semibold text-slate-900">{user.name}</span>? Tindakan ini tidak dapat dibatalkan.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => onDelete(user)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Ya, Hapus
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3 w-[50px]">No</th>
                            <th className="px-4 py-3">User ID</th>
                            <th className="px-4 py-3">Nama</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Divisi</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Nonaktif Pada</th>
                            <th className="px-4 py-3">Login Terakhir</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {users.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-10 text-center text-slate-500"
                                >
                                    Tidak ada data pengguna.
                                </td>
                            </tr>
                        )}
                        {users.map((user, index) => (
                            <tr key={user.id} className="hover:bg-slate-50/60">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {(from ?? 1) + index}
                                </td>
                                <td className="px-4 py-3 font-medium">
                                    {user.employee_code ?? '-'}
                                </td>
                                <td className="px-4 py-3">{user.name}</td>
                                <td className="px-4 py-3">{user.email}</td>
                                <td className="px-4 py-3">
                                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{user.division ?? '-'}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === 'Active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-slate-200 text-slate-600'
                                            }`}
                                    >
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {user.inactive_at ?? '-'}
                                </td>
                                <td className="px-4 py-3">
                                    {user.last_login_at ?? '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                        <IconButton
                                            label="Detail"
                                            onClick={() => onView(user)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </IconButton>
                                        <IconButton
                                            label="Edit"
                                            onClick={() => onEdit(user)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </IconButton>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <div className="inline-block">
                                                    <IconButton label={user.status === 'Active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'} onClick={() => { }}>
                                                        <ToggleLeft className={`h-4 w-4 ${user.status === 'Active' ? 'text-orange-500' : 'text-green-600'}`} />
                                                    </IconButton>
                                                </div>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white">
                                                <AlertDialogHeader>
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className={`h-5 w-5 ${user.status === 'Active' ? 'text-orange-500' : 'text-green-600'}`} />
                                                        <AlertDialogTitle>{user.status === 'Active' ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?'}</AlertDialogTitle>
                                                    </div>
                                                    <AlertDialogDescription>
                                                        Apakah Anda yakin ingin {user.status === 'Active' ? 'menonaktifkan' : 'mengaktifkan'} akun <span className="font-semibold text-slate-900">{user.name}</span>?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => onToggleStatus(user)}
                                                        className={user.status === 'Active' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
                                                    >
                                                        Ya, {user.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <div className="inline-block">
                                                    <IconButton label="Hapus Akun" onClick={() => { }}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </IconButton>
                                                </div>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white">
                                                <AlertDialogHeader>
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="h-5 w-5 text-red-500" />
                                                        <AlertDialogTitle>Hapus Akun?</AlertDialogTitle>
                                                    </div>
                                                    <AlertDialogDescription>
                                                        Apakah Anda yakin ingin menghapus akun <span className="font-semibold text-slate-900">{user.name}</span>? Tindakan ini tidak dapat dibatalkan.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => onDelete(user)}
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Ya, Hapus
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {links.length > 1 && (
                <div className="flex flex-col gap-2 md:gap-3 border-t px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm md:flex-row md:items-center md:justify-between">
                    <span className="text-slate-500 text-center md:text-left text-[11px] md:text-sm">
                        Menampilkan {users.length} pengguna
                    </span>
                    <div className="flex flex-wrap justify-center gap-0.5 md:gap-2">
                        {links.map((link, index) => (
                            <a
                                key={`${link.label}-${index}`}
                                href={link.url ?? '#'}
                                aria-disabled={!link.url}
                                onClick={(event) => {
                                    if (!link.url) {
                                        event.preventDefault();
                                        return;
                                    }

                                    if (onPaginationNavigate) {
                                        event.preventDefault();
                                        onPaginationNavigateStart?.();
                                        onPaginationNavigate(link.url);
                                        return;
                                    }

                                    onPaginationNavigateStart?.();
                                }}
                                className={`rounded px-1.5 py-0.5 text-[10px] md:text-sm md:px-3 md:py-1 ${link.active
                                    ? 'bg-blue-900 text-white'
                                    : link.url
                                        ? 'text-blue-900 hover:bg-blue-50'
                                        : 'text-slate-400'
                                    }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function IconButton({
    children,
    onClick,
    label,
    size = 'default',
}: {
    children: ReactNode;
    onClick: () => void;
    label: string;
    size?: 'sm' | 'default';
}) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onClick}
                        className={`rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-blue-900 ${size === 'sm' ? 'p-1.5' : 'p-2'
                            }`}
                    >
                        {children}
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}



