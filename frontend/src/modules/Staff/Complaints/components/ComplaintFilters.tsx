import { Search } from 'lucide-react';
import { ChangeEvent } from 'react';

import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

import type { ComplaintFiltersOptions } from '../types';

interface ComplaintFiltersProps {
    searchTerm: string;
    statusFilter: string;
    categoryFilter: string;
    priorityFilter: string;
    filters: ComplaintFiltersOptions;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onPriorityChange: (value: string) => void;
}

export default function ComplaintFilters({
    searchTerm,
    statusFilter,
    categoryFilter,
    priorityFilter,
    filters,
    onSearchChange,
    onStatusChange,
    onCategoryChange,
    onPriorityChange,
}: ComplaintFiltersProps) {
    // Use a static list of categories to ensure all options are always available
    const categoryOptions = [
        'Lingkungan Kerja',
        'Kompensasi & Benefit',
        'Fasilitas',
        'Relasi Kerja',
        'Kebijakan Perusahaan',
        'Lainnya',
    ];

    const statusOptions = withFallback(filters.statuses, [
        'Menunggu HR',
        'Proses',
        'Selesai',
    ]);

    const priorityOptions = withFallback(filters.priorities, [
        'High',
        'Medium',
        'Low',
    ]);

    return (
        <div className="mb-6 space-y-3 md:grid md:grid-cols-2 md:items-start md:gap-3 md:space-y-0">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={searchTerm}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        onSearchChange(event.target.value)
                    }
                    placeholder="Cari pengaduan berdasarkan subjek, kategori, atau ID"
                    className="pl-10"
                />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <FilterSelect
                    value={statusFilter}
                    onChange={onStatusChange}
                    placeholder="Status"
                    options={statusOptions}
                    label="Semua Status"
                />
                <FilterSelect
                    value={categoryFilter}
                    onChange={onCategoryChange}
                    placeholder="Kategori"
                    options={categoryOptions}
                    label="Semua Kategori"
                />
                <FilterSelect
                    value={priorityFilter}
                    onChange={onPriorityChange}
                    placeholder="Prioritas"
                    options={priorityOptions}
                    label="Semua Prioritas"
                />
            </div>
        </div>
    );
}

interface FilterSelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: string[];
    label: string;
}

function FilterSelect({
    value,
    onChange,
    placeholder,
    options,
    label,
}: FilterSelectProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{label}</SelectItem>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function withFallback(values: string[], fallback: string[]) {
    if (values.length > 0) {
        return Array.from(new Set(values));
    }

    return fallback;
}


