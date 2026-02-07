import {
    Archive,
    CheckCircle,
    Circle,
    Clock,
    Download,
    Eye,
    FileText,
    Filter,
    Inbox,
    Loader2,
    MapPin,
    RotateCcw,
    Search,
    Send,
    Users,
    Info,
    Paperclip,
    MessageSquare,
    AlertCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import ComposeLetterDialog from '@/modules/AdminStaff/components/ComposeLetterDialog';
import StatsCards from '@/modules/AdminStaff/components/StatsCards';
import AdminStaffLayout from '@/modules/AdminStaff/Layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/shared/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { Head, useForm, usePage } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';

type ReplyHistoryEntry = {
    id: number | null;
    note: string;
    author?: string | null;
    division?: string | null;
    toDivision?: string | null;
    timestamp?: string | null;
};

interface LetterRecord {
    id: number;
    letterNumber: string;
    from: string;
    sender: string;
    subject: string;
    category: string;
    date: string;
    status: string;
    priority: string;
    hasAttachment: boolean;
    attachmentUrl?: string | null;
    content?: string | null;
    dispositionNote?: string | null;
    replyNote?: string | null;
    replyBy?: string | null;
    replyAt?: string | null;
    canReply?: boolean;
    replyHistory?: ReplyHistoryEntry[];
    targetDivision?: string | null;
    recipient?: string | null;
    currentRecipient?: string | null;
    disposedBy?: string | null;
    disposedAt?: string | null;
    approvalDate?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    isFinalized?: boolean;
    dispositionDocumentUrl?: string | null;
    dispositionDocumentName?: string | null;
}

interface LettersPageProps extends Record<string, unknown> {
    stats: {
        inbox: number;
        outbox: number;
        pending: number;
        archived: number;
    };
    letters: {
        inbox: LetterRecord[];
        outbox: LetterRecord[];
        archive: LetterRecord[];
    };
    recruitments: Array<{
        name: string;
        position: string;
        date: string;
        status: string;
        education?: string | null;
    }>;
    options: {
        letterTypes: string[];
        categories: string[];
        priorities: Record<string, string>;
        divisions: string[];
    };
    nextLetterNumber: string;
}

type TabValue = 'inbox' | 'outbox' | 'archive';

const EMPTY_STATS: LettersPageProps['stats'] = {
    inbox: 0,
    outbox: 0,
    pending: 0,
    archived: 0,
};

const EMPTY_LETTERS: LettersPageProps['letters'] = {
    inbox: [],
    outbox: [],
    archive: [],
};

const EMPTY_OPTIONS: LettersPageProps['options'] = {
    letterTypes: [],
    categories: [],
    priorities: {},
    divisions: [],
};

export default function AdminStaffLetters() {
    const { props } = usePage<PageProps<Partial<LettersPageProps>>>();
    const { auth } = props;
    const stats = props.stats ?? EMPTY_STATS;
    const letters = props.letters ?? EMPTY_LETTERS;
    const recruitments = props.recruitments ?? [];
    const options = props.options ?? EMPTY_OPTIONS;
    const nextLetterNumber = props.nextLetterNumber ?? '-';

    const [composerOpen, setComposerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabValue>('inbox');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [selectedLetter, setSelectedLetter] = useState<LetterRecord | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailTab, setDetailTab] = useState<'detail' | 'tracking'>('detail');
    const [replyOpen, setReplyOpen] = useState(false);
    const [archivingLetterId, setArchivingLetterId] = useState<number | null>(null);
    const [unarchivingLetterId, setUnarchivingLetterId] = useState<number | null>(null);

    const form = useForm({
        penerima: 'Admin HR',
        perihal: '',
        isi_surat: '',
        jenis_surat: '',
        kategori: '',
        prioritas: '',
        target_divisions: [] as string[],
        lampiran: null as File | null,
    });
    const replyForm = useForm({
        reply_note: '',
    });
    const archiveForm = useForm({});
    const unarchiveForm = useForm({});
    const resetReplyForm = replyForm.reset;
    const clearReplyFormErrors = replyForm.clearErrors;

    useEffect(() => {
        resetReplyForm();
        clearReplyFormErrors();
        setReplyOpen(false);
        setDetailTab('detail');
    }, [selectedLetter, resetReplyForm, clearReplyFormErrors]);

    useEffect(() => {
        if (!detailOpen) {
            setReplyOpen(false);
            resetReplyForm();
            clearReplyFormErrors();
            setDetailTab('detail');
        }
    }, [detailOpen, resetReplyForm, clearReplyFormErrors]);

    const filteredLetters = useMemo(() => {
        const filterList = (items: LetterRecord[]) => {
            const search = searchTerm.toLowerCase();
            return items.filter((letter) => {
                const matchesSearch =
                    !search ||
                    letter.subject.toLowerCase().includes(search) ||
                    letter.letterNumber.toLowerCase().includes(search) ||
                    letter.sender.toLowerCase().includes(search);
                const matchesCategory =
                    categoryFilter === 'all' || letter.category === categoryFilter;
                return matchesSearch && matchesCategory;
            });
        };

        return {
            inbox: filterList(letters.inbox),
            outbox: filterList(letters.outbox),
            archive: filterList(letters.archive),
        };
    }, [letters, searchTerm, categoryFilter]);

    const activeLetters = filteredLetters[activeTab];

    const handleSubmit = () => {
        form.post(route('admin-staff.letters.store'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Surat berhasil dikirim ke Admin HR.');
                form.reset();
                setComposerOpen(false);
            },
            onError: () => toast.error('Gagal mengirim surat, periksa kembali data.'),
        });
    };

    const openDetail = (letter: LetterRecord) => {
        setSelectedLetter(letter);
        setDetailOpen(true);
        setDetailTab('detail');
    };

    const handleArchive = (letter: LetterRecord) => {
        if (!letter || archiveForm.processing) {
            return;
        }

        if (letter.status === 'Diarsipkan') {
            toast.info('Surat sudah berada di arsip.');
            return;
        }

        if (letter.status !== 'Didisposisi') {
            return;
        }

        setArchivingLetterId(letter.id);

        archiveForm.post(route('admin-staff.letters.archive', letter.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Surat dipindahkan ke arsip.');
                if (selectedLetter?.id === letter.id) {
                    setDetailOpen(false);
                    setSelectedLetter(null);
                }
            },
            onError: () => toast.error('Gagal mengarsipkan surat, coba lagi.'),
            onFinish: () => setArchivingLetterId(null),
        });
    };

    const handleUnarchive = (letter: LetterRecord) => {
        if (!letter || unarchiveForm.processing) {
            return;
        }

        if (letter.status !== 'Diarsipkan') {
            toast.info('Surat ini belum berada di arsip.');
            return;
        }

        setUnarchivingLetterId(letter.id);

        unarchiveForm.post(route('admin-staff.letters.unarchive', letter.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Arsip surat dibatalkan.');
            },
            onError: () => toast.error('Gagal membatalkan arsip surat, coba lagi.'),
            onFinish: () => setUnarchivingLetterId(null),
        });
    };

    const openReplyDialog = () => {
        if (!selectedLetter?.canReply) {
            return;
        }
        replyForm.reset();
        replyForm.clearErrors();
        setReplyOpen(true);
    };

    const handleReplyDialogChange = (open: boolean) => {
        if (!open) {
            setReplyOpen(false);
            replyForm.reset();
            replyForm.clearErrors();
            return;
        }

        if (selectedLetter?.canReply) {
            setReplyOpen(true);
        }
    };

    const handleReplySubmit = () => {
        if (!selectedLetter) {
            return;
        }

        const ziggyHasReplyRoute =
            typeof window !== 'undefined' &&
            typeof window.route === 'function' &&
            window?.Ziggy?.routes?.['admin-staff.letters.reply'];

        const replyEndpoint = ziggyHasReplyRoute
            ? route('admin-staff.letters.reply', selectedLetter.id)
            : `/admin-staff/kelola-surat/${selectedLetter.id}/reply`;

        replyForm.post(replyEndpoint, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Balasan surat dikirim ke HR.');
                replyForm.reset();
                setReplyOpen(false);
            },
            onError: () => toast.error('Gagal mengirim balasan, periksa catatan Anda.'),
        });
    };

    const selectedLetterStatus = selectedLetter?.status?.toLowerCase() ?? '';
    const isSelectedLetterRejected = selectedLetterStatus.includes('tolak');

    const categoryOptions = [
        'all',
        ...Array.from(
            new Set(
                [...letters.inbox, ...letters.outbox, ...letters.archive].map(
                    (item) => item.category
                )
            )
        ),
    ];

    const userInfo = {
        name: auth?.user?.name ?? 'Tidak diketahui',
        division: auth?.user?.division ?? null,
        role: auth?.user?.role ?? null,
    };

    return (
        <AdminStaffLayout
            title="Correspondence & Filing"
            description="Kelola surat masuk, keluar, dan arsip digital"
            breadcrumbs={[
                { label: 'Dashboard', href: route('admin-staff.dashboard') },
                { label: 'Kelola Surat' },
            ]}

        >
            <Head title="Kelola Surat" />

            <StatsCards stats={stats} />

            <Card className="p-6">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Cari surat..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="w-full md:w-52">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Kategori" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {categoryOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option === 'all' ? 'Semua Kategori' : option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <ComposeLetterDialog
                            open={composerOpen}
                            onOpenChange={setComposerOpen}
                            triggerLabel="Buat Surat"
                            data={form.data}
                            setData={form.setData}
                            errors={form.errors}
                            processing={form.processing}
                            onSubmit={handleSubmit}
                            userInfo={userInfo}
                            options={options}
                            letterNumberPreview={nextLetterNumber}
                        />
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
                    <TabsList className="mb-5 h-auto gap-2 bg-transparent p-0">
                        <TabsTrigger
                            value="inbox"
                            className="rounded-lg border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                        >
                            <Inbox className="mr-2 h-4 w-4" />
                            Inbox
                        </TabsTrigger>
                        <TabsTrigger
                            value="outbox"
                            className="rounded-lg border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Outbox
                        </TabsTrigger>
                        <TabsTrigger
                            value="archive"
                            className="rounded-lg border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                        >
                            <Archive className="mr-2 h-4 w-4" />
                            Arsip
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inbox">
                        <LettersTable
                            letters={activeLetters}
                            onViewDetail={openDetail}
                            onArchive={handleArchive}
                            archivingId={archivingLetterId}
                            archiveProcessing={archiveForm.processing}
                        />
                    </TabsContent>
                    <TabsContent value="outbox">
                        <LettersTable
                            letters={activeLetters}
                            variant="outbox"
                            onViewDetail={openDetail}
                            onArchive={handleArchive}
                            archivingId={archivingLetterId}
                            archiveProcessing={archiveForm.processing}
                        />
                    </TabsContent>
                    <TabsContent value="archive">
                        <LettersTable
                            letters={activeLetters}
                            variant="archive"
                            onViewDetail={openDetail}
                            onUnarchive={handleUnarchive}
                            unarchivingId={unarchivingLetterId}
                            unarchiveProcessing={unarchiveForm.processing}
                        />
                    </TabsContent>
                </Tabs>
            </Card >

            {/* <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-blue-900">Rekrutmen Baru</h3>
                    <Badge variant="outline">{recruitments.length} kandidat</Badge>
                </div>
                {recruitments.length === 0 ? (
                    <EmptyState message="Belum ada pelamar baru." />
                ) : (
                    <div className="space-y-3">
                        {recruitments.map((candidate, index) => (
                            <div key={`${candidate.name}-${index}`} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">{candidate.name}</p>
                                        <p className="text-sm text-slate-500">{candidate.position}</p>
                                    </div>
                                    <Badge variant="secondary">{candidate.status}</Badge>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span>{candidate.date}</span>
                                    {candidate.education && (
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {candidate.education}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card> */}

            < Dialog open={detailOpen} onOpenChange={setDetailOpen} >
                <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden border-0 bg-white p-0">
                    <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4">
                        <DialogTitle>Detail Surat</DialogTitle>
                        <DialogDescription>
                            Ringkasan informasi surat masuk/keluar beserta lampiran yang disertakan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[calc(85vh-4.5rem)] overflow-y-auto">
                        {selectedLetter ? (
                            <div className="px-6 pb-8 pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {selectedLetter.subject}
                                        </p>
                                    </div>
                                    {selectedLetter.canReply && (
                                        <Button
                                            size="sm"
                                            className="bg-blue-900 text-white hover:bg-blue-800"
                                            onClick={openReplyDialog}
                                        >
                                            Balas Surat
                                        </Button>
                                    )}
                                    {selectedLetter.isFinalized && (
                                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                            Disposisi Final
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Diterima pada {selectedLetter.date}
                                </p>
                                {selectedLetter.isFinalized && (
                                    <p className="mt-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1 inline-block">
                                        Surat ini bersifat final dan tidak dapat dibalas.
                                    </p>
                                )}

                                <Tabs
                                    value={detailTab}
                                    onValueChange={(value) => setDetailTab(value as 'detail' | 'tracking')}
                                    className="mt-5 space-y-4"
                                >
                                    <TabsList className="grid w-full grid-cols-2 gap-3 bg-transparent p-0">
                                        <TabsTrigger
                                            value="detail"
                                            className="rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            Detail Surat
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="tracking"
                                            className="rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                                        >
                                            <MapPin className="mr-2 h-4 w-4" />
                                            Tracking Surat
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="detail" className="mt-4">
                                        <div className="space-y-5">
                                            {/* Information Grid */}
                                            <Card className="overflow-hidden border-slate-200">
                                                <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-5 py-3 border-b border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <Info className="h-4 w-4 text-blue-600" />
                                                        <h3 className="text-sm font-semibold text-slate-900">Informasi Surat</h3>
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 p-5 text-sm md:grid-cols-3">
                                                    <InfoTile label="Nomor Surat" value={selectedLetter.letterNumber} />
                                                    <InfoTile label="Tanggal" value={selectedLetter.date} />
                                                    <InfoTile label="Pengirim" value={selectedLetter.sender} />
                                                    <InfoTile label="Divisi" value={selectedLetter.from} />
                                                    <InfoTile label="Divisi Tujuan" value={selectedLetter.targetDivision ?? selectedLetter.recipient ?? '-'} />
                                                    <InfoTile label="Kategori" value={selectedLetter.category} />
                                                    <InfoTile
                                                        label="Prioritas"
                                                        value={<PriorityBadge priority={selectedLetter.priority} />}
                                                    />
                                                    <InfoTile label="Status" value={<StatusBadge status={selectedLetter.status} />} />
                                                </div>
                                            </Card>

                                            {/* Subject and Content */}
                                            <Card className="overflow-hidden border-slate-200">
                                                <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-5 py-3 border-b border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-blue-600" />
                                                        <h3 className="text-sm font-semibold text-slate-900">Subjek & Isi</h3>
                                                    </div>
                                                </div>
                                                <div className="p-5 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">Subjek</p>
                                                        <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                                                            {selectedLetter.subject}
                                                        </p>
                                                    </div>
                                                    {selectedLetter.content && (
                                                        <>
                                                            <Separator />
                                                            <div>
                                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                                                    Isi Surat
                                                                </p>
                                                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed">
                                                                    {selectedLetter.content}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </Card>

                                            {/* Attachment */}
                                            {selectedLetter.hasAttachment && selectedLetter.attachmentUrl && (
                                                <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
                                                    <div className="bg-blue-100/50 px-5 py-3 border-b border-blue-200">
                                                        <div className="flex items-center gap-2">
                                                            <Paperclip className="h-4 w-4 text-blue-600" />
                                                            <h3 className="text-sm font-semibold text-slate-900">Lampiran</h3>
                                                        </div>
                                                    </div>
                                                    <div className="p-5">
                                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                                                                    <FileText className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                                        {selectedLetter.subject}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">Dokumen surat terlampir</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <Button asChild size="sm" variant="outline" className="border-blue-300 hover:bg-blue-50">
                                                                    <a
                                                                        href={selectedLetter.attachmentUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        Lihat
                                                                    </a>
                                                                </Button>
                                                                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                                    <a
                                                                        href={selectedLetter.attachmentUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        download
                                                                    >
                                                                        <Download className="mr-2 h-4 w-4" />
                                                                        Unduh
                                                                    </a>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            )}

                                            {/* Disposition Document for finalized letters */}
                                            {selectedLetter.isFinalized && selectedLetter.dispositionDocumentUrl && (
                                                <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
                                                    <div className="bg-emerald-100/50 px-5 py-3 border-b border-emerald-200">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                                                            <h3 className="text-sm font-semibold text-slate-900">Lampiran Disposisi Final</h3>
                                                        </div>
                                                    </div>
                                                    <div className="p-5">
                                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
                                                                    <FileText className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                                        {selectedLetter.dispositionDocumentName ?? 'Surat Disposisi.docx'}
                                                                    </p>
                                                                    <p className="text-xs text-emerald-600">Dokumen disposisi resmi</p>
                                                                </div>
                                                            </div>
                                                            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-shrink-0">
                                                                <a
                                                                    href={selectedLetter.dispositionDocumentUrl}
                                                                    download
                                                                >
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Unduh
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            )}

                                            {/* HR Notes */}
                                            {selectedLetter.dispositionNote && (
                                                <Card
                                                    className={
                                                        isSelectedLetterRejected
                                                            ? 'overflow-hidden border-rose-200 bg-gradient-to-br from-white to-rose-50/30'
                                                            : 'overflow-hidden border-amber-200 bg-gradient-to-br from-white to-amber-50/20'
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            isSelectedLetterRejected
                                                                ? 'bg-rose-100/50 px-5 py-3 border-b border-rose-200'
                                                                : 'bg-amber-100/50 px-5 py-3 border-b border-amber-200'
                                                        }
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <AlertCircle
                                                                    className={
                                                                        isSelectedLetterRejected
                                                                            ? 'h-4 w-4 text-rose-600'
                                                                            : 'h-4 w-4 text-amber-600'
                                                                    }
                                                                />
                                                                <h3 className="text-sm font-semibold text-slate-900">
                                                                    {isSelectedLetterRejected ? 'Catatan Penolakan HR' : 'Catatan HR'}
                                                                </h3>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-slate-600">Prioritas:</span>
                                                                <PriorityBadge priority={selectedLetter.priority} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-5">
                                                        <p
                                                            className={
                                                                isSelectedLetterRejected
                                                                    ? 'whitespace-pre-line text-sm text-rose-800 leading-relaxed'
                                                                    : 'whitespace-pre-line text-sm text-slate-700 leading-relaxed'
                                                            }
                                                        >
                                                            {selectedLetter.dispositionNote}
                                                        </p>
                                                    </div>
                                                </Card>
                                            )}

                                            {/* Reply History */}
                                            {(() => {
                                                const history =
                                                    selectedLetter.replyHistory && selectedLetter.replyHistory.length > 0
                                                        ? selectedLetter.replyHistory
                                                        : selectedLetter.replyNote
                                                            ? [
                                                                {
                                                                    id: null,
                                                                    note: selectedLetter.replyNote,
                                                                    author: selectedLetter.replyBy,
                                                                    division:
                                                                        selectedLetter.targetDivision ?? selectedLetter.from,
                                                                    toDivision: selectedLetter.recipient ?? undefined,
                                                                    timestamp: selectedLetter.replyAt,
                                                                },
                                                            ]
                                                            : [];
                                                if (history.length === 0) {
                                                    return null;
                                                }

                                                return (
                                                    <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 mb-3">
                                                        <div className="bg-emerald-100/50 px-5 py-3 border-b border-emerald-200">
                                                            <div className="flex items-center gap-2">
                                                                <MessageSquare className="h-4 w-4 text-emerald-600" />
                                                                <h3 className="text-sm font-semibold text-slate-900">Riwayat Balasan</h3>
                                                            </div>
                                                        </div>
                                                        <div className="p-5">
                                                            <div className="space-y-3">
                                                                {history.map((entry, index) => (
                                                                    <Card
                                                                        key={entry.id ?? index}
                                                                        className="border-emerald-200/60 bg-white shadow-sm hover:shadow-md transition-shadow"
                                                                    >
                                                                        <div className="p-4">
                                                                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                                                            <Users className="h-4 w-4 text-emerald-600" />
                                                                                        </div>
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <p className="font-semibold text-sm text-emerald-900 truncate">
                                                                                                {entry.author ?? entry.division ?? 'Divisi'}
                                                                                            </p>
                                                                                            <p className="text-xs text-slate-500 truncate">
                                                                                                {entry.division ?? '-'}
                                                                                                {entry.toDivision
                                                                                                    ? ` â†’ ${entry.toDivision}`
                                                                                                    : ''}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {entry.timestamp && (
                                                                                    <Badge variant="outline" className="text-xs border-slate-300 flex-shrink-0">
                                                                                        <Clock className="mr-1 h-3 w-3" />
                                                                                        {entry.timestamp}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <Separator className="my-3" />
                                                                            <p className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                                                                                {entry.note}
                                                                            </p>
                                                                        </div>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                );
                                            })()}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="tracking" className="mt-4">
                                        <LetterTrackingView letter={selectedLetter} />
                                    </TabsContent>
                                </Tabs>

                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center text-sm text-slate-500">
                                Pilih surat untuk melihat detail.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog >

            <Dialog open={replyOpen} onOpenChange={handleReplyDialogChange}>
                <DialogContent className="max-w-2xl border-0 bg-white p-0 overflow-hidden">
                    <DialogHeader className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <DialogTitle className="text-lg font-semibold text-slate-900">Balas Surat</DialogTitle>
                                <DialogDescription className="text-sm text-slate-600">
                                    Kirim catatan balasan untuk surat yang dipilih
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-5">
                        {/* Subject Info Card */}
                        <Card className="mb-5 border-blue-200 bg-blue-50/50">
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wide text-blue-700 mb-1">
                                            Subjek Surat
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                                            {selectedLetter?.subject ?? ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <form
                            className="space-y-5"
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleReplySubmit();
                            }}
                        >
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-slate-600" />
                                    <label className="text-sm font-semibold text-slate-900">
                                        Catatan Balasan <span className="text-rose-500">*</span>
                                    </label>
                                </div>
                                <Textarea
                                    rows={6}
                                    placeholder="Tulis tanggapan untuk pengirim atau HR..."
                                    value={replyForm.data.reply_note}
                                    onChange={(event) => replyForm.setData('reply_note', event.target.value)}
                                    className="resize-none border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                {replyForm.errors.reply_note && (
                                    <div className="flex items-center gap-2 text-rose-600">
                                        <AlertCircle className="h-4 w-4" />
                                        <p className="text-xs font-medium">{replyForm.errors.reply_note}</p>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleReplyDialogChange(false)}
                                    disabled={replyForm.processing}
                                    className="border-slate-300 hover:bg-slate-50"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={replyForm.processing}
                                    className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                                >
                                    {replyForm.processing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Kirim Balasan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminStaffLayout >
    );
}

type TrackingStep = {
    id: string;
    status: string;
    description: string;
    location?: string | null;
    timestamp?: string | null;
    person?: string | null;
    completed: boolean;
};

function LetterTrackingView({ letter }: { letter: LetterRecord }) {
    const steps = useMemo(() => buildTrackingSteps(letter), [letter]);

    if (!steps.length) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
                Riwayat tracking belum tersedia untuk surat ini.
            </div>
        );
    }

    const firstIncomplete = steps.findIndex((step) => !step.completed);
    const currentStepIndex = firstIncomplete === -1 ? Math.max(0, steps.length - 1) : firstIncomplete;
    const currentStatus = steps[currentStepIndex]?.status ?? 'Status Tidak Diketahui';
    const totalSteps = steps.length;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-blue-900">Tracking Surat</p>
                    <p className="text-xs text-slate-500">
                        ID {letter.letterNumber ?? letter.id} â€¢ Tujuan{' '}
                        {letter.targetDivision ?? letter.recipient ?? 'Tidak ditentukan'}
                    </p>
                </div>
                <Badge className="bg-blue-900 text-white">{currentStatus}</Badge>
            </div>

            <div className="relative space-y-8">
                {steps.map((step, index) => {
                    const isLast = index === steps.length - 1;
                    const isCurrent = index === currentStepIndex && !step.completed;
                    return (
                        <div key={step.id} className="relative flex gap-4">
                            {!isLast && (
                                <div
                                    className={`absolute left-4 top-8 h-full w-0.5 ${step.completed ? 'bg-blue-900' : 'bg-slate-300'
                                        }`}
                                />
                            )}
                            <div className="relative z-10 flex-shrink-0">
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${step.completed
                                        ? 'bg-blue-900 text-white'
                                        : isCurrent
                                            ? 'animate-pulse bg-amber-500 text-white'
                                            : 'bg-slate-200 text-slate-400'
                                        }`}
                                >
                                    {step.completed ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : isCurrent ? (
                                        <Clock className="h-5 w-5" />
                                    ) : (
                                        <Circle className="h-5 w-5" />
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 pb-8">
                                <div
                                    className={`rounded-xl border-2 p-4 ${step.completed
                                        ? 'border-blue-200 bg-blue-50'
                                        : isCurrent
                                            ? 'border-amber-200 bg-amber-50'
                                            : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p
                                                className={`text-sm font-semibold ${step.completed || isCurrent ? 'text-blue-900' : 'text-slate-600'
                                                    }`}
                                            >
                                                {step.status}
                                            </p>
                                            {step.person && (
                                                <p className="text-xs text-slate-500">oleh {step.person}</p>
                                            )}
                                        </div>
                                        {step.timestamp && (
                                            <p className="text-xs text-slate-500">{step.timestamp}</p>
                                        )}
                                    </div>
                                    {step.description && (
                                        <p className="mt-3 text-sm text-slate-700">{step.description}</p>
                                    )}
                                    {step.location && (
                                        <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-600">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{step.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Langkah</p>
                <p className="text-lg font-semibold text-blue-900">{totalSteps}</p>
            </div>
        </div>
    );
}

function buildTrackingSteps(letter: LetterRecord): TrackingStep[] {
    const normalizedStatus = (letter.status ?? '').toLowerCase();
    const isArchived = normalizedStatus.includes('arsip');
    const isRejected = normalizedStatus.includes('tolak');
    const isCompletedStatus = normalizedStatus.includes('selesai');
    const isClosed = normalizedStatus.includes('tutup');
    const hrPendingKeywords = ['menunggu hr', 'diajukan', 'diproses', 'terkirim'];
    const waitingHr = hrPendingKeywords.some((keyword) => normalizedStatus.includes(keyword));

    const replyHistory =
        letter.replyHistory && letter.replyHistory.length > 0
            ? letter.replyHistory
            : letter.replyNote
                ? [
                    {
                        id: null,
                        note: letter.replyNote,
                        author: letter.replyBy,
                        division: letter.targetDivision ?? letter.recipient ?? letter.from,
                        toDivision: letter.recipient ?? letter.targetDivision,
                        timestamp: letter.replyAt,
                    },
                ]
                : [];
    const lastReply = replyHistory[replyHistory.length - 1];
    const replyCompleted = replyHistory.length > 0;

    const creationTimestamp = letter.createdAt ?? letter.date ?? null;
    const steps: TrackingStep[] = [
        {
            id: 'created',
            status: 'Dibuat',
            description: `Surat dibuat oleh ${letter.sender ?? 'pengirim tidak diketahui'}.`,
            location: letter.from ?? 'Internal',
            timestamp: creationTimestamp,
            person: letter.sender,
            completed: Boolean(creationTimestamp),
        },
        {
            id: 'hr',
            status: 'Ditinjau HR',
            description: letter.dispositionNote
                ? 'HR telah memberikan disposisi dan catatan.'
                : 'Surat menunggu peninjauan HR.',
            location: 'Human Capital',
            timestamp: letter.disposedAt ?? letter.approvalDate,
            person: letter.disposedBy,
            completed:
                !waitingHr ||
                Boolean(letter.disposedAt || letter.dispositionNote) ||
                isArchived ||
                isRejected ||
                isCompletedStatus,
        },
        {
            id: 'division',
            status: 'Dikirim ke Divisi',
            description: letter.targetDivision
                ? `Surat diteruskan ke divisi ${letter.targetDivision}.`
                : 'Divisi tujuan belum ditentukan.',
            location: letter.targetDivision ?? letter.recipient ?? 'Divisi terkait',
            timestamp: letter.disposedAt,
            person: letter.disposedBy,
            completed:
                letter.currentRecipient === 'division' ||
                letter.currentRecipient === 'archive' ||
                replyCompleted ||
                isArchived ||
                isCompletedStatus ||
                isRejected,
        },
        {
            id: 'follow-up',
            status: 'Tindak Lanjut Divisi',
            description: replyCompleted
                ? `Balasan terbaru: ${lastReply?.note ?? 'Divisi telah memberikan catatan.'}`
                : 'Menunggu tindak lanjut dari divisi.',
            location: letter.targetDivision ?? letter.recipient ?? 'Divisi terkait',
            timestamp: lastReply?.timestamp ?? letter.replyAt,
            person: lastReply?.author ?? letter.replyBy,
            completed: replyCompleted,
        },
        {
            id: 'final',
            status: letter.status ?? 'Status Berjalan',
            description: `Status saat ini: ${letter.status ?? 'Tidak diketahui'}.`,
            location:
                letter.currentRecipient === 'hr'
                    ? 'Human Capital'
                    : letter.currentRecipient === 'division'
                        ? letter.targetDivision ?? letter.recipient ?? 'Divisi terkait'
                        : letter.currentRecipient === 'archive'
                            ? 'Arsip Sistem'
                            : letter.targetDivision ?? letter.recipient ?? '-',
            timestamp: letter.updatedAt ?? lastReply?.timestamp ?? letter.replyAt ?? letter.disposedAt ?? creationTimestamp,
            person: lastReply?.author ?? letter.replyBy ?? letter.disposedBy ?? letter.sender,
            completed:
                isArchived || isRejected || isCompletedStatus || isClosed || letter.currentRecipient === 'archive',
        },
    ];

    return steps;
}

function LettersTable({
    letters,
    variant = 'inbox',
    onViewDetail,
    onArchive,
    archivingId,
    archiveProcessing,
    onUnarchive,
    unarchivingId,
    unarchiveProcessing,
}: {
    letters: LetterRecord[];
    variant?: TabValue;
    onViewDetail: (letter: LetterRecord) => void;
    onArchive?: (letter: LetterRecord) => void;
    archivingId?: number | null;
    archiveProcessing?: boolean;
    onUnarchive?: (letter: LetterRecord) => void;
    unarchivingId?: number | null;
    unarchiveProcessing?: boolean;
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Reset page when letters change (e.g. switching tabs or search)
    useEffect(() => {
        setCurrentPage(1);
    }, [letters, variant]);

    if (letters.length === 0) {
        return <EmptyState message="Belum ada surat pada tab ini." />;
    }

    const totalPages = Math.ceil(letters.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLetters = letters.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Helper to generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nomor</TableHead>
                            <TableHead>Pengirim</TableHead>
                            <TableHead>Subjek</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Prioritas</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedLetters.map((letter) => {
                            const latestReply =
                                letter.replyHistory && letter.replyHistory.length > 0
                                    ? letter.replyHistory[letter.replyHistory.length - 1]
                                    : undefined;
                            const hasReply = Boolean(latestReply || letter.replyNote);

                            return (
                                <TableRow key={letter.id}>
                                    <TableCell>{letter.letterNumber}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {letter.sender}
                                            </p>
                                            <p className="text-xs text-slate-500">{letter.from}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span>{letter.subject}</span>
                                            {letter.hasAttachment && (
                                                <FileText className="h-4 w-4 text-slate-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{letter.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <PriorityBadge priority={letter.priority} />
                                    </TableCell>
                                    <TableCell>{letter.date}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={letter.status} />
                                        {/* {letter.dispositionNote && (
                                        <p className="mt-1 text-[11px] font-medium text-rose-600">
                                            Catatan HR tersedia
                                        </p>
                                    )} */}
                                        {hasReply && (
                                            <p className="mt-1 text-[11px] font-medium text-emerald-600">
                                                Balasan dikirim
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => onViewDetail(letter)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Detail Surat</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {onArchive && variant !== 'archive' && (
                                                <ArchiveConfirmButton
                                                    letter={letter}
                                                    onConfirm={onArchive}
                                                    disabled={archiveProcessing}
                                                    isProcessing={archiveProcessing && archivingId === letter.id}
                                                />
                                            )}
                                            {onUnarchive && variant === 'archive' && (
                                                <UnarchiveConfirmButton
                                                    letter={letter}
                                                    onConfirm={onUnarchive}
                                                    disabled={unarchiveProcessing}
                                                    isProcessing={unarchiveProcessing && unarchivingId === letter.id}
                                                />
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {letters.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500 text-center sm:text-left">
                        Menampilkan <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, letters.length)}</span> dari <span className="font-medium">{letters.length}</span> surat
                    </div>

                    <Pagination className="w-auto mx-0 justify-center sm:justify-end">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                                    className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                                />
                            </PaginationItem>

                            {getPageNumbers().map((page, idx) => (
                                <PaginationItem key={idx}>
                                    {page === 'ellipsis' ? (
                                        <PaginationEllipsis />
                                    ) : (
                                        <PaginationLink
                                            href="#"
                                            isActive={currentPage === page}
                                            onClick={(e) => { e.preventDefault(); typeof page === 'number' && handlePageChange(page); }}
                                        >
                                            {page}
                                        </PaginationLink>
                                    )}
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                                    className={`${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}

function ArchiveConfirmButton({
    letter,
    onConfirm,
    disabled,
    isProcessing,
}: {
    letter: LetterRecord;
    onConfirm: (letter: LetterRecord) => void;
    disabled?: boolean;
    isProcessing?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const canArchive = ['Didisposisi', 'Disposisi Final', 'Ditolak HR'].includes(letter.status);

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            disabled={disabled || letter.status === 'Diarsipkan'}
                            onClick={() => setOpen(true)}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Archive className="h-4 w-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Arsipkan</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Arsipkan surat?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {canArchive
                            ? 'Surat akan disimpan sebagai arsip dan tidak tampil di daftar aktif.'
                            : 'Surat ini belum didisposisi HR sehingga belum dapat diarsipkan.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700"
                        disabled={!canArchive || disabled || isProcessing}
                        onClick={() => {
                            if (!canArchive || disabled || isProcessing) {
                                return;
                            }
                            onConfirm(letter);
                            setOpen(false);
                        }}
                    >
                        {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            'Ya, Arsipkan'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function UnarchiveConfirmButton({
    letter,
    onConfirm,
    disabled,
    isProcessing,
}: {
    letter: LetterRecord;
    onConfirm: (letter: LetterRecord) => void;
    disabled?: boolean;
    isProcessing?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const canUnarchive = letter.status === 'Diarsipkan';

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-700 hover:text-amber-800"
                    disabled={disabled || !canUnarchive}
                >
                    {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Batalkan Arsip
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Batalkan arsip surat?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Surat akan dikembalikan ke daftar aktif untuk diproses kembali.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-amber-600 hover:bg-amber-700"
                        disabled={!canUnarchive || disabled || isProcessing}
                        onClick={() => {
                            if (!canUnarchive || disabled || isProcessing) {
                                return;
                            }
                            onConfirm(letter);
                            setOpen(false);
                        }}
                    >
                        {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            'Ya, Batalkan'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}



function StatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();

    // Rejected statuses - Red
    if (normalized.includes('tolak')) {
        return (
            <Badge variant="outline" className="border-rose-500 text-rose-600">
                {status}
            </Badge>
        );
    }

    // Completed/Finished statuses - Green
    if (normalized.includes('selesai')) {
        return (
            <Badge variant="outline" className="border-green-500 text-green-600">
                {status}
            </Badge>
        );
    }

    // Archived statuses - Gray
    if (normalized.includes('arsip')) {
        return (
            <Badge variant="outline" className="border-slate-500 text-slate-600">
                {status}
            </Badge>
        );
    }

    // Finalized disposition - Emerald
    if (normalized.includes('disposisi final')) {
        return (
            <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                {status}
            </Badge>
        );
    }

    // Disposed statuses - Blue
    if (normalized.includes('didisposisi')) {
        return (
            <Badge variant="outline" className="border-blue-500 text-blue-600">
                {status}
            </Badge>
        );
    }

    // Submitted/Initial statuses - Indigo
    if (normalized.includes('diajukan') || normalized.includes('terkirim')) {
        return (
            <Badge variant="outline" className="border-indigo-500 text-indigo-600">
                {status}
            </Badge>
        );
    }

    // Processing/Waiting statuses - Amber/Orange
    if (normalized.includes('proses') || normalized.includes('menunggu')) {
        return (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
                {status}
            </Badge>
        );
    }

    // Default fallback
    return <Badge variant="outline">{status}</Badge>;
}

const PRIORITY_META: Record<
    string,
    {
        label: string;
        badgeClass: string;
    }
> = {
    high: {
        label: 'Tinggi',
        badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
    },
    medium: {
        label: 'Sedang',
        badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
    low: {
        label: 'Rendah',
        badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    },
};

const FALLBACK_PRIORITY_META = PRIORITY_META.medium;

function resolvePriorityMeta(priority?: string | null) {
    if (typeof priority !== 'string') {
        return FALLBACK_PRIORITY_META;
    }

    const normalized = priority.toLowerCase();

    return PRIORITY_META[normalized] ?? FALLBACK_PRIORITY_META;
}

function PriorityBadge({
    priority,
    className,
}: {
    priority?: string | null;
    className?: string;
}) {
    const meta = resolvePriorityMeta(priority);
    const classes = [
        'border-0 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        meta.badgeClass,
        className,
    ]
        .filter((value): value is string => Boolean(value))
        .join(' ');

    return <Badge className={classes}>{meta.label}</Badge>;
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
            {message}
        </div>
    );
}

function InfoTile({
    label,
    value,
}: {
    label: string;
    value?: ReactNode | string | null;
}) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <div className="text-sm font-semibold text-slate-900">{value ?? '-'}</div>
        </div>
    );
}




