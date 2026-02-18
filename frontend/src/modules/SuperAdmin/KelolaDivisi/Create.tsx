import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import type { InertiaFormProps } from '@/shared/lib/inertia';

export type CreateDivisionFormFields = {
    name: string;
    description: string;
    manager_name: string;
    capacity: number;
};

interface CreateDivisionDialogProps {
    open: boolean;
    form: InertiaFormProps<CreateDivisionFormFields>;
    onClose: () => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export default function CreateDivisionDialog({ open, form, onClose, onSubmit }: CreateDivisionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent className="max-w-2xl p-6">
                <DialogHeader>
                    <DialogTitle>Tambah Divisi</DialogTitle>
                    <DialogDescription>
                        Buat divisi baru agar bisa langsung dipakai pada akun, surat, dan rekrutmen.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="mt-4 space-y-6">
                    <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="division-name">Nama Divisi</Label>
                                <Input
                                    id="division-name"
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    placeholder="Contoh: Product Engineering"
                                />
                                {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="division-manager-create">Ketua Divisi</Label>
                                <Input
                                    id="division-manager-create"
                                    value={form.data.manager_name}
                                    onChange={(event) => {
                                        const value = event.target.value.replace(/[^a-zA-Z\s]/g, '');
                                        form.setData('manager_name', value);
                                    }}
                                    placeholder="Nama ketua divisi"
                                />
                                {form.errors.manager_name && (
                                    <p className="text-xs text-destructive">{form.errors.manager_name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="division-capacity-create">Kapasitas Staff</Label>
                                <Input
                                    id="division-capacity-create"
                                    type="number"
                                    min={0}
                                    value={form.data.capacity}
                                    onChange={(event) => {
                                        const nextValue = Number(event.target.value);
                                        form.setData('capacity', Number.isNaN(nextValue) ? 0 : nextValue);
                                    }}
                                />
                                {form.errors.capacity && (
                                    <p className="text-xs text-destructive">{form.errors.capacity}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="division-description-create">Deskripsi Divisi</Label>
                            <Textarea
                                id="division-description-create"
                                rows={4}
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                                placeholder="Ceritakan fokus, mandat, dan aktivitas utama divisi."
                            />
                            {form.errors.description && (
                                <p className="text-xs text-destructive">{form.errors.description}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={onClose}
                        >
                            Batalkan
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            disabled={form.processing}
                        >
                            Simpan Divisi
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
