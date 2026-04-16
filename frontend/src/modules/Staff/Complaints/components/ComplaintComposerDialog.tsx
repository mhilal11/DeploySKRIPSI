import { Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    FormField,
    FormSelect,
    FormTextarea,
} from '@/modules/Staff/Complaints/components/ComplaintComposerFields';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { router, useForm } from '@/shared/lib/inertia';
import {
    imageUploadRule,
    MAX_COMMON_UPLOAD_SIZE_BYTES,
    validateFile,
} from '@/shared/lib/input-validation';
import { route } from '@/shared/lib/route';

import type { ComplaintFiltersOptions } from '../types';
import type { ChangeEvent, FormEvent } from 'react';

interface ComplaintComposerDialogProps {
    open: boolean;
    filters: ComplaintFiltersOptions;
    onOpenChange: (open: boolean) => void;
}

type ComplaintFormData = {
    category: string;
    priority: string;
    subject: string;
    description: string;
    anonymous: boolean;
    attachments: File[];
};

export default function ComplaintComposerDialog({
    open,
    filters,
    onOpenChange,
}: ComplaintComposerDialogProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const form = useForm<ComplaintFormData>({
        category: '',
        priority: 'medium',
        subject: '',
        description: '',
        anonymous: false,
        attachments: [],
    });

    const hasErrors = Object.keys(form.errors).length > 0;

    const handleClose = () => {
        onOpenChange(false);
        resetForm();
        stopCameraStream();
    };

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);
        if (next) {
            form.clearErrors();
            setHasSubmitted(false);
        } else {
            resetForm();
            stopCameraStream();
        }
    };

    const resetForm = () => {
        form.reset();
        form.clearErrors();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setHasSubmitted(false);
        setCameraError(null);
        setShowCamera(false);
        setIsPlaying(false);
    };

    const applyAttachments = (files: File[]) => {
        if (files.length > 3) {
            toast.error('Lampiran tidak valid', {
                description: 'Maksimal 3 gambar dapat diunggah dalam satu pengaduan.',
            });
            return false;
        }

        let totalSize = 0;
        for (const file of files) {
            const validationMessage = validateFile(file, imageUploadRule);
            if (validationMessage) {
                toast.error('Lampiran tidak valid', {
                    description: validationMessage,
                });
                return false;
            }
            totalSize += file.size;
        }

        if (totalSize > MAX_COMMON_UPLOAD_SIZE_BYTES) {
            toast.error('Lampiran tidak valid', {
                description: 'Total ukuran seluruh gambar maksimal 5MB.',
            });
            return false;
        }

        form.setData('attachments', files);
        form.clearErrors('attachments');
        return true;
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (files.length === 0) {
            return;
        }
        applyAttachments([...form.data.attachments, ...files]);
    };

    useEffect(() => {
        mediaStreamRef.current = mediaStream;
    }, [mediaStream]);

    const stopCameraStream = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
        setMediaStream(null);
        setShowCamera(false);
        setIsPlaying(false);
    }, []);

    const handleOpenCamera = async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            mediaStreamRef.current = stream;
            setMediaStream(stream);
            setShowCamera(true);
            setIsPlaying(false);
        } catch {
            setCameraError('Tidak dapat membuka kamera. Periksa izin kamera atau gunakan unggah file.');
        }
    };

    const handleTakePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' });
            if (applyAttachments([...form.data.attachments, file])) {
                toast.success('Foto berhasil ditangkap dan dilampirkan.');
                stopCameraStream();
            }
        }, 'image/png');
    };

    const removeAttachment = (indexToRemove: number) => {
        const nextAttachments = form.data.attachments.filter((_, index) => index !== indexToRemove);
        form.setData('attachments', nextAttachments);
        form.clearErrors('attachments');
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setHasSubmitted(true);

        form.post(route('staff.complaints.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Pengaduan berhasil dikirim', {
                    description: 'Tim HR akan meninjau laporan Anda segera.',
                });
                void router.reload({
                    only: ['complaints', 'stats', 'filters'],
                    preserveScroll: true,
                    replace: true,
                });
                handleClose();
            },
            onError: () => {
                toast.error('Gagal mengirim pengaduan', {
                    description: 'Silakan periksa kembali formulir Anda.',
                });
            },
        });
    };

    useEffect(() => {
        return () => {
            stopCameraStream();
        };
    }, [stopCameraStream]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !mediaStream || !showCamera) return;

        video.srcObject = mediaStream;
        const handleLoaded = async () => {
            try {
                await video.play();
                setIsPlaying(true);
            } catch {
                setCameraError('Gagal memutar kamera. Coba izinkan kamera atau gunakan unggah file.');
                setIsPlaying(false);
            }
        };

        video.addEventListener('loadedmetadata', handleLoaded);
        return () => {
            video.removeEventListener('loadedmetadata', handleLoaded);
        };
    }, [mediaStream, showCamera]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Buat Pengaduan atau Saran</DialogTitle>
                    <DialogDescription>Formulir untuk mengirim pengaduan atau saran ke HR.</DialogDescription>
                </DialogHeader>
                <div className="flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto px-6 py-6">
                    {hasErrors && hasSubmitted && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            Periksa kembali data yang Anda masukkan. Beberapa field masih membutuhkan perhatian.
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                            <Checkbox
                                id="anonymous"
                                className="border-blue-400 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                                checked={form.data.anonymous}
                                onCheckedChange={(checked) => form.setData('anonymous', Boolean(checked))}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="anonymous" className="cursor-pointer text-sm font-medium text-blue-900">
                                    Kirim sebagai anonim
                                </Label>
                                <p className="text-xs text-slate-600">
                                    Identitas Anda tidak akan ditampilkan kepada pihak lain selain tim HR.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <FormSelect
                                label="Kategori"
                                placeholder="Pilih kategori"
                                value={form.data.category}
                                options={[
                                    { value: 'Lingkungan Kerja', label: 'Lingkungan Kerja' },
                                    { value: 'Kompensasi & Benefit', label: 'Kompensasi & Benefit' },
                                    { value: 'Fasilitas', label: 'Fasilitas' },
                                    { value: 'Relasi Kerja', label: 'Relasi Kerja' },
                                    { value: 'Kebijakan Perusahaan', label: 'Kebijakan Perusahaan' },
                                    { value: 'Lainnya', label: 'Lainnya' },
                                ]}
                                onChange={(value) => {
                                    form.setData('category', value);
                                    form.clearErrors('category');
                                }}
                                error={form.errors.category}
                            />

                            <FormSelect
                                label="Prioritas"
                                placeholder="Pilih prioritas"
                                value={form.data.priority}
                                options={[
                                    { value: 'high', label: 'Tinggi (Perlu perhatian segera)' },
                                    { value: 'medium', label: 'Sedang' },
                                    { value: 'low', label: 'Rendah' },
                                ]}
                                onChange={(value) => {
                                    form.setData('priority', value);
                                    form.clearErrors('priority');
                                }}
                                error={form.errors.priority}
                            />
                        </div>

                        <FormField
                            label="Subjek"
                            value={form.data.subject}
                            placeholder="Ringkasan singkat pengaduan/saran"
                            onChange={(value) => {
                                form.setData('subject', value);
                                form.clearErrors('subject');
                            }}
                            error={form.errors.subject}
                        />

                        <FormTextarea
                            label="Deskripsi Detail"
                            value={form.data.description}
                            placeholder="Jelaskan secara detail pengaduan atau saran Anda..."
                            onChange={(value) => {
                                form.setData('description', value);
                                form.clearErrors('description');
                            }}
                            error={form.errors.description}
                        />

                        <div>
                            <Label>Lampiran Gambar (Opsional - Maksimal 3 gambar, total 5MB)</Label>
                            <div className="space-y-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept=".jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 transition hover:border-blue-500 hover:text-blue-700"
                                >
                                    <Upload className="mb-2 h-6 w-6" />
                                    {form.data.attachments.length > 0
                                        ? 'Tambah atau ganti gambar pendukung'
                                        : 'Upload bukti pendukung (JPG, JPEG, PNG)'}
                                </button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-center border-blue-200 text-blue-900 hover:border-blue-300 hover:bg-blue-50"
                                    onClick={handleOpenCamera}
                                >
                                    Buka Kamera & Ambil Foto
                                </Button>
                                {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}
                                {showCamera && (
                                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-semibold text-slate-700">Mode Kamera</p>
                                        <video
                                            ref={videoRef}
                                            className="w-full rounded-md bg-black"
                                            playsInline
                                            autoPlay
                                            muted
                                        />
                                        {!isPlaying && !cameraError && (
                                            <p className="text-xs text-slate-500">Menghubungkan ke kamera...</p>
                                        )}
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                className="flex-1 bg-blue-900 text-white hover:bg-blue-800"
                                                onClick={handleTakePhoto}
                                            >
                                                Ambil Foto
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={stopCameraStream}
                                            >
                                                Batal
                                            </Button>
                                        </div>
                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                )}
                                {form.data.attachments.length > 0 && (
                                    <div className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium text-slate-900">
                                                {form.data.attachments.length} gambar dipilih
                                            </p>
                                            <p>
                                                {formatFileSize(
                                                    form.data.attachments.reduce((total, file) => total + file.size, 0),
                                                )}{' '}
                                                / 5MB
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            {form.data.attachments.map((attachment, index) => (
                                                <div
                                                    key={`${attachment.name}-${attachment.size}-${index}`}
                                                    className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-slate-900">
                                                            {attachment.name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {formatFileSize(attachment.size)}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="font-semibold text-blue-900 hover:underline"
                                                            onClick={() => {
                                                                const url = URL.createObjectURL(attachment);
                                                                const preview = window.open(url, '_blank');
                                                                if (preview) {
                                                                    preview.onload = () => URL.revokeObjectURL(url);
                                                                }
                                                            }}
                                                        >
                                                            Lihat
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="font-semibold text-red-600 hover:underline"
                                                            onClick={() => removeAttachment(index)}
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500">
                                    Format yang diterima: JPG, JPEG, PNG. Maksimal 3 gambar dengan total ukuran 5MB.
                                </p>
                            </div>
                            {form.errors.attachments && (
                                <p className="mt-1 text-xs text-red-500">{form.errors.attachments}</p>
                            )}
                        </div>

                        <DialogFooter className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={handleClose}
                                disabled={form.processing}
                            >
                                Batalkan
                            </Button>
                            <Button
                                type="submit"
                                className="w-full bg-blue-900 text-white hover:bg-blue-800 sm:w-auto"
                                disabled={form.processing}
                            >
                                {form.processing ? 'Mengirim...' : 'Kirim Pengaduan/Saran'}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function formatFileSize(size: number) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
