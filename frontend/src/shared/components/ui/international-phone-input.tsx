"use client";

import { hasFlag } from 'country-flag-icons';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState, type SVGProps } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/shared/components/ui/command';
import { Input } from '@/shared/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/shared/components/ui/popover';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
    PHONE_COUNTRY_OPTIONS,
    buildInternationalPhoneValue,
    DEFAULT_PHONE_COUNTRY,
    getPhoneLengthHint,
    normalizePhoneInput,
    parseStoredPhoneNumber,
    validatePhoneNumberForCountry,
} from '@/shared/lib/phone-number';
import { cn } from '@/shared/lib/utils';

type PhoneCountryCode = (typeof PHONE_COUNTRY_OPTIONS)[number]['code'];
type FlagComponentType = (props: SVGProps<SVGSVGElement>) => JSX.Element;

interface InternationalPhoneInputProps {
    value?: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    numberPlaceholder?: string;
    countryPlaceholder?: string;
    className?: string;
    inputClassName?: string;
    error?: string;
}

export function InternationalPhoneInput({
    value = '',
    onChange,
    disabled = false,
    numberPlaceholder = '81234567890',
    countryPlaceholder = 'Cari negara atau kode telepon',
    className,
    inputClassName,
    error,
}: InternationalPhoneInputProps) {
    const parsedValue = useMemo(() => parseStoredPhoneNumber(value), [value]);
    const [country, setCountry] = useState<PhoneCountryCode>(parsedValue.country);
    const [localNumber, setLocalNumber] = useState(parsedValue.localNumber);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setCountry(parsedValue.country);
        setLocalNumber(parsedValue.localNumber);
    }, [parsedValue.country, parsedValue.localNumber]);

    const handleCommit = (
        nextCountry: PhoneCountryCode,
        nextLocalNumber: string,
    ) => {
        onChange(buildInternationalPhoneValue(nextCountry, nextLocalNumber));
    };

    const selectedCountry = useMemo(
        () =>
            PHONE_COUNTRY_OPTIONS.find((option) => option.code === country) ??
            PHONE_COUNTRY_OPTIONS.find((option) => option.code === DEFAULT_PHONE_COUNTRY),
        [country],
    );
    const validation = useMemo(
        () => validatePhoneNumberForCountry(country, localNumber),
        [country, localNumber],
    );
    const helperText = useMemo(
        () => `Pilih kode negara lalu masukkan nomor telepon aktif. ${getPhoneLengthHint(country)}`,
        [country],
    );

    return (
        <div className={className}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[112px_1fr]">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            disabled={disabled}
                            className={cn(
                                'h-9 w-full justify-between border-slate-300 bg-input-background px-3 font-normal text-slate-900 hover:bg-slate-50',
                                !selectedCountry && 'text-muted-foreground',
                                error && 'border-red-500',
                            )}
                        >
                            <span className="truncate font-medium">
                                {selectedCountry ? `+${selectedCountry.callingCode}` : '+--'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-[360px] rounded-xl border border-slate-200 p-0 shadow-lg"
                        align="start"
                        sideOffset={6}
                    >
                        <Command className="rounded-xl">
                            <div className="border-b border-slate-200 px-2 py-2">
                                <CommandInput
                                    placeholder={countryPlaceholder}
                                    className="h-10 rounded-lg border border-slate-200 bg-white px-3"
                                />
                            </div>
                            <CommandEmpty className="py-8 text-sm text-slate-500">
                                Negara atau kode telepon tidak ditemukan
                            </CommandEmpty>
                            <ScrollArea className="h-72">
                                <CommandList className="max-h-none">
                                    <CommandGroup className="p-2">
                                        {PHONE_COUNTRY_OPTIONS.map((option) => (
                                            <CommandItem
                                                key={option.code}
                                                value={`${option.name} +${option.callingCode} ${option.code}`}
                                                onSelect={() => {
                                                    setCountry(option.code);
                                                    handleCommit(option.code, localNumber);
                                                    setOpen(false);
                                                }}
                                                className="gap-3 rounded-lg px-3 py-2.5"
                                            >
                                                <CountryFlag code={option.code} name={option.name} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-slate-900">
                                                        {option.name}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-medium text-slate-500">
                                                    +{option.callingCode}
                                                </span>
                                                <Check
                                                    className={cn(
                                                        'h-4 w-4 text-blue-600',
                                                        country === option.code ? 'opacity-100' : 'opacity-0',
                                                    )}
                                                />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </ScrollArea>
                        </Command>
                    </PopoverContent>
                </Popover>
                <Input
                    value={localNumber}
                    onChange={(event) => {
                        const nextLocalNumber = normalizePhoneInput(event.target.value);
                        setLocalNumber(nextLocalNumber);
                        handleCommit(country, nextLocalNumber);
                    }}
                    placeholder={numberPlaceholder}
                    disabled={disabled}
                    inputMode="tel"
                    autoComplete="tel-national"
                    className={cn(inputClassName, error && 'border-red-500')}
                />
            </div>
            <p
                className={cn(
                    'mt-1 text-xs',
                    error
                        ? 'text-red-500'
                        : localNumber && !validation.isValid && validation.message
                          ? 'text-amber-600'
                          : 'text-slate-500',
                )}
            >
                {error ?? (localNumber && !validation.isValid ? validation.message : helperText)}
            </p>
        </div>
    );
}

function CountryFlag({
    code,
    name,
}: {
    code: PhoneCountryCode;
    name: string;
}) {
    if (!hasFlag(code)) {
        return (
            <div className="flex h-5 w-7 items-center justify-center rounded-sm bg-slate-100 text-[10px] font-semibold uppercase text-slate-500">
                {code}
            </div>
        );
    }

    const Flag = FlagIcons[code] as FlagComponentType | undefined;
    if (!Flag) {
        return (
            <div className="flex h-5 w-7 items-center justify-center rounded-sm bg-slate-100 text-[10px] font-semibold uppercase text-slate-500">
                {code}
            </div>
        );
    }

    return (
        <Flag
            aria-label={name}
            role="img"
            className="h-5 w-7 rounded-[3px] border border-slate-200 object-cover shadow-sm"
        />
    );
}
