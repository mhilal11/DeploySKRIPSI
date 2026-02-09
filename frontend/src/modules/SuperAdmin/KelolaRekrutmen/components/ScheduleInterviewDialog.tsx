// src/Pages/SuperAdmin/Recruitment/components/ScheduleInterviewDialog.tsx

import {
    Loader2,
    Calendar,
    Clock,
    Video,
    MapPin,
    Link as LinkIcon,
    User,
    FileText,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { useForm } from '@/shared/lib/inertia';

import { ApplicantRecord, InterviewSchedule } from '../types';


const SLOT_INTERVAL_MINUTES = 30;
// Menambah sedikit buffer slot agar waktu selesai bisa dipilih hingga sore
const TIME_SLOTS = Array.from({ length: 24 }, (_, index) => {
    const minutes = 8 * 60 + index * SLOT_INTERVAL_MINUTES; // Mulai jam 08:00
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}`;
});

interface ScheduleData extends Record<string, any> {
    date: string;
    time: string;
    end_time: string;
    mode: string;
    interviewer: string;
    meeting_link: string;
    notes: string;
}

interface ScheduleInterviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    applicant: ApplicantRecord | null;
    onSuccessSubmit: (
        applicantId: number,
        scheduleData: {
            date: string;
            time: string;
            end_time: string;
            mode: string;
            interviewer: string;
            meeting_link: string;
            notes: string;
        },
    ) => void;
    existingInterviews?: InterviewSchedule[];
}

export default function ScheduleInterviewDialog({
    open,
    onOpenChange,
    applicant,
    onSuccessSubmit,
    existingInterviews = [],
}: ScheduleInterviewDialogProps) {
    const [conflictError, setConflictError] = useState('');
    const [timeRangeError, setTimeRangeError] = useState('');
    const { data, setData, post, processing, errors, reset } = useForm<ScheduleData>({
        date: '',
        time: '09:00',
        end_time: '09:30',
        mode: 'Online',
        interviewer: 'Tim HR',
        meeting_link: '',
        notes: '',
    });

    const addMinutes = (timeStr: string, minutes: number) => {
        const [h, m] = timeStr.split(':').map(Number);
        const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
        const wrapped = ((total % 1440) + 1440) % 1440;
        const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
        const mm = String(wrapped % 60).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    const toMinutes = (timeStr?: string | null): number | null => {
        if (!timeStr || !timeStr.includes(':')) return null;
        const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
    };

    const buildBlockedSlots = useCallback(
        (selectedDate?: string) => {
            const blocked = new Set<string>();
            if (!selectedDate) return blocked;

            existingInterviews.forEach((interview) => {
                if (!interview.time || !interview.date) return;
                const interviewDate = interview.date_value ?? interview.date;
                if (interviewDate !== selectedDate) return;
                if (applicant && interview.application_id === applicant.id) return;

                const interviewStart = toMinutes(interview.time);
                const interviewEnd =
                    toMinutes(interview.end_time) ??
                    (interviewStart !== null ? interviewStart + SLOT_INTERVAL_MINUTES : null);
                if (interviewStart === null || interviewEnd === null) return;

                TIME_SLOTS.forEach((slot) => {
                    const slotStart = toMinutes(slot);
                    if (slotStart === null) return;
                    const slotEnd = slotStart + SLOT_INTERVAL_MINUTES;
                    if (slotStart < interviewEnd && slotEnd > interviewStart) {
                        blocked.add(slot);
                    }
                });
            });

            return blocked;
        },
        [existingInterviews, applicant],
    );

    const getFirstAvailableSlot = useCallback(
        (selectedDate?: string) => {
            if (!selectedDate) return '';
            const blocked = buildBlockedSlots(selectedDate);
            return TIME_SLOTS.find((slot) => !blocked.has(slot)) ?? '';
        },
        [buildBlockedSlots],
    );

    const blockedSlots = useMemo(
        () => buildBlockedSlots(data.date),
        [buildBlockedSlots, data.date],
    );

    useEffect(() => {
        if (!open || !applicant) {
            reset();
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const initialDate = applicant.interview_date ?? today;
        const normalizedTime = applicant.interview_time
            ? applicant.interview_time.slice(0, 5)
            : getFirstAvailableSlot(initialDate);

        const defaultEnd = normalizedTime
            ? addMinutes(normalizedTime, SLOT_INTERVAL_MINUTES)
            : '';
        const normalizedEnd = applicant.interview_end_time
            ? applicant.interview_end_time.slice(0, 5)
            : defaultEnd;

        setData(() => ({
            date: initialDate,
            time: normalizedTime,
            end_time: normalizedEnd,
            mode: applicant.interview_mode ?? 'Online',
            interviewer: applicant.interviewer_name ?? 'Tim HR',
            meeting_link: applicant.meeting_link ?? '',
            notes: applicant.interview_notes ?? '',
        }));
        setConflictError('');
        setTimeRangeError('');
    }, [open, applicant, reset, setData, getFirstAvailableSlot]);

    const handleDateChange = (value: string) => {
        setConflictError('');
        setTimeRangeError('');
        setData((prev) => {
            const updated = { ...prev, date: value };
            const blocked = buildBlockedSlots(value);
            const nextSlot = getFirstAvailableSlot(value);
            if (!nextSlot) {
                updated.time = '';
                updated.end_time = '';
                return updated;
            }

            updated.time = nextSlot;
            updated.end_time = addMinutes(nextSlot, SLOT_INTERVAL_MINUTES);
            return updated;
        });
    };

    const hasTimeConflict = useMemo(() => {
        if (!data.date || !data.time || !data.end_time) return false;
        if (blockedSlots.has(data.time)) return true;

        const desiredStart = toMinutes(data.time);
        const desiredEnd = toMinutes(data.end_time);
        if (desiredStart === null || desiredEnd === null) return false;

        return existingInterviews.some((interview) => {
            if (!interview.date || !interview.time) return false;
            const interviewDate = interview.date_value ?? interview.date;
            const interviewStart = toMinutes(interview.time);
            const interviewEnd =
                toMinutes(interview.end_time) ??
                (interviewStart !== null ? interviewStart + SLOT_INTERVAL_MINUTES : null);
            if (interviewStart === null || interviewEnd === null) return false;

            const overlaps =
                interviewDate === data.date &&
                desiredStart < interviewEnd &&
                desiredEnd > interviewStart;
            const isSameApplicant = applicant && interview.application_id === applicant.id;
            return overlaps && !isSameApplicant;
        });
    }, [data.date, data.time, data.end_time, blockedSlots, existingInterviews, applicant]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!applicant || processing) return;
        const startMinutes = toMinutes(data.time) || 0;
        const endMinutes = toMinutes(data.end_time) || 0;

        if (endMinutes <= startMinutes) {
            setTimeRangeError('Waktu selesai harus lebih besar dari waktu mulai.');
            return;
        }
        if (hasTimeConflict) {
            setConflictError('Slot waktu ini sudah terpakai (overlap).');
            return;
        }
        setConflictError('');
        setTimeRangeError('');

        post(
            route('super-admin.recruitment.schedule-interview', applicant.id),
            {
                onSuccess: () => {
                    onSuccessSubmit(applicant.id, {
                        date: data.date,
                        time: data.time,
                        end_time: data.end_time,
                        mode: data.mode,
                        interviewer: data.interviewer,
                        meeting_link: data.meeting_link,
                        notes: data.notes,
                    });
                    toast.success(isEditing ? 'Jadwal interview diperbarui.' : 'Jadwal interview disimpan.');
                },
                onError: (backendErrors) => {
                    toast.error('Gagal menyimpan jadwal interview.', {
                        description:
                            Object.values(backendErrors)[0] ??
                            'Periksa kembali data yang diisi.',
                    });
                }
            }
        );
    };

    if (!applicant) return null;

    const isEditing = Boolean(
        applicant.has_interview_schedule ||
        applicant.interview_date ||
        applicant.interview_time ||
        applicant.interview_mode
    );
    const timeErrorMessage = timeRangeError || conflictError || errors['time'] || '';

    // Helpers untuk render dropdown selesai
    const startMinutes = toMinutes(data.time) || 0;

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-6 transition-all duration-200">
                <DialogHeader className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                            {isEditing ? 'Edit Jadwal Wawancara' : 'Jadwalkan Wawancara'}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-slate-500 leading-relaxed">
                        Atur detail waktu wawancara untuk <span className="font-semibold text-slate-900">{applicant.name}</span> ({applicant.position}).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* SECTION 1: WAKTU */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="date" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Tanggal
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={data.date}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                                {errors['date'] && <p className="text-xs text-red-500 font-medium">{errors['date']}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="mode" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    {data.mode === 'Online' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                    Mode
                                </Label>
                                <Select
                                    value={data.mode}
                                    onValueChange={(value) => setData('mode', value)}
                                    disabled={processing}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors">
                                        <SelectValue placeholder="Pilih Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Online">Online (Zoom/GMeet)</SelectItem>
                                        <SelectItem value="Offline">Offline (Kantor)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Wrapper Waktu Mulai & Selesai agar sejajar */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="time" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Mulai
                                </Label>
                                <Select
                                    value={data.time}
                                    onValueChange={(value) => {
                                        setData((prev) => ({
                                            ...prev,
                                            time: value,
                                            end_time: addMinutes(value, SLOT_INTERVAL_MINUTES),
                                        }));
                                        setConflictError('');
                                        setTimeRangeError('');
                                    }}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors">
                                        <SelectValue placeholder="Jam" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {TIME_SLOTS.map((slot) => (
                                            <SelectItem
                                                key={`start-${slot}`}
                                                value={slot}
                                                disabled={blockedSlots.has(slot)}
                                            >
                                                {slot}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="end_time" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    Selesai
                                </Label>
                                <Select
                                    value={data.end_time}
                                    onValueChange={(value) => {
                                        setData('end_time', value);
                                        setConflictError('');
                                        setTimeRangeError('');
                                    }}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors">
                                        <SelectValue placeholder="Jam" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {TIME_SLOTS.map((slot) => {
                                            const slotMin = toMinutes(slot) || 0;
                                            // Disable jika waktu slot <= waktu mulai
                                            const isInvalid = slotMin <= startMinutes;
                                            return (
                                                <SelectItem
                                                    key={`end-${slot}`}
                                                    value={slot}
                                                    disabled={isInvalid}
                                                    className={isInvalid ? 'text-muted-foreground opacity-50' : ''}
                                                >
                                                    {slot}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Error Message Container */}
                    {timeErrorMessage && (
                        <div className="flex items-start gap-3 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-medium">{timeErrorMessage}</p>
                        </div>
                    )}


                    {/* SECTION 2: TEKNIS & LOKASI */}
                    <div className="space-y-4">
                        {data.mode === 'Online' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="meeting_link" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    Link Meeting
                                </Label>
                                <Input
                                    id="meeting_link"
                                    value={data.meeting_link}
                                    onChange={(e) => setData('meeting_link', e.target.value)}
                                    placeholder="https://meet.google.com/..."
                                    required
                                    className="h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                                {errors['meeting_link'] && <p className="text-xs text-red-500 font-medium">{errors['meeting_link']}</p>}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="interviewer" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                Pewawancara
                            </Label>
                            <Input
                                id="interviewer"
                                value={data.interviewer}
                                onChange={(e) => setData('interviewer', e.target.value)}
                                required
                                disabled={processing}
                                placeholder="Nama Pewawancara / Tim HR"
                                className="h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            />
                            {errors['interviewer'] && <p className="text-xs text-red-500 font-medium">{errors['interviewer']}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                Catatan Tambahan
                            </Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Contoh: Harap siapkan portofolio, berpakaian formal..."
                                required
                                className="min-h-[100px] resize-none bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            />
                            {errors['notes'] && <p className="text-xs text-red-500 font-medium">{errors['notes']}</p>}
                        </div>
                    </div>


                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-10 px-8"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                'Simpan Jadwal'
                            )}
                        </Button>
                    </DialogFooter>
                </form>

            </DialogContent>
        </Dialog>
    );
}



