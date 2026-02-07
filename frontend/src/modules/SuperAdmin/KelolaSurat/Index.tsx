import { FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import ComposeLetterDialog from '@/modules/SuperAdmin/KelolaSurat/components/ComposeLetterDialog';
import DispositionDialog from '@/modules/SuperAdmin/KelolaSurat/components/DispositionDialog';
import LetterDetailDialog from '@/modules/SuperAdmin/KelolaSurat/components/LetterDetailDialog';
import { LetterRecord } from '@/modules/SuperAdmin/KelolaSurat/components/LettersTable';
import LettersTabsPanel from '@/modules/SuperAdmin/KelolaSurat/components/LettersTabsPanel';
import PendingDispositionPanel from '@/modules/SuperAdmin/KelolaSurat/components/PendingDispositionPanel';
import PriorityStatsCards from '@/modules/SuperAdmin/KelolaSurat/components/PriorityStatsCards';
import StatsCards from '@/modules/SuperAdmin/KelolaSurat/components/StatsCards';
import TemplateDialog from '@/modules/SuperAdmin/KelolaSurat/components/TemplateDialog';
import { useKelolaSuratState } from '@/modules/SuperAdmin/KelolaSurat/hooks/useKelolaSuratState';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Head, usePage } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

interface KelolaSuratPageProps extends Record<string, unknown> {
    stats: {
        inbox: number;
        outbox: number;
        pending: number;
        archived: number;
    };
    filters?: {
        search: string;
        category: string;
        tab: 'inbox' | 'outbox' | 'archive' | 'history';
    };
    letters: {
        inbox: LetterRecord[];
        outbox: LetterRecord[];
        archive: LetterRecord[];
    };
    pendingDisposition: LetterRecord[];
    options: {
        letterTypes: string[];
        categories: string[];
        priorities: Record<string, string>;
        divisions: string[];
    };
    nextLetterNumber: string;
}

type LettersCollection = {
    inbox: LetterRecord[];
    outbox: LetterRecord[];
    archive: LetterRecord[];
};

type LetterEventPayload = {
    action: string;
    letter: LetterRecord;
};

const pendingStatuses = ['Menunggu HR', 'Diajukan', 'Diproses'];
const DEFAULT_STATS: KelolaSuratPageProps['stats'] = {
    inbox: 0,
    outbox: 0,
    pending: 0,
    archived: 0,
};
const DEFAULT_LETTERS: KelolaSuratPageProps['letters'] = {
    inbox: [],
    outbox: [],
    archive: [],
};
const DEFAULT_OPTIONS: KelolaSuratPageProps['options'] = {
    letterTypes: [],
    categories: [],
    priorities: {},
    divisions: [],
};
const EMPTY_PENDING_DISPOSITION: LetterRecord[] = [];

export default function KelolaSuratIndex() {
    const page = usePage<PageProps<KelolaSuratPageProps>>();
    const auth = page.props?.auth;
    const stats = page.props?.stats ?? DEFAULT_STATS;
    const filters = page.props?.filters;
    const letters = page.props?.letters ?? DEFAULT_LETTERS;
    const options = page.props?.options ?? DEFAULT_OPTIONS;
    const nextLetterNumber = page.props?.nextLetterNumber ?? '';
    const pendingDisposition = page.props?.pendingDisposition ?? EMPTY_PENDING_DISPOSITION;

    const isHumanCapitalAdmin =
        auth?.user?.role === 'Admin' &&
        typeof auth?.user?.division === 'string' &&
        /human\s+(capital|resources)/i.test(auth?.user?.division ?? '');
    const breadcrumbs = isHumanCapitalAdmin
        ? [
            { label: 'Admin', href: route('admin-staff.dashboard') },
            { label: 'Kelola Surat' },
        ]
        : [
            { label: 'Super Admin', href: route('super-admin.dashboard') },
            { label: 'Kelola Surat' },
        ];

    const appliedFilters = {
        search: filters?.search ?? '',
        category: filters?.category ? filters.category : 'all',
        tab: (
            ['inbox', 'outbox', 'archive', 'history'].includes(filters?.tab ?? '')
                ? (filters?.tab as 'inbox' | 'outbox' | 'archive' | 'history')
                : 'inbox'
        ) as 'inbox' | 'outbox' | 'archive' | 'history',
    };

    const [liveData, setLiveData] = useState<{
        letters: LettersCollection;
        pending: LetterRecord[];
        stats: KelolaSuratPageProps['stats'];
    }>({
        letters,
        pending: pendingDisposition,
        stats,
    });

    const [templateOpen, setTemplateOpen] = useState(false);

    useEffect(() => {
        setLiveData({
            letters,
            pending: pendingDisposition,
            stats,
        });
    }, [letters, pendingDisposition, stats]);

    const sortLetters = useCallback((items: LetterRecord[]) => {
        return [...items].sort((a, b) => b.id - a.id);
    }, []);

    const resolveBucket = useCallback((letter: LetterRecord) => {
        if (letter.status === 'Diarsipkan' || letter.currentRecipient === 'archive') {
            return 'archive';
        }
        if (letter.currentRecipient === 'division') {
            return 'outbox';
        }
        return 'inbox';
    }, []);

    const recomputeStats = useCallback(
        (lettersState: LettersCollection, pending: LetterRecord[]) => ({
            inbox: lettersState.inbox.length,
            outbox: lettersState.outbox.length,
            pending: pending.length,
            archived: lettersState.archive.length,
        }),
        []
    );

    const upsertLetter = useCallback(
        (letter: LetterRecord) => {
            setLiveData((prev) => {
                const removeExisting = (list: LetterRecord[]) =>
                    list.filter((item) => item.id !== letter.id);

                const nextLetters: LettersCollection = {
                    inbox: removeExisting(prev.letters.inbox),
                    outbox: removeExisting(prev.letters.outbox),
                    archive: removeExisting(prev.letters.archive),
                };

                const bucket = resolveBucket(letter);
                nextLetters[bucket] = sortLetters([...nextLetters[bucket], letter]);

                const nextPendingBase = removeExisting(prev.pending);
                const shouldBePending = pendingStatuses.includes(letter.status);
                const nextPending = shouldBePending
                    ? sortLetters([...nextPendingBase, letter])
                    : nextPendingBase;

                return {
                    letters: nextLetters,
                    pending: nextPending,
                    stats: recomputeStats(nextLetters, nextPending),
                };
            });
        },
        [resolveBucket, sortLetters, recomputeStats]
    );

    useEffect(() => {
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.private('super-admin.letters');
        const handleLetterUpdated = (payload: LetterEventPayload) => {
            if (payload?.letter) {
                upsertLetter(payload.letter);
            }
        };

        channel
            .listen('LetterUpdated', handleLetterUpdated)
            .listen('.LetterUpdated', handleLetterUpdated);

        return () => {
            channel.stopListening('LetterUpdated');
            window.Echo?.leave('super-admin.letters');
        };
    }, [upsertLetter]);

    const {
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        activeTab,
        setActiveTab,
        filteredLetters,
        isComposeOpen,
        setComposeOpen,
        selectedLetter,
        detailOpen,
        setDetailOpen,
        handleSelectLetter,
        dispositionOpen,
        handleDispositionDialogChange,
        dispositionTargets,
        dispositionForm,
        openDispositionDialog,
        handlePendingSelect,
        selectAllPending,
        clearPendingSelection,
        handleHeaderCheckboxChange,
        selectedDispositionIds,
        selectedPendingCount,
        headerCheckboxState,
        isAllPendingSelected,
        priorityFilter,
        setPriorityFilter,
        form,
        handleComposeSubmit,
        handleDispositionSubmit,
        archiveForm,
        handleArchiveLetter,
        archivingLetterId,
        unarchiveForm,
        handleUnarchiveLetter,
        unarchivingLetterId,
    } = useKelolaSuratState({
        letters: liveData.letters,
        pendingDisposition: liveData.pending,
        appliedFilters,
    });

    return (
        <SuperAdminLayout
            title="Kelola Surat"
            description="Kelola surat masuk, keluar, dan arsip digital"
            breadcrumbs={breadcrumbs}
            actions={
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTemplateOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <FileText className="h-4 w-4" />
                        Template
                    </button>
                    <ComposeLetterDialog
                        open={isComposeOpen}
                        onOpenChange={setComposeOpen}
                        data={form.data}
                        setData={form.setData}
                        errors={form.errors}
                        processing={form.processing}
                        onSubmit={handleComposeSubmit}
                        userInfo={{
                            name: auth?.user?.name ?? '',
                            division: auth?.user?.division ?? '',
                            role: auth?.user?.role ?? '',
                        }}
                        options={options}
                        letterNumberPreview={nextLetterNumber}
                    />
                </div>
            }
        >
            <Head title="Kelola Surat" />

            <StatsCards stats={liveData.stats} />

            <PriorityStatsCards
                pendingDisposition={liveData.pending}
                activePriority={priorityFilter}
                onPriorityClick={setPriorityFilter}
            />

            <PendingDispositionPanel
                pendingDisposition={liveData.pending}
                selectedIds={selectedDispositionIds}
                selectedCount={selectedPendingCount}
                headerCheckboxState={headerCheckboxState}
                isAllSelected={isAllPendingSelected}
                priorityFilter={priorityFilter}
                onHeaderCheckboxChange={handleHeaderCheckboxChange}
                onToggleSelect={handlePendingSelect}
                onOpenDialog={openDispositionDialog}
                onSelectAll={selectAllPending}
                onClearSelection={clearPendingSelection}
            />

            <LettersTabsPanel
                searchQuery={searchQuery}
                categoryFilter={categoryFilter}
                categories={options.categories}
                onSearchChange={setSearchQuery}
                onCategoryChange={setCategoryFilter}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                filteredLetters={filteredLetters}
                onSelectLetter={handleSelectLetter}
                onArchiveLetter={handleArchiveLetter}
                archivingLetterId={archivingLetterId}
                archiveProcessing={archiveForm.processing}
                onUnarchiveLetter={handleUnarchiveLetter}
                unarchivingLetterId={unarchivingLetterId}
                unarchiveProcessing={unarchiveForm.processing}
            />

            <LetterDetailDialog
                letter={selectedLetter}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />

            <DispositionDialog
                open={dispositionOpen}
                onOpenChange={handleDispositionDialogChange}
                targets={dispositionTargets}
                dispositionForm={dispositionForm}
                onSubmit={handleDispositionSubmit}
            />

            <TemplateDialog
                open={templateOpen}
                onOpenChange={setTemplateOpen}
            />
        </SuperAdminLayout>
    );
}






