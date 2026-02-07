interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="text-sm text-slate-500">
            <ol className="flex items-center gap-2">
                {items.map((item, index) => (
                    <li key={item.label} className="flex items-center gap-2">
                        {item.href ? (
                            <a href={item.href} className="text-blue-600 hover:underline">
                                {item.label}
                            </a>
                        ) : (
                            <span className="text-slate-600">{item.label}</span>
                        )}
                        {index < items.length - 1 && <span>/</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export type { BreadcrumbItem };

