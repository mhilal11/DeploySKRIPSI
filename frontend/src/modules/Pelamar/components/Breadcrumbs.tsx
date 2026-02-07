interface BreadcrumbsProps {
    items: string[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="text-sm text-slate-500">
            <ol className="flex flex-wrap items-center gap-1">
                {items.map((item, index) => (
                    <li key={item} className="flex items-center">
                        <span
                            className={
                                index === items.length - 1
                                    ? 'font-semibold text-blue-900'
                                    : undefined
                            }
                        >
                            {item}
                        </span>
                        {index < items.length - 1 && (
                            <span className="mx-2 text-slate-400">/</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

