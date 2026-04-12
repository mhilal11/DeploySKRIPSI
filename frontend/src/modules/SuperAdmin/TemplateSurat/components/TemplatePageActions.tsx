import { FilePlus2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

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
        </div>
    );
}
