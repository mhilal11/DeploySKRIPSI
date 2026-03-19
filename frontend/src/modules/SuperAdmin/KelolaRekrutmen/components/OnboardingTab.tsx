import { CheckCircle, Clock, XCircle, FileText, UserPlus, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { router } from '@/shared/lib/inertia';

import { OnboardingItem } from '../types';
import OnboardingDetailDialog from './OnboardingDetailDialog';


interface OnboardingTabProps {
    items: OnboardingItem[];
    onChecklistSaved?: (
        applicationId: number,
        checklist: {
            contract_signed: boolean;
            inventory_handover: boolean;
            training_orientation: boolean;
        },
    ) => void;
    onConvertToStaffSuccess?: (applicationId: number) => void;
}

export default function OnboardingTab({
    items,
    onChecklistSaved,
    onConvertToStaffSuccess,
}: OnboardingTabProps) {
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OnboardingItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleViewDetail = (item: OnboardingItem) => {
        setSelectedItem(item);
        setDetailOpen(true);
    };

    const handleConvertToStaff = (applicationId: number) => {
        router.post(route('super-admin.onboarding.convert-to-staff', applicationId), {}, {
            onSuccess: () => {
                onConvertToStaffSuccess?.(applicationId);
                toast.success('Berhasil menjadikan staff', {
                    description: 'Akun pelamar telah diubah menjadi akun staff.',
                });
            },
            onError: (errors) => {
                toast.error('Gagal menjadikan staff', {
                    description: errors.message || 'Terjadi kesalahan saat memproses permintaan.',
                });
            },
        });
    };

    return (
        <>
            <Card className="space-y-6 p-6">
                {items.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">
                        Belum ada proses onboarding yang berjalan.
                    </p>
                ) : (
                    <div className="grid gap-4">
                        {paginatedItems.map((item) => (
                            <div
                                key={`${item.name}-${item.position}`}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {item.name} - {item.position}
                                        </p>
                                        <p className="text-sm text-slate-600">Tanggal Melamar: {item.startedAt}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={item.status === 'Selesai' ? 'bg-green-500' : 'bg-orange-500'}>
                                            {item.status}
                                        </Badge>
                                        {item.status === 'Selesai' && (
                                            <>
                                                {item.is_staff ? (
                                                    <div className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded-md border border-green-200">
                                                        <Check className="h-4 w-4" />
                                                        Berhasil
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                        onClick={() => handleConvertToStaff(item.application_id)}
                                                    >
                                                        <UserPlus className="mr-2 h-4 w-4" />
                                                        Jadikan Akun Staff
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewDetail(item)}
                                            className="border-blue-200 text-blue-900 hover:bg-blue-50"
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            Detail
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {item.steps.map((step) => (
                                        <div key={step.label} className="flex items-center gap-2 text-sm">
                                            {step.complete ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : step.pending ? (
                                                <Clock className="h-4 w-4 text-orange-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-slate-300" />
                                            )}
                                            <span
                                                className={
                                                    step.complete
                                                        ? 'text-slate-700'
                                                        : step.pending
                                                            ? 'text-slate-400'
                                                            : 'text-slate-600'
                                                }
                                            >
                                                {step.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                        <div className="text-xs text-slate-500">
                            Menampilkan {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, items.length)} dari {items.length} data
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Previous</span>
                                <span aria-hidden="true"></span>
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(page)}
                                        className="h-8 w-8 p-0"
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Next</span>
                                <span aria-hidden="true"></span>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <OnboardingDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                item={selectedItem}
                onSaved={onChecklistSaved}
            />
        </>
    );
}




