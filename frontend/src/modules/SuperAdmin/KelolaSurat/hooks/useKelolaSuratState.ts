import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LetterRecord } from '@/modules/SuperAdmin/KelolaSurat/components/LettersTable';
import { router, useForm } from '@/shared/lib/inertia';

interface LettersCollection {
    inbox: LetterRecord[];
    outbox: LetterRecord[];
    archive: LetterRecord[];
}

interface UseKelolaSuratStateParams {
    letters?: LettersCollection | null;
    pendingDisposition?: LetterRecord[] | null;
    appliedFilters: {
        search: string;
        category: string;
        tab: 'inbox' | 'outbox' | 'archive' | 'history';
    };
}

export function useKelolaSuratState({
    letters,
    pendingDisposition,
    appliedFilters,
}: UseKelolaSuratStateParams) {
    const safeLetters = useMemo<LettersCollection>(
        () => ({
            inbox: letters?.inbox ?? [],
            outbox: letters?.outbox ?? [],
            archive: letters?.archive ?? [],
        }),
        [letters?.inbox, letters?.outbox, letters?.archive],
    );
    const safePendingDisposition = useMemo(
        () => pendingDisposition ?? [],
        [pendingDisposition],
    );

    const [activeTab, setActiveTab] = useState<'inbox' | 'outbox' | 'archive' | 'history'>(appliedFilters.tab);
    const [searchQuery, setSearchQuery] = useState(appliedFilters.search ?? '');
    const [categoryFilter, setCategoryFilter] = useState(appliedFilters.category || 'all');
    const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
    const [isComposeOpen, setComposeOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<LetterRecord | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [dispositionOpen, setDispositionOpen] = useState(false);
    const [selectedDispositionIds, setSelectedDispositionIds] = useState<number[]>([]);
    const [dispositionTargets, setDispositionTargets] = useState<LetterRecord[]>([]);
    const [archivingLetterId, setArchivingLetterId] = useState<number | null>(null);
    const [unarchivingLetterId, setUnarchivingLetterId] = useState<number | null>(null);

    const form = useForm({
        perihal: '',
        isi_surat: '',
        jenis_surat: '',
        kategori: '',
        prioritas: '',
        target_divisions: [] as string[],
        lampiran: null as File | null,
    });

    const dispositionForm = useForm({
        disposition_note: '',
        letter_ids: [] as number[],
    });

    const archiveForm = useForm({});
    const unarchiveForm = useForm({});

    const historyLetters = useMemo(() => {
        const merged = [...safeLetters.inbox, ...safeLetters.outbox, ...safeLetters.archive];
        const seenIds = new Set<number>();

        return merged.filter((letter) => {
            if (seenIds.has(letter.id)) {
                return false;
            }

            seenIds.add(letter.id);

            const status = (letter.status ?? '').toLowerCase();
            const hasProgress =
                (letter.replyHistory && letter.replyHistory.length > 0) ||
                Boolean(letter.dispositionNote) ||
                Boolean(letter.disposedAt);

            const isProcessed =
                status === 'didisposisi' ||
                status === 'diarsipkan' ||
                status.includes('tolak');

            return hasProgress || isProcessed;
        });
    }, [safeLetters]);

    const filteredLetters = useMemo(() => {
        const applyFilter = (items: LetterRecord[]) => {
            return items.filter((letter) => {
                const searchLower = searchQuery.toLowerCase();
                const matchSearch =
                    !searchLower ||
                    letter.subject.toLowerCase().includes(searchLower) ||
                    letter.letterNumber.toLowerCase().includes(searchLower) ||
                    (letter.recipientName ?? '').toLowerCase().includes(searchLower) ||
                    (letter.senderName ?? '').toLowerCase().includes(searchLower) ||
                    (letter.senderDivision ?? '').toLowerCase().includes(searchLower);
                const matchCategory = categoryFilter === 'all' || letter.category === categoryFilter;
                const matchPriority = !priorityFilter || letter.priority === priorityFilter;
                return matchSearch && matchCategory && matchPriority;
            });
        };

        return {
            inbox: applyFilter(safeLetters.inbox),
            outbox: applyFilter(safeLetters.outbox),
            archive: applyFilter(safeLetters.archive),
            history: applyFilter(historyLetters),
        };
    }, [safeLetters, searchQuery, categoryFilter, priorityFilter, historyLetters]);

    useEffect(() => {
        setSelectedDispositionIds((prev) =>
            prev.filter((id) => safePendingDisposition.some((letter) => letter.id === id))
        );
    }, [safePendingDisposition]);

    const selectedPendingCount = selectedDispositionIds.length;
    const isAllPendingSelected =
        safePendingDisposition.length > 0 && selectedPendingCount === safePendingDisposition.length;
    const headerCheckboxState: boolean | 'indeterminate' = isAllPendingSelected
        ? true
        : selectedPendingCount > 0
          ? 'indeterminate'
          : false;

    const handleSelectLetter = (letter: LetterRecord) => {
        setSelectedLetter(letter);
        setDetailOpen(true);
    };

    const openDispositionDialog = (lettersToUse?: LetterRecord | LetterRecord[]) => {
        const normalizedTargets = lettersToUse
            ? Array.isArray(lettersToUse)
                ? lettersToUse
                : [lettersToUse]
            : safePendingDisposition.filter((letter) => selectedDispositionIds.includes(letter.id));

        if (normalizedTargets.length === 0) {
            toast.error('Pilih minimal satu surat untuk disposisi.');
            return;
        }

        setDispositionTargets(normalizedTargets);
        dispositionForm.reset();
        setDispositionOpen(true);
    };

    const handlePendingSelect = (letterId: number, checked: boolean) => {
        setSelectedDispositionIds((prev) => {
            if (checked) {
                if (prev.includes(letterId)) {
                    return prev;
                }
                return [...prev, letterId];
            }

            return prev.filter((id) => id !== letterId);
        });
    };

    const selectAllPending = () => {
        setSelectedDispositionIds(safePendingDisposition.map((letter) => letter.id));
    };

    const clearPendingSelection = () => {
        setSelectedDispositionIds([]);
    };

    const handleHeaderCheckboxChange = (checked: boolean) => {
        if (checked) {
            selectAllPending();
        } else {
            clearPendingSelection();
        }
    };

    const handleDispositionDialogChange = (open: boolean) => {
        setDispositionOpen(open);
        if (!open) {
            setDispositionTargets([]);
        }
    };

    const handleComposeSubmit = () => {
        form.post(route('super-admin.letters.store'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Surat berhasil dikirim');
                form.reset();
                form.setData('lampiran', null);
                setComposeOpen(false);
            },
            onError: () => {
                toast.error('Gagal menyimpan surat, periksa kembali data Anda');
            },
        });
    };

    const handleDispositionSubmit = (mode: 'forward' | 'reject' | 'final') => {
        const letterIds = dispositionTargets.map((letter) => letter.id);

        if (letterIds.length === 0) {
            toast.error('Tidak ada surat yang dipilih.');
            return;
        }

        if (mode === 'reject' && !(dispositionForm.data.disposition_note || '').trim()) {
            toast.error('Tambahkan catatan penolakan sebelum menolak surat.');
            return;
        }
        if (mode === 'final' && !(dispositionForm.data.disposition_note || '').trim()) {
            toast.error('Tambahkan catatan sebelum disposisi final.');
            return;
        }

        let routeName: string;
        if (mode === 'reject') {
            routeName = 'super-admin.letters.disposition.reject';
        } else if (mode === 'final') {
            routeName = 'super-admin.letters.disposition.final';
        } else {
            routeName = 'super-admin.letters.disposition.bulk';
        }

        dispositionForm.transform((data) => ({
            ...data,
            letter_ids: letterIds,
        }));

        dispositionForm.post(route(routeName), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                let message: string;
                if (mode === 'reject') {
                    message = `${letterIds.length} surat ditolak dan dikembalikan ke pengirim.`;
                } else if (mode === 'final') {
                    message = `${letterIds.length} surat didisposisi final. Penerima tidak dapat membalas.`;
                } else {
                    message = `${letterIds.length} surat didisposisi ke divisi tujuan.`;
                }
                toast.success(message);
                setDispositionOpen(false);
                setDispositionTargets([]);
                clearPendingSelection();
                dispositionForm.reset();
                router.reload({
                    preserveScroll: true,
                    only: ['stats', 'letters', 'pendingDisposition', 'sidebarNotifications'],
                });
            },
            onError: () => toast.error('Gagal mendisposisi surat, coba lagi.'),
        });
    };

    const handleArchiveLetter = (letter: LetterRecord) => {
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

        archiveForm.post(route('super-admin.letters.archive', letter.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Surat dipindahkan ke arsip.');
                if (selectedLetter && selectedLetter.id === letter.id) {
                    setDetailOpen(false);
                    setSelectedLetter(null);
                }
                router.reload({
                    preserveScroll: true,
                    only: ['stats', 'letters', 'pendingDisposition', 'sidebarNotifications'],
                });
            },
            onError: () => toast.error('Gagal mengarsipkan surat, coba lagi.'),
            onFinish: () => setArchivingLetterId(null),
        });
    };

    const handleUnarchiveLetter = (letter: LetterRecord) => {
        if (!letter || unarchiveForm.processing) {
            return;
        }

        if (letter.status !== 'Diarsipkan') {
            toast.info('Surat ini belum berada di arsip.');
            return;
        }

        setUnarchivingLetterId(letter.id);

        unarchiveForm.post(route('super-admin.letters.unarchive', letter.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Surat dikembalikan ke daftar aktif.');
                router.reload({
                    preserveScroll: true,
                    only: ['stats', 'letters', 'pendingDisposition', 'sidebarNotifications'],
                });
            },
            onError: () => toast.error('Gagal membatalkan arsip surat, coba lagi.'),
            onFinish: () => setUnarchivingLetterId(null),
        });
    };

    return {
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        priorityFilter,
        setPriorityFilter,
        activeTab,
        setActiveTab,
        filteredLetters,
        isComposeOpen,
        setComposeOpen,
        selectedLetter,
        detailOpen,
        setDetailOpen,
        dispositionOpen,
        handleDispositionDialogChange,
        dispositionTargets,
        selectedDispositionIds,
        selectedPendingCount,
        headerCheckboxState,
        isAllPendingSelected,
        form,
        dispositionForm,
        archiveForm,
        unarchiveForm,
        openDispositionDialog,
        handlePendingSelect,
        selectAllPending,
        clearPendingSelection,
        handleHeaderCheckboxChange,
        handleSelectLetter,
        handleArchiveLetter,
        handleUnarchiveLetter,
        handleComposeSubmit,
        handleDispositionSubmit,
        archivingLetterId,
        unarchivingLetterId,
    };
}




