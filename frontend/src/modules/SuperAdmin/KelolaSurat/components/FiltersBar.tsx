import { Filter, Search } from 'lucide-react';
import { useMemo } from 'react';

import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

interface FiltersBarProps {
    search: string;
    category: string;
    categories: string[];
    onSearchChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
}

export default function FiltersBar({
    search,
    category,
    categories,
    onSearchChange,
    onCategoryChange,
}: FiltersBarProps) {
    const categoryOptions = useMemo(
        () => ['all', ...categories],
        [categories]
    );

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Cari surat..."
                        className="pl-9"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                    />
                </div>
            </div>
            <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                    {categoryOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option === 'all' ? 'Semua' : option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}


