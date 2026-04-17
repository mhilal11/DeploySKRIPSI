"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

type YearPickerInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  className?: string;
};

const parseYear = (value?: string | null) => {
  if (!value || !/^\d{4}$/.test(value)) {
    return undefined;
  }

  const year = Number(value);
  return Number.isNaN(year) ? undefined : year;
};

const YEARS_PER_PAGE = 12;

const clampYear = (year: number, minYear: number, maxYear: number) =>
  Math.min(Math.max(year, minYear), maxYear);

const getPageStart = (year: number, minYear: number) =>
  minYear + Math.floor((year - minYear) / YEARS_PER_PAGE) * YEARS_PER_PAGE;

function YearPickerInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Pilih tahun",
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  className,
}: YearPickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const selectedYear = React.useMemo(() => parseYear(value), [value]);
  const [pageStartYear, setPageStartYear] = React.useState(
    getPageStart(clampYear(selectedYear ?? maxYear, minYear, maxYear), minYear),
  );

  React.useEffect(() => {
    setPageStartYear(
      getPageStart(clampYear(selectedYear ?? maxYear, minYear, maxYear), minYear),
    );
  }, [selectedYear, minYear, maxYear]);

  const handleYearSelect = React.useCallback(
    (year: number) => {
      onChange(String(year));
      setOpen(false);
    },
    [onChange],
  );

  const years = React.useMemo(
    () =>
      Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStartYear + index).filter(
        (year) => year >= minYear && year <= maxYear,
      ),
    [pageStartYear, minYear, maxYear],
  );

  const canGoPrevious = pageStartYear > minYear;
  const canGoNext = pageStartYear + YEARS_PER_PAGE - 1 < maxYear;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!selectedYear}
          className={cn(
            "h-10 w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selectedYear ?? placeholder}</span>
          <CalendarIcon className="h-4 w-4 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setPageStartYear((current) =>
                  clampYear(current - YEARS_PER_PAGE, minYear, maxYear),
                )
              }
              disabled={!canGoPrevious}
              aria-label="Tahun sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-medium text-slate-700">
              {years[0]} - {years[years.length - 1]}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setPageStartYear((current) =>
                  clampYear(current + YEARS_PER_PAGE, minYear, maxYear),
                )
              }
              disabled={!canGoNext}
              aria-label="Tahun berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {years.map((year) => {
              const isSelected = selectedYear === year;

              return (
                <Button
                  key={year}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleYearSelect(year)}
                  className={cn(
                    "h-10",
                    isSelected && "bg-blue-900 hover:bg-blue-800",
                  )}
                >
                  {year}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { YearPickerInput };
