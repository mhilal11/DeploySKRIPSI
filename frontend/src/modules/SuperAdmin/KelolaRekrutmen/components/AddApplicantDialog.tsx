import { UserPlus } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

export default function AddApplicantDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white">
                    <UserPlus className="h-4 w-4" />
                    Tambah Pelamar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-0 bg-white p-0">
                <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4">
                    <DialogTitle>Tambah Pelamar Baru</DialogTitle>
                    <DialogDescription>
                        Lengkapi informasi kandidat untuk memperbarui pipeline rekrutmen.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="space-y-5 px-6 pb-6 pt-4"
                    onSubmit={(event) => event.preventDefault()}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Nama Lengkap</Label>
                            <Input placeholder="Nama pelamar" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" placeholder="email@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Posisi</Label>
                            <Input placeholder="Software Engineer" />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="applied">Applied</SelectItem>
                                    <SelectItem value="screening">Screening</SelectItem>
                                    <SelectItem value="interview">Interview</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-full space-y-2">
                            <Label>Catatan</Label>
                            <Textarea placeholder="Tambahkan catatan singkat" rows={4} />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white">
                        Simpan
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}


