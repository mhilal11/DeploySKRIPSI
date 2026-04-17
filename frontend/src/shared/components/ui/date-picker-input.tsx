"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

type DatePickerInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  fromYear?: number;
  toYear?: number;
  className?: string;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function normalizeDate(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseISODate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!year || !month || !day) {
    return undefined;
  }

  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return normalizeDate(parsed);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function DatePickerInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Pilih tanggal",
  minDate,
  maxDate,
  fromYear,
  toYear,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => parseISODate(value), [value]);
  const normalizedMinDate = React.useMemo(
    () => (minDate ? normalizeDate(minDate) : undefined),
    [minDate]
  );
  const normalizedMaxDate = React.useMemo(
    () => (maxDate ? normalizeDate(maxDate) : undefined),
    [maxDate]
  );

  const handleSelect = (date?: Date) => {
    if (!date) {
      return;
    }

    onChange(toISODate(date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!selectedDate}
          className={cn(
            "h-10 w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedDate ? dateFormatter.format(selectedDate) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          fromYear={fromYear ?? normalizedMinDate?.getFullYear() ?? 1900}
          toYear={toYear ?? normalizedMaxDate?.getFullYear() ?? new Date().getFullYear()}
          disabled={(date) => {
            const current = normalizeDate(date).getTime();

            if (normalizedMinDate && current < normalizedMinDate.getTime()) {
              return true;
            }

            if (normalizedMaxDate && current > normalizedMaxDate.getTime()) {
              return true;
            }

            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePickerInput };
