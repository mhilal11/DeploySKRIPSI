import { Plus, Save, Trash2, Upload, FileText, ImageIcon, Download, Eye, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import { Certification, RequiredCertificationField } from '../profileTypes';
import FileUploadDialog from './FileUploadDialog';

interface CertificationFormProps {
    certifications: Certification[];
    onChange: (id: string, key: keyof Certification, value: string | File | null) => void;
    onClearFile: (id: string) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onSave: () => void;
    processing: boolean;
    getFieldError: (index: number, field: RequiredCertificationField) => string | undefined;
    baseError?: string;
    disabled?: boolean;
}

export default function CertificationForm({
    certifications,
    onChange,
    onClearFile,
    onAdd,
    onRemove,
    onSave,
    processing,
    getFieldError,
    baseError,
    disabled = false,
}: CertificationFormProps) {
    const [uploadDialogOpen, setUploadDialogOpen] = useState<string | null>(null);

    const getFileIcon = (certification: Certification) => {
        if (certification.file) {
            return certification.file.type === 'application/pdf' ? (
                <FileText className="h-5 w-5 text-red-500" />
            ) : (
                <ImageIcon className="h-5 w-5 text-blue-500" />
            );
        }
        if (certification.file_url) {
            const isPdf = certification.file_name?.toLowerCase().endsWith('.pdf');
            return isPdf ? (
                <FileText className="h-5 w-5 text-red-500" />
            ) : (
                <ImageIcon className="h-5 w-5 text-blue-500" />
            );
        }
        return null;
    };

    const getFileName = (certification: Certification) => {
        if (certification.file) {
            return certification.file.name;
        }
        if (certification.file_name) {
            return certification.file_name;
        }
        return null;
    };

    const handleFileSelect = (certId: string, file: File) => {
        onChange(certId, 'file', file);
        setUploadDialogOpen(null);
    };

    return (
        <Card className="p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-blue-900">Sertifikasi</h3>
                    <p className="text-sm text-slate-500">
                        Tambahkan sertifikat profesional yang Anda miliki (opsional).
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onAdd}
                    className="border-blue-200 text-blue-900 hover:bg-blue-50"
                    disabled={disabled}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Sertifikasi
                </Button>
            </div>
            {baseError && <p className="mb-4 text-sm text-red-500">{baseError}</p>}

            {certifications.length === 0 ? (
                <p className="text-sm text-slate-500">
                    Belum ada sertifikasi ditambahkan. Anda dapat menambahkan kapan saja.
                </p>
            ) : (
                <div className="space-y-4">
                    {certifications.map((certification, index) => (
                        <div key={certification.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <Badge variant="outline">Sertifikasi #{index + 1}</Badge>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemove(certification.id)}
                                    className="text-red-500 hover:text-red-600"
                                    disabled={disabled}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label>
                                        Nama Sertifikasi <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={certification.name ?? ''}
                                        onChange={(event) =>
                                            onChange(certification.id, 'name', event.target.value)
                                        }
                                        placeholder="Contoh: AWS Certified Solutions Architect"
                                        disabled={disabled}
                                    />
                                    {getFieldError(index, 'name') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'name')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>
                                        Organisasi Penerbit <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={certification.issuing_organization ?? ''}
                                        onChange={(event) =>
                                            onChange(certification.id, 'issuing_organization', event.target.value)
                                        }
                                        placeholder="Contoh: Amazon Web Services"
                                        disabled={disabled}
                                    />
                                    {getFieldError(index, 'issuing_organization') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'issuing_organization')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>
                                        Tanggal Terbit <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="month"
                                        value={certification.issue_date ?? ''}
                                        onChange={(event) =>
                                            onChange(certification.id, 'issue_date', event.target.value)
                                        }
                                        disabled={disabled}
                                    />
                                    {getFieldError(index, 'issue_date') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'issue_date')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>Tanggal Kadaluarsa</Label>
                                    <Input
                                        type="month"
                                        value={certification.expiry_date ?? ''}
                                        onChange={(event) =>
                                            onChange(certification.id, 'expiry_date', event.target.value)
                                        }
                                        disabled={disabled}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Kosongkan jika sertifikat tidak memiliki masa berlaku
                                    </p>
                                    {getFieldError(index, 'expiry_date') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'expiry_date')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>ID Kredensial</Label>
                                    <Input
                                        value={certification.credential_id ?? ''}
                                        onChange={(event) =>
                                            onChange(certification.id, 'credential_id', event.target.value)
                                        }
                                        placeholder="Contoh: ABC123XYZ"
                                        disabled={disabled}
                                    />
                                </div>
                                <div>
                                    <Label>Upload Sertifikat</Label>

                                    {/* Display uploaded file or new file */}
                                    {(certification.file || certification.file_url) ? (
                                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                            <div className="flex items-center gap-3">
                                                {getFileIcon(certification)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">
                                                        {getFileName(certification)}
                                                    </p>
                                                    {certification.file && (
                                                        <p className="text-xs text-slate-500">
                                                            Baru  {(certification.file.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    )}
                                                    {certification.file_url && !certification.file && (
                                                        <p className="text-xs text-green-600">
                                                             Sudah tersimpan
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {/* View/Download buttons for saved file */}
                                                    {certification.file_url && !certification.file && (
                                                        <>
                                                            <a
                                                                href={certification.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                                                title="Lihat File"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </a>
                                                            <a
                                                                href={certification.file_url}
                                                                download
                                                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                                                title="Download File"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </>
                                                    )}
                                                    {/* Remove button */}
                                                    {!disabled && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onClearFile(certification.id)}
                                                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                            title="Hapus File"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setUploadDialogOpen(certification.id)}
                                            disabled={disabled}
                                            className="mt-2 w-full border-dashed border-2 h-20 hover:bg-slate-50"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <Upload className="h-5 w-5 text-slate-400" />
                                                <span className="text-sm text-slate-600">
                                                    Klik untuk upload file
                                                </span>
                                            </div>
                                        </Button>
                                    )}

                                    <p className="mt-1 text-xs text-slate-500">
                                        Format: JPG, JPEG, PNG, atau PDF (maks. 5MB)
                                    </p>

                                    {/* File Upload Dialog */}
                                    <FileUploadDialog
                                        open={uploadDialogOpen === certification.id}
                                        onOpenChange={(open) => {
                                            if (!open) setUploadDialogOpen(null);
                                        }}
                                        onFileSelect={(file) => handleFileSelect(certification.id, file)}
                                        currentFileName={certification.file_name}
                                        currentFileUrl={certification.file_url}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!disabled && (
                <div className="mt-6">
                    <Button
                        onClick={onSave}
                        disabled={processing}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Sertifikasi
                    </Button>
                </div>
            )}
        </Card>
    );
}




