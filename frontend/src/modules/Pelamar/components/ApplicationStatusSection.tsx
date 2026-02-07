import {
    FileText,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    XCircle,
    Circle,
    Activity,
    ArrowRight,
    Video,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';


interface ApplicationStage {
    name: string;
    status: 'pending' | 'current' | 'completed';
    date: string;
}

interface ApplicationStatus {
    id: number;
    position: string;
    division: string;
    status: string;
    progress: number;
    stages: ApplicationStage[];
    rejection_reason?: string | null;
    updated_at_diff: string;
    submitted_at_formatted: string;
    interview?: {
        date: string;
        time: string;
        mode: string;
        link?: string | null;
        interviewer: string;
        notes?: string | null;
    } | null;
}

interface ApplicationStatusSectionProps {
    applicationsStatus: ApplicationStatus[];
    totalApplications: number;
    inProgress: number;
    rejected: number;
    hired: number;
    onNavigateToApplications: () => void;
    onShowDetail: (app: ApplicationStatus) => void;
    onShowInterview: (app: ApplicationStatus) => void;
    getStatusBadge: (status: string) => JSX.Element;
}

export default function ApplicationStatusSection({
    applicationsStatus,
    totalApplications,
    inProgress,
    rejected,
    hired,
    onNavigateToApplications,
    onShowDetail,
    onShowInterview,
    getStatusBadge,
}: ApplicationStatusSectionProps) {
    return (
        <div className="mb-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-blue-900">
                        Status Lamaran Saya
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Pantau proses seleksi dari setiap posisi yang Anda lamar
                    </p>
                </div>
                <Button
                    onClick={onNavigateToApplications}
                    className="bg-blue-900 hover:bg-blue-800"
                >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Cari Lowongan Lain
                </Button>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="h-auto p-1 bg-slate-100 rounded-lg inline-flex mb-6">
                    <TabsTrigger
                        value="all"
                        className="group rounded-md px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-blue-700"
                    >
                        Semua Lamaran
                        <Badge variant="secondary" className="ml-2 rounded-md bg-slate-200 text-slate-700 group-data-[state=active]:bg-blue-50 group-data-[state=active]:text-blue-700">
                            {totalApplications}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="active"
                        className="group rounded-md px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-blue-700"
                    >
                        Sedang Proses
                        <Badge variant="secondary" className="ml-2 rounded-md bg-blue-100 text-blue-700 group-data-[state=active]:bg-blue-50 group-data-[state=active]:text-blue-700">
                            {inProgress}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="completed"
                        className="group rounded-md px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-blue-700"
                    >
                        Selesai/Arsip
                        <Badge variant="secondary" className="ml-2 rounded-md bg-slate-200 text-slate-600 group-data-[state=active]:bg-blue-50 group-data-[state=active]:text-blue-700">
                            {rejected + hired}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {['all', 'active', 'completed'].map((tabValue) => {
                    const filteredApps = applicationsStatus.filter((app) => {
                        if (tabValue === 'all') return true;
                        if (tabValue === 'active')
                            return [
                                'Applied',
                                'Screening',
                                'Interview',
                                'Offering',
                            ].includes(app.status);
                        if (tabValue === 'completed')
                            return ['Rejected', 'Hired'].includes(
                                app.status
                            );
                        return true;
                    });

                    return (
                        <TabsContent
                            key={tabValue}
                            value={tabValue}
                            className="mt-0 space-y-4"
                        >
                            {filteredApps.length === 0 ? (
                                <Card className="border-dashed">
                                    <div className="p-12 text-center">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                            <FileText className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                            Tidak Ada Lamaran
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {tabValue === 'all' && 'Anda belum memiliki lamaran. Mulai lamar posisi yang tersedia.'}
                                            {tabValue === 'active' && 'Tidak ada lamaran yang sedang diproses saat ini.'}
                                            {tabValue === 'completed' && 'Belum ada lamaran yang selesai atau diarsipkan.'}
                                        </p>
                                        {tabValue === 'all' && (
                                            <Button
                                                onClick={onNavigateToApplications}
                                                className="mt-4 bg-blue-900 hover:bg-blue-800"
                                            >
                                                <Briefcase className="mr-2 h-4 w-4" />
                                                Cari Lowongan
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ) : (
                                filteredApps.map((app) => (
                                    <Card
                                        key={app.id}
                                        className="group overflow-hidden border transition-all hover:border-blue-300 hover:shadow-md"
                                    >
                                        <div className="p-6">
                                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 transition-transform group-hover:scale-105">
                                                        <Building2 className="h-6 w-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="mb-1 flex items-center gap-3">
                                                            <h3 className="text-lg font-semibold text-gray-900">
                                                                {app.position}
                                                            </h3>
                                                            {getStatusBadge(app.status)}
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <Building2 className="h-4 w-4" />
                                                                PT. Lintas Data Prima
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-4 w-4" />
                                                                Applied: {app.submitted_at_formatted}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                                        onClick={() => onShowDetail(app)}
                                                    >
                                                        Lihat Detail
                                                    </Button>
                                                </div>
                                            </div>

                                            <Separator className="my-6" />

                                            <div className="relative">
                                                <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-100" />
                                                <div className="relative grid grid-cols-5 gap-2">
                                                    {app.stages.map((stage, index) => {
                                                        const isCompleted = stage.status === 'completed';
                                                        const isCurrent = stage.status === 'current';
                                                        const isRejected = app.status === 'Rejected' && stage.status === 'current';

                                                        return (
                                                            <div
                                                                key={index}
                                                                className="relative z-10 flex flex-col items-center text-center"
                                                            >
                                                                <div
                                                                    className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${isCompleted
                                                                        ? 'border-green-500 bg-green-500 text-white'
                                                                        : isCurrent
                                                                            ? 'border-blue-600 bg-white text-blue-600 ring-4 ring-blue-50'
                                                                            : isRejected
                                                                                ? 'border-red-500 bg-red-500 text-white'
                                                                                : 'border-gray-200 bg-white text-gray-300'
                                                                        }`}
                                                                >
                                                                    {isCompleted ? (
                                                                        <CheckCircle2 className="h-5 w-5" />
                                                                    ) : isRejected ? (
                                                                        <XCircle className="h-5 w-5" />
                                                                    ) : isCurrent ? (
                                                                        <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
                                                                    ) : (
                                                                        <Circle className="h-5 w-5" />
                                                                    )}
                                                                </div>
                                                                <p
                                                                    className={`mb-0.5 text-xs font-medium ${isCurrent
                                                                        ? 'text-blue-700'
                                                                        : isCompleted
                                                                            ? 'text-green-700'
                                                                            : isRejected
                                                                                ? 'text-red-700'
                                                                                : 'text-gray-400'
                                                                        }`}
                                                                >
                                                                    {stage.name}
                                                                </p>
                                                                {(stage.date !== '-' || isCurrent) && (
                                                                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                                                                        {stage.date !== '-' ? stage.date : 'In Progress'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="mt-6 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                                    <Activity className="h-4 w-4" />
                                                    <span className="font-medium">Update Terakhir:</span>
                                                    <span>{app.updated_at_diff}</span>
                                                </div>
                                                {app.status === 'Offering' && (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-green-600 text-white hover:bg-green-700"
                                                    >
                                                        Review Offering
                                                        <ArrowRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                )}
                                                {app.status === 'Interview' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 border-purple-200 bg-purple-50 text-purple-700"
                                                        onClick={() => onShowInterview(app)}
                                                    >
                                                        Jadwal Interview
                                                        <Video className="ml-1 h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}


