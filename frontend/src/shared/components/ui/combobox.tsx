import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from './button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from './command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './popover';
import { cn } from './utils';

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = 'Pilih...',
    searchPlaceholder = 'Cari...',
    emptyText = 'Tidak ditemukan',
    disabled = false,
    className,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);

    const selectedOption = options.find(
        (option) => option.value.toLowerCase() === value?.toLowerCase()
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'w-full justify-between',
                        !selectedOption && 'text-muted-foreground',
                        className
                    )}
                    disabled={disabled}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue: string) => {
                                        onValueChange(
                                            currentValue === value?.toLowerCase()
                                                ? ''
                                                : option.value
                                        );
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value?.toLowerCase() === option.value.toLowerCase()
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

