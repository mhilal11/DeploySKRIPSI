import { Archive, Inbox, Search, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import ComposeLetterDialog from '@/modules/AdminStaff/components/ComposeLetterDialog';
import { LetterDetailDialog } from '@/modules/AdminStaff/components/letters/LetterDetailDialog';
import { LetterReplyDialog } from '@/modules/AdminStaff/components/letters/LetterReplyDialog';
import { LettersTable } from '@/modules/AdminStaff/components/letters/LettersTable';
import { LetterRecord, TabValue } from '@/modules/AdminStaff/components/letters/types';
import StatsCards from '@/modules/AdminStaff/components/StatsCards';
import AdminStaffLayout from '@/modules/AdminStaff/Layout';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Head, router, useForm, usePage } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';

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
    if (!detailOpen && !replyOpen) {
      setDetailTab('detail');
    }
  }, [detailOpen, replyOpen]);

  const filteredLetters = useMemo(() => {
    const filterList = (items: LetterRecord[]) => {
      const search = searchTerm.toLowerCase();
      return items.filter((letter) => {
        const matchesSearch =
          !search ||
          letter.subject.toLowerCase().includes(search) ||
          letter.letterNumber.toLowerCase().includes(search) ||
          letter.sender.toLowerCase().includes(search);
        const matchesCategory = categoryFilter === 'all' || letter.category === categoryFilter;
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
        router.reload({ preserveScroll: true });
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
        router.reload({ preserveScroll: true });
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
        router.reload({ preserveScroll: true });
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
    setDetailOpen(false);
    setReplyOpen(true);
  };

  const handleReplyDialogChange = (open: boolean) => {
    if (!open) {
      setReplyOpen(false);
      replyForm.reset();
      replyForm.clearErrors();
      if (selectedLetter) {
        setDetailOpen(true);
      }
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

    let replyEndpoint = `/admin-staff/kelola-surat/${selectedLetter.id}/reply`;
    try {
      replyEndpoint = route('admin-staff.letters.reply', selectedLetter.id);
    } catch {
      // fallback kept for environments where this route is not registered in Ziggy
    }

    replyForm.post(replyEndpoint, {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        toast.success('Balasan surat dikirim ke HR.');
        replyForm.reset();
        setReplyOpen(false);
        setSelectedLetter(null);
        setDetailOpen(false);
        router.reload({ preserveScroll: true });
      },
      onError: () => toast.error('Gagal mengirim balasan, periksa catatan Anda.'),
    });
  };

  const categoryOptions = [
    'all',
    ...Array.from(
      new Set([...letters.inbox, ...letters.outbox, ...letters.archive].map((item) => item.category)),
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
      </Card>

      <LetterDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        letter={selectedLetter}
        detailTab={detailTab}
        onDetailTabChange={setDetailTab}
        onOpenReply={openReplyDialog}
      />

      <LetterReplyDialog
        open={replyOpen}
        onOpenChange={handleReplyDialogChange}
        subject={selectedLetter?.subject ?? ''}
        replyNote={replyForm.data.reply_note}
        onReplyNoteChange={(value) => replyForm.setData('reply_note', value)}
        replyNoteError={replyForm.errors.reply_note}
        processing={replyForm.processing}
        onSubmit={handleReplySubmit}
      />
    </AdminStaffLayout>
  );
}
