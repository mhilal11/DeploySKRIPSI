import ArchiveList from '@/modules/SuperAdmin/KelolaSurat/components/ArchiveList';
import DispositionHistoryTab from '@/modules/SuperAdmin/KelolaSurat/components/DispositionHistoryTab';
import FiltersBar from '@/modules/SuperAdmin/KelolaSurat/components/FiltersBar';
import LettersTable, { LetterRecord } from '@/modules/SuperAdmin/KelolaSurat/components/LettersTable';
import { Card } from '@/shared/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/shared/components/ui/tabs';

interface LettersTabsPanelProps {
    searchQuery: string;
    categoryFilter: string;
    categories: string[];
    onSearchChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    activeTab: 'inbox' | 'outbox' | 'archive' | 'history';
    onTabChange: (value: 'inbox' | 'outbox' | 'archive' | 'history') => void;
    filteredLetters: {
        inbox: LetterRecord[];
        outbox: LetterRecord[];
        archive: LetterRecord[];
        history: LetterRecord[];
    };
    onSelectLetter: (letter: LetterRecord) => void;
    onArchiveLetter?: (letter: LetterRecord) => void;
    archivingLetterId?: number | null;
    archiveProcessing?: boolean;
    onUnarchiveLetter?: (letter: LetterRecord) => void;
    unarchivingLetterId?: number | null;
    unarchiveProcessing?: boolean;
}

export default function LettersTabsPanel({
    searchQuery,
    categoryFilter,
    categories,
    onSearchChange,
    onCategoryChange,
    activeTab,
    onTabChange,
    filteredLetters,
    onSelectLetter,
    onArchiveLetter,
    archivingLetterId,
    archiveProcessing,
    onUnarchiveLetter,
    unarchivingLetterId,
    unarchiveProcessing,
}: LettersTabsPanelProps) {
    return (
        <Card className="p-3 md:p-6">
            <div className="mb-4 md:mb-6">
                <FiltersBar
                    search={searchQuery}
                    category={categoryFilter}
                    categories={categories}
                    onSearchChange={onSearchChange}
                    onCategoryChange={onCategoryChange}
                />
            </div>

            <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as typeof activeTab)}>
                <TabsList className="mb-4 md:mb-5">
                    <TabsTrigger
                        value="inbox"
                        className="rounded-lg px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-900 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
                    >
                        Inbox
                    </TabsTrigger>
                    <TabsTrigger
                        value="outbox"
                        className="rounded-lg px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-900 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
                    >
                        Outbox
                    </TabsTrigger>
                    <TabsTrigger
                        value="archive"
                        className="rounded-lg px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-900 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
                    >
                        Arsip
                    </TabsTrigger>
                    <TabsTrigger
                        value="history"
                        className="rounded-lg px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-900 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
                    >
                        Riwayat Disposisi
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="inbox">
                    <LettersTable
                        letters={filteredLetters.inbox}
                        variant="inbox"
                        onSelect={onSelectLetter}
                        onArchive={onArchiveLetter}
                        archivingId={archivingLetterId}
                        archiveProcessing={archiveProcessing}
                    />
                </TabsContent>
                <TabsContent value="outbox">
                    <LettersTable
                        letters={filteredLetters.outbox}
                        variant="outbox"
                        onSelect={onSelectLetter}
                        onArchive={onArchiveLetter}
                        archivingId={archivingLetterId}
                        archiveProcessing={archiveProcessing}
                    />
                </TabsContent>
                <TabsContent value="archive">
                    <ArchiveList
                        letters={filteredLetters.archive}
                        onSelect={onSelectLetter}
                        onUnarchive={onUnarchiveLetter}
                        unarchivingId={unarchivingLetterId}
                        unarchiveProcessing={unarchiveProcessing}
                    />
                </TabsContent>
                <TabsContent value="history">
                    <DispositionHistoryTab letters={filteredLetters.history} onSelect={onSelectLetter} />
                </TabsContent>
            </Tabs>
        </Card>
    );
}



