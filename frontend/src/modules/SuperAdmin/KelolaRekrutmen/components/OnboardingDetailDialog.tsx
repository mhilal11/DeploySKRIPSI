import { CheckCircle, FileText, Package, GraduationCap, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { router } from '@/shared/lib/inertia';

import { OnboardingItem } from '../types';

interface OnboardingDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: OnboardingItem | null;
    onSaved?: (
        applicationId: number,
        checklist: {
            contract_signed: boolean;
            inventory_handover: boolean;
            training_orientation: boolean;
        },
    ) => void;
}

export default function OnboardingDetailDialog({
    open,
    onOpenChange,
    item,
    onSaved,
}: OnboardingDetailDialogProps) {
    const [checklist, setChecklist] = useState({
        contract_signed: false,
        inventory_handover: false,
        training_orientation: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    // Initialize checklist from item data when dialog opens
    useEffect(() => {
        if (item && item.steps) {
            // Load existing checklist data from item.steps
            setChecklist({
                contract_signed: item.steps[0]?.complete ?? false,
                inventory_handover: item.steps[1]?.complete ?? false,
                training_orientation: item.steps[2]?.complete ?? false,
            });
        }
    }, [item]);

    if (!item) return null;

    const handleCheckChange = (key: keyof typeof checklist) => {
        setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const allChecked = Object.values(checklist).every((value) => value);

    // Calculate progress percentage
    const checkedCount = Object.values(checklist).filter(Boolean).length;
    const progressPercent = Math.round((checkedCount / 3) * 100);

    const handleSaveProgress = () => {
        if (!item) return;

        setIsSaving(true);

        // Use application_id instead of name
        router.post(
            route('super-admin.onboarding.update-checklist', { id: item.application_id }),
            {
                contract_signed: checklist.contract_signed,
                inventory_handover: checklist.inventory_handover,
                training_orientation: checklist.training_orientation,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    onSaved?.(item.application_id, checklist);
                    toast.success('Progress onboarding berhasil disimpan.');
                    onOpenChange(false);
                },
                onError: (errors) => {
                    setIsSaving(false);
                    toast.error('Gagal menyimpan progress onboarding.', {
                        description:
                            Object.values(errors)[0] ??
                            'Terjadi kesalahan saat menyimpan checklist.',
                    });
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-6 transition-all duration-200">
                <DialogHeader className="mb-2">
                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                        Detail Onboarding
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Applicant Info - Integrated Card */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 flex items-start gap-4">
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                            <User className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 truncate">{item.name}</h3>
                                    <p className="text-sm text-slate-500 truncate">{item.position}</p>
                                </div>
                                <Badge
                                    variant={item.status === 'Selesai' ? 'default' : 'secondary'}
                                    className={`${item.status === 'Selesai'
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
                                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200'
                                        } border shadow-none`}
                                >
                                    {item.status}
                                </Badge>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 font-medium bg-white/50 w-fit px-2 py-1 rounded-md border border-slate-100">
                                Mulai: {item.startedAt}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-slate-600">
                            <span>Progress Onboarding</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Checklist Onboarding */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-900">Checklist Item</h3>
                            <span className="text-xs text-slate-500">
                                {checkedCount}/3 Selesai
                            </span>
                        </div>

                        <div className="space-y-3">
                            {/* Kontrak ditandatangani */}
                            <div className={`group flex items-start space-x-3 rounded-xl border p-3 transition-colors ${checklist.contract_signed ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                                <Checkbox
                                    id="contract_signed"
                                    checked={checklist.contract_signed}
                                    onCheckedChange={() => handleCheckChange('contract_signed')}
                                    className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <div className="flex-1 space-y-1">
                                    <Label
                                        htmlFor="contract_signed"
                                        className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900"
                                    >
                                        <FileText className={`h-4 w-4 ${checklist.contract_signed ? 'text-blue-600' : 'text-slate-400'}`} />
                                        Kontrak ditandatangani
                                    </Label>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Pastikan kontrak kerja telah ditandatangani oleh karyawan baru
                                    </p>
                                </div>
                            </div>

                            {/* Serah terima inventaris */}
                            <div className={`group flex items-start space-x-3 rounded-xl border p-3 transition-colors ${checklist.inventory_handover ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
                                <Checkbox
                                    id="inventory_handover"
                                    checked={checklist.inventory_handover}
                                    onCheckedChange={() => handleCheckChange('inventory_handover')}
                                    className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <div className="flex-1 space-y-1">
                                    <Label
                                        htmlFor="inventory_handover"
                                        className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900"
                                    >
                                        <Package className={`h-4 w-4 ${checklist.inventory_handover ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        Serah terima inventaris
                                    </Label>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Serah terima peralatan kerja seperti laptop, ID card, dll
                                    </p>
                                </div>
                            </div>

                            {/* Training & orientasi */}
                            <div className={`group flex items-start space-x-3 rounded-xl border p-3 transition-colors ${checklist.training_orientation ? 'bg-purple-50/50 border-purple-100' : 'bg-white border-slate-200 hover:border-purple-200'}`}>
                                <Checkbox
                                    id="training_orientation"
                                    checked={checklist.training_orientation}
                                    onCheckedChange={() => handleCheckChange('training_orientation')}
                                    className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                />
                                <div className="flex-1 space-y-1">
                                    <Label
                                        htmlFor="training_orientation"
                                        className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900"
                                    >
                                        <GraduationCap className={`h-4 w-4 ${checklist.training_orientation ? 'text-purple-600' : 'text-slate-400'}`} />
                                        Training & orientasi
                                    </Label>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Karyawan telah mengikuti program training dan orientasi perusahaan
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Progress indicator */}
                        {allChecked && (
                            <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 animate-in fade-in zoom-in duration-300">
                                <CheckCircle className="h-5 w-5 fill-green-100 text-green-600" />
                                <span className="font-semibold">
                                    Semua checklist telah selesai!
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-8 gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="h-9"
                    >
                        Tutup
                    </Button>
                    <Button
                        onClick={handleSaveProgress}
                        className="bg-slate-900 hover:bg-slate-800 text-white h-9"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Menyimpan...' : 'Simpan Progress'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}



