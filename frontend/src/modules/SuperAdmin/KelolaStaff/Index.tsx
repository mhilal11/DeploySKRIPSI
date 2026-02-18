import { AlertCircle, Calendar, CheckCircle } from 'lucide-react';

import ActiveTerminationsTable from '@/modules/SuperAdmin/KelolaStaff/components/ActiveTerminationsTable';
import InactiveEmployeesCard from '@/modules/SuperAdmin/KelolaStaff/components/InactiveEmployeesCard';
import StatsCards from '@/modules/SuperAdmin/KelolaStaff/components/StatsCards';
import TerminationDialog from '@/modules/SuperAdmin/KelolaStaff/components/TerminationDialog';
import type { KelolaStaffPageProps } from '@/modules/SuperAdmin/KelolaStaff/types';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Head, usePage } from '@/shared/lib/inertia';

import type { ReactNode } from 'react';

export default function KelolaStaffIndex() {
    const page = usePage<KelolaStaffPageProps>();
    const auth = page.props?.auth;
    const stats = page.props?.stats ?? {
        newRequests: 0,
        inProcess: 0,
        completedThisMonth: 0,
        archived: 0,
    };
    const terminations = page.props?.terminations ?? {
        active: [],
        archive: [],
    };
    const inactiveEmployees = page.props?.inactiveEmployees ?? [];
    const staffOptions = page.props?.staffOptions ?? [];
    const checklistTemplate = page.props?.checklistTemplate ?? [];

    const isHumanCapitalAdmin =
        auth?.user?.role === 'Admin' &&
        typeof auth?.user?.division === 'string' &&
        /human\s+(capital|resources)/i.test(auth?.user?.division ?? '');
    const breadcrumbs = isHumanCapitalAdmin
        ? [
              { label: 'Admin', href: route('admin-staff.dashboard') },
              { label: 'Kelola Staff' },
          ]
        : [
              { label: 'Super Admin', href: route('super-admin.dashboard') },
              { label: 'Kelola Staff' },
          ];

    const archiveEmployees = terminations.archive.map((item) => ({
        id: item.id,
        name: item.employeeName,
        employeeCode: item.employeeCode,
        division: item.division,
        position: item.position,
        joinDate: item.requestDate,
        exitDate: item.effectiveDate,
        exitReason: item.reason,
        type: item.type,
    }));

    return (
        <SuperAdminLayout
            title='Termination & Offboarding'
            description='Kelola proses resign, PHK, dan offboarding karyawan'
            breadcrumbs={breadcrumbs}
            actions={<TerminationDialog staffOptions={staffOptions} />}
        >
            <Head title='Kelola Staff' />

            <StatsCards stats={stats} />

            <div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3'>
                <Card className='p-3 md:p-6 lg:col-span-2'>
                    <div className='mb-3 md:mb-4 flex items-start md:items-center justify-between gap-2'>
                        <div>
                            <h3 className='text-sm md:text-lg font-semibold text-blue-900'>
                                Proses Offboarding Aktif
                            </h3>
                            <p className='text-[10px] md:text-sm text-slate-500'>
                                Pantau pengajuan termination yang sedang berjalan
                            </p>
                        </div>
                        <Badge variant='outline' className='text-blue-700 text-[10px] md:text-xs shrink-0'>
                            {terminations.active.length} records
                        </Badge>
                    </div>
                    <ActiveTerminationsTable
                        terminations={terminations.active}
                        checklistTemplate={checklistTemplate}
                    />
                </Card>

                <Card className='space-y-3 md:space-y-4 p-3 md:p-6'>
                    <h3 className='text-sm md:text-lg font-semibold text-blue-900'>
                        Informasi Penting
                    </h3>
                    <InfoCard
                        icon={<Calendar className='h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600' />}
                        text='Masa pemberitahuan minimal 30 hari sebelum tanggal efektif resign.'
                        variant='info'
                    />
                    <InfoCard
                        icon={<AlertCircle className='h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600' />}
                        text='Pastikan serah terima pekerjaan dan inventaris selesai sebelum exit.'
                        variant='warning'
                    />
                    <InfoCard
                        icon={<CheckCircle className='h-3.5 w-3.5 md:h-4 md:w-4 text-green-600' />}
                        text='Exit interview dijadwalkan otomatis setelah pengajuan disetujui.'
                        variant='success'
                    />
                </Card>
            </div>

            <InactiveEmployeesCard
                employees={archiveEmployees.length ? archiveEmployees : inactiveEmployees}
            />
        </SuperAdminLayout>
    );
}

function InfoCard({
    icon,
    text,
    variant,
}: {
    icon: ReactNode;
    text: string;
    variant: 'info' | 'warning' | 'success';
}) {
    const colors =
        variant === 'info'
            ? 'bg-blue-50 border-blue-200'
            : variant === 'warning'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-green-50 border-green-200';

    return (
        <div className={`flex items-start gap-2 md:gap-3 rounded-lg border p-2.5 md:p-4 text-[11px] md:text-sm ${colors}`}>
            <div className="shrink-0">{icon}</div>
            <p className='text-slate-700'>{text}</p>
        </div>
    );
}




