import { Upload, FileText, ImageIcon, X, Check, CloudUpload } from 'lucide-react';
import Image from 'next/image';
import { useState, useRef, useCallback } from 'react';
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
import { imageOrPdfUploadRule, validateFile as validateSelectedFile } from '@/shared/lib/input-validation';

interface FileUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFileSelect: (file: File) => void;
    currentFileName?: string | null;
    currentFileUrl?: string | null;
    disabled?: boolean;
}

export default function FileUploadDialog({
    open,
    onOpenChange,
    onFileSelect,
    currentFileName,
    currentFileUrl,
    disabled = false,
}: FileUploadDialogProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): boolean => {
        const errorMessage = validateSelectedFile(file, imageOrPdfUploadRule);
        if (errorMessage) {
            toast.error('Format file tidak valid', {
                description: errorMessage,
            });
            return false;
        }
        return true;
    };

    const handleFile = useCallback((file: File) => {
        if (!validateFile(file)) return;

        setPreviewFile(file);

        // Create preview URL for images
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [disabled, handleFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleConfirm = () => {
        if (previewFile) {
            onFileSelect(previewFile);
            toast.success('File berhasil dipilih');
            handleClose();
        }
    };

    const handleClose = () => {
        // Cleanup preview URL
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewFile(null);
        setPreviewUrl(null);
        onOpenChange(false);
    };

    const handleRemovePreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewFile(null);
        setPreviewUrl(null);
    };

    const isPdf = previewFile?.type === 'application/pdf';
    const hasExistingFile = currentFileName && currentFileUrl;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xl p-8 gap-8">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">Upload Sertifikat</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Unggah file sertifikat Anda dalam format PDF atau Gambar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Existing File Info */}
                    {hasExistingFile && !previewFile && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-slate-900">File Saat Ini</p>
                                    <a
                                        href={currentFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all block"
                                    >
                                        {currentFileName}
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Area or Drop Zone */}
                    {previewFile ? (
                        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex p-4 gap-4 items-center">
                                {/* Thumbnail */}
                                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                    {previewUrl && !isPdf ? (
                                        <Image
                                            src={previewUrl}
                                            alt="Preview"
                                            width={80}
                                            height={80}
                                            unoptimized
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            {isPdf ? (
                                                <FileText className="h-10 w-10 text-red-500" />
                                            ) : (
                                                <ImageIcon className="h-10 w-10 text-blue-500" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* File Details */}
                                <div className="flex-1 min-w-0 pr-8">
                                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                                        {previewFile.name}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {(previewFile.size / 1024).toFixed(1)} KB  {isPdf ? 'PDF Document' : 'Image'}
                                    </p>
                                    <div className="mt-2 flex items-center text-xs text-green-600 font-medium">
                                        <Check className="mr-1 h-3 w-3" />
                                        Siap diupload
                                    </div>
                                </div>

                                {/* Remove Button */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleRemovePreview}
                                    className="absolute top-2 right-2 h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !disabled && fileInputRef.current?.click()}
                            className={`
                                group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer
                                transition-all duration-300 ease-in-out
                                ${isDragging
                                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={disabled}
                            />

                            {/* Icon Circle */}
                            <div className={`
                                flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100 transition-all duration-300
                                group-hover:bg-white group-hover:scale-110 group-hover:ring-blue-100 group-hover:shadow-md
                            `}>
                                <CloudUpload className={`h-8 w-8 transition-colors duration-300 ${isDragging ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-900">
                                    <span className="text-blue-600 hover:underline">Klik untuk upload</span> atau seret file
                                </p>
                                <p className="text-xs text-slate-500">
                                    JPG, PNG, atau PDF (Maks. 5MB)
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!previewFile || disabled}
                        className="bg-blue-900 hover:bg-blue-800 text-white shadow-sm"
                    >
                        Pilih File Ini
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}





