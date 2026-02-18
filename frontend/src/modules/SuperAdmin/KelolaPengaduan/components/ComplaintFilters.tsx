import { Search } from 'lucide-react';
import { ChangeEvent, useMemo } from 'react';

import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

import type { Option } from '../types';

interface ComplaintFiltersProps {
    search: string;
    status: string;
    priority: string;
    category: string;
    statusOptions: Option[];
    priorityOptions: Option[];
    categoryOptions: string[];
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onPriorityChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
}

export default function ComplaintFilters({
    search,
    status,
    priority,
    category,
    statusOptions,
    priorityOptions,
    categoryOptions,
    onSearchChange,
    onStatusChange,
    onPriorityChange,
    onCategoryChange,
}: ComplaintFiltersProps) {
    return (
        <div className="flex flex-col gap-2 md:gap-4 lg:flex-row">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 md:left-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={search}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        onSearchChange(event.target.value)
                    }
                    placeholder="Cari ID, subjek, atau isi..."
                    className="pl-8 md:pl-10 h-9 md:h-10 text-xs md:text-sm"
                />
            </div>
            <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-1 md:flex-wrap md:gap-2 lg:flex-none">
                <FilterSelect
                    placeholder="Status"
                    emptyLabel="Semua Status"
                    value={status}
                    onChange={onStatusChange}
                    options={statusOptions}
                />
                <FilterSelect
                    placeholder="Prioritas"
                    emptyLabel="Semua Prioritas"
                    value={priority}
                    onChange={onPriorityChange}
                    options={priorityOptions}
                />
                <FilterSelect
                    placeholder="Kategori"
                    emptyLabel="Semua Kategori"
                    value={category}
                    onChange={onCategoryChange}
                    options={categoryOptions.map((value) => ({
                        value,
                        label: value,
                    }))}
                />
            </div>
        </div>
    );
}

interface FilterSelectProps {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    emptyLabel: string;
}

function FilterSelect({
    placeholder,
    value,
    onChange,
    options,
    emptyLabel,
}: FilterSelectProps) {
    const safeOptions = useMemo(() => {
        const seen = new Set<string>();
        const deduped: Option[] = [];
        for (const option of options) {
            const optionValue = (option.value ?? '').trim();
            if (optionValue === '' || optionValue === 'all' || seen.has(optionValue)) {
                continue;
            }
            seen.add(optionValue);
            deduped.push(option);
        }
        return deduped;
    }, [options]);

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full min-w-0 md:min-w-[105px] lg:w-40 h-9 md:h-10 text-xs md:text-sm">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{emptyLabel}</SelectItem>
                {safeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}


