import { Download, FilePlus2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { apiUrl } from '@/shared/lib/api';
import { route } from '@/shared/lib/route';

import type { EditorMode } from './types';

type TemplatePageActionsProps = {
    editorMode: EditorMode;
    isBusy: boolean;
    onCreateNew: () => void;
};

export function TemplatePageActions({
    editorMode,
    isBusy,
    onCreateNew,
}: TemplatePageActionsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            <Button
                type="button"
                variant={editorMode === 'create' ? 'default' : 'outline'}
                onClick={onCreateNew}
                disabled={isBusy}
            >
                <FilePlus2 />
                Template Baru
            </Button>
            <Button variant="outline" asChild>
                <a href={apiUrl(route('super-admin.letters.templates.sample'))}>
                    <Download />
                    Unduh Contoh
                </a>
            </Button>
        </div>
    );
}
