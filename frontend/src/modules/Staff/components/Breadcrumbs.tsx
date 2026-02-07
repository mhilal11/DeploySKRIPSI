import { ChevronRight } from 'lucide-react';

import { Link } from '@/shared/lib/inertia';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="flex items-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const content =
                    item.href && !isLast ? (
                        <Link
                            href={item.href}
                            className="text-blue-900 hover:underline"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-slate-500">{item.label}</span>
                    );

                return (
                    <div key={item.label} className="flex items-center">
                        {index > 0 && (
                            <ChevronRight className="mx-2 h-3 w-3 text-slate-400" />
                        )}
                        {content}
                    </div>
                );
            })}
        </nav>
    );
}



