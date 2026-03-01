import { ChevronDown, Filter, Search, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AccountFiltersProps {
    search: string;
    role: string;
    status: string;
    onSearchChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    roleOptions: string[];
    statusOptions: string[];
    inputRef?: React.RefObject<HTMLInputElement>;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
    icon: React.ReactNode;
    className?: string;
}

function CustomSelect({
    value,
    onChange,
    options,
    placeholder,
    icon,
    className = '',
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayValue =
        value === 'all'
            ? placeholder
            : options.find((opt) => opt === value) || placeholder;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="group relative flex w-full items-center gap-2 md:gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300 hover:from-blue-50/50 hover:to-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
                <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
                    {icon}
                </div>
                <span
                    className={`flex-1 text-left transition-colors ${value === 'all'
                        ? 'text-slate-400'
                        : 'text-slate-700 font-semibold'
                        }`}
                >
                    {displayValue}
                </span>
                <ChevronDown
                    className={`h-4 w-4 md:h-5 md:w-5 text-slate-400 transition-all duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''
                        }`}
                />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('all');
                                setIsOpen(false);
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs md:text-sm transition-all duration-200 ${value === 'all'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Sparkles
                                className={`h-4 w-4 ${value === 'all'
                                    ? 'text-white'
                                    : 'text-slate-400'
                                    }`}
                            />
                            {placeholder}
                        </button>
                        <div className="my-1.5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs md:text-sm font-medium transition-all duration-200 ${value === option
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md'
                                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:translate-x-0.5'
                                    }`}
                            >
                                <div
                                    className={`h-1.5 w-1.5 rounded-full ${value === option
                                        ? 'bg-white'
                                        : 'bg-blue-400'
                                        }`}
                                />
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AccountFilters({
    search,
    role,
    status,
    onSearchChange,
    onRoleChange,
    onStatusChange,
    roleOptions,
    statusOptions,
    inputRef,
}: AccountFiltersProps) {
    return (
        <div className="space-y-3 md:space-y-4">
            {/* Search Bar */}
            <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex items-center">
                    <Search className="absolute left-3 md:left-4 h-4 w-4 md:h-5 md:w-5 text-slate-400 transition-colors duration-300 group-hover:text-blue-500" />
                    <input
                        ref={inputRef}
                        placeholder=" Cari nama, email, atau ID..."
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-11 md:h-14 w-full rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 pl-10 md:pl-12 pr-4 md:pr-6 text-xs md:text-sm font-medium text-slate-700 shadow-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-blue-400 focus:shadow-lg focus:ring-4 focus:ring-blue-500/10 focus:from-blue-50/50 focus:to-white hover:border-slate-300"
                    />
                </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col gap-3 md:gap-4 sm:flex-row">
                <CustomSelect
                    value={role}
                    onChange={onRoleChange}
                    options={roleOptions}
                    placeholder="Semua Role"
                    icon={<Filter className="h-4 w-4" />}
                    className="flex-1"
                />

                <CustomSelect
                    value={status}
                    onChange={onStatusChange}
                    options={statusOptions}
                    placeholder="Semua Status"
                    icon={<Sparkles className="h-4 w-4" />}
                    className="flex-1"
                />
            </div>
        </div>
    );
}

