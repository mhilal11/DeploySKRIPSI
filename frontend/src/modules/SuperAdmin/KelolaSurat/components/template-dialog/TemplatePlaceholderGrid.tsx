type TemplatePlaceholderGridProps = {
    placeholders: Record<string, string>;
};

export function TemplatePlaceholderGrid({ placeholders }: TemplatePlaceholderGridProps) {
    return (
        <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-2 sm:text-xs">
            {Object.entries(placeholders).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2">
                    <code className="shrink-0 rounded border bg-white px-1.5 py-0.5 text-[10px] sm:text-xs">{key}</code>
                    <span className="truncate text-right text-slate-500">{label}</span>
                </div>
            ))}
        </div>
    );
}
