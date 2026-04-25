import { FileText, ChevronDown, ChevronUp, ExternalLink, Briefcase, Calendar, GraduationCap } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

export interface ApplicationItem {
    id: number;
    position: string;
    division: string | null;
    status: string;
    submitted_at: string;
    full_name: string;
    email: string;
    phone: string | null;
    education: string | null;
    experience: string | null;
    skills: string | null;
    cv_file: string | null;
    notes: string | null;
    rejection_reason?: string | null;
}

interface DocumentsCardProps {
    applications: ApplicationItem[];
    onNewApplication?: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Hired':
            return 'border-green-500 text-green-500 bg-green-50';
        case 'Interview':
            return 'border-blue-500 text-blue-500 bg-blue-50';
        case 'Screening':
            return 'border-yellow-500 text-yellow-500 bg-yellow-50';
        case 'Rejected':
            return 'border-red-500 text-red-500 bg-red-50';
        default:
            return 'border-orange-500 text-orange-500 bg-orange-50';
    }
};

export default function DocumentsCard({
    applications,
    onNewApplication,
}: DocumentsCardProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const openPDF = (cvFile: string) => {
        window.open(`/storage/${cvFile}`, '_blank');
    };

    return (
        <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-900">
                    Lamaran Saya
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onNewApplication}
                    className="border-blue-200 text-blue-900 hover:bg-blue-50"
                >
                    Buat Lamaran Baru
                </Button>
            </div>
            {applications.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Belum ada lamaran yang diajukan.
                </p>
            ) : (
                <div className="space-y-3">
                    {applications.map((app) => (
                        <div
                            key={app.id}
                            className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                        >
                            <div
                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => toggleExpand(app.id)}
                            >
                                <Briefcase className="h-5 w-5 text-blue-900 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                        {app.position}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {app.submitted_at}
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={getStatusColor(app.status)}
                                >
                                    {app.status}
                                </Badge>
                                {expandedId === app.id ? (
                                    <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                )}
                            </div>

                            {expandedId === app.id && (
                                <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                                    <div className="grid grid-cols-1 gap-2">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500">Nama Lengkap</p>
                                            <p className="text-sm text-slate-900">{app.full_name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Email</p>
                                                <p className="text-sm text-slate-900 truncate">{app.email}</p>
                                            </div>
                                            {app.phone && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Telepon</p>
                                                    <p className="text-sm text-slate-900">{app.phone}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {app.division && (
                                        <div>
                                            <p className="text-xs font-medium text-slate-500">Divisi</p>
                                            <p className="text-sm text-slate-900">{app.division}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        {app.education && (
                                            <div className="flex items-start gap-2">
                                                <GraduationCap className="h-4 w-4 text-blue-900 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Pendidikan</p>
                                                    <p className="text-sm text-slate-900">{app.education}</p>
                                                </div>
                                            </div>
                                        )}
                                        {app.experience && (
                                            <div className="flex items-start gap-2">
                                                <Calendar className="h-4 w-4 text-blue-900 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Pengalaman</p>
                                                    <p className="text-sm text-slate-900">{app.experience}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {app.status === 'Rejected' && app.rejection_reason && (
                                        <div className="pt-2 border-t border-red-200">
                                            <p className="text-xs font-medium text-red-700 mb-1">
                                                Alasan Penolakan
                                            </p>
                                            <p className="text-sm text-red-800 bg-red-50 rounded p-2 border border-red-200">
                                                {app.rejection_reason}
                                            </p>
                                        </div>
                                    )}

                                    {app.cv_file && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openPDF(app.cv_file!)}
                                                className="w-full border-blue-200 text-blue-900 hover:bg-blue-50"
                                            >
                                                <FileText className="h-4 w-4 mr-2" />
                                                Lihat CV/Resume
                                                <ExternalLink className="h-3 w-3 ml-2" />
                                            </Button>
                                        </div>
                                    )}

                                    {app.notes && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <p className="text-xs font-medium text-slate-500 mb-1">Catatan</p>
                                            <p className="text-sm text-slate-700 bg-white rounded p-2 border border-slate-200">
                                                {app.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
