import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/utils';

export interface AutocompleteOption {
    value: string;
    label: string;
}

interface AutocompleteInputProps {
    options: AutocompleteOption[];
    value?: string;
    onValueChange: (value: string) => void;
    onInputChange?: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    disabled?: boolean;
    allowCustomValue?: boolean;
    className?: string;
}

export function AutocompleteInput({
    options,
    value,
    onValueChange,
    onInputChange,
    placeholder = 'Ketik untuk mencari...',
    emptyText = 'Tidak ditemukan',
    disabled = false,
    allowCustomValue = false,
}: AutocompleteInputProps) {
    const [inputValue, setInputValue] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Find the label for current value
    const selectedLabel = React.useMemo(() => {
        if (!value) return '';
        const found = options.find(opt => opt.value === value);
        return found ? found.label : value;
    }, [value, options]);

    // Sync input value with selected value
    React.useEffect(() => {
        setInputValue(selectedLabel);
    }, [selectedLabel]);

    // Filter options based on input
    const filteredOptions = React.useMemo(() => {
        if (!inputValue.trim()) return [];
        const searchTerm = inputValue.toLowerCase();
        return options.filter(option =>
            option.label.toLowerCase().includes(searchTerm)
        );
    }, [inputValue, options]);

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setHighlightedIndex(-1);
        setIsOpen(newValue.trim().length > 0);
        onInputChange?.(newValue);

        if (newValue.trim() === '') {
            onValueChange('');
        }
    };

    // Handle blur
    const handleBlur = () => {
        setTimeout(() => {
            setIsOpen(false);
            if (allowCustomValue && inputValue.trim() !== '') {
                onValueChange(inputValue.trim());
            }

            if (allowCustomValue) {
                setInputValue(inputValue.trim());
                return;
            }

            if (value) {
                setInputValue(selectedLabel);
            } else {
                setInputValue('');
            }
        }, 150);
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setInputValue(selectedLabel);
            return;
        }

        if (!isOpen || filteredOptions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    const option = filteredOptions[highlightedIndex];
                    setInputValue(option.label);
                    setIsOpen(false);
                    onValueChange(option.value);
                }
                break;
        }
    };

    const showDropdown = isOpen && inputValue.trim().length > 0;

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => inputRef.current?.select()}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                    "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm outline-none",
                    "focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "placeholder:text-slate-400",
                    value && "border-green-500"
                )}
            />

            {showDropdown && (
                <div className="absolute z-[9999] mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                    <ul className="max-h-60 overflow-auto py-1">
                        {filteredOptions.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-slate-500">
                                {emptyText}
                            </li>
                        ) : (
                            filteredOptions.map((option, index) => (
                                <li
                                    key={`${option.value}-${index}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setInputValue(option.label);
                                        setIsOpen(false);
                                        setHighlightedIndex(-1);
                                        onValueChange(option.value);
                                    }}
                                    className={cn(
                                        'flex cursor-pointer items-center px-3 py-2 text-sm select-none',
                                        highlightedIndex === index && 'bg-blue-50',
                                        value === option.value && 'bg-blue-100 font-medium',
                                        'hover:bg-blue-50'
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4 text-blue-600 flex-shrink-0',
                                            value === option.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    <span>{option.label}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}


