import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import * as React from "react"
import {
  DayButton,
  DayPicker,
  type DropdownProps,
  getDefaultClassNames,
} from "react-day-picker"

import { Button, buttonVariants } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { cn } from "@/shared/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  buttonVariant = "ghost",
  formatters,
  components,
  fromYear,
  toYear,
  ...props
}: CalendarProps & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const currentYear = new Date().getFullYear()
  const resolvedFromYear = fromYear ?? currentYear - 5
  const resolvedToYear = toYear ?? currentYear + 5

  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        // --cell-size diatur ke 2.8rem agar teks label muat dengan nyaman
        "bg-background group/calendar p-3 [--cell-size:2.8rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      fromYear={resolvedFromYear}
      toYear={resolvedToYear}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "pointer-events-none absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "pointer-events-auto h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "pointer-events-auto h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-accent rounded-l-md",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Dropdown: CalendarDropdown,
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }
          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        // Mengganti komponen DayButton default dengan custom component
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

// --- CUSTOM DAY BUTTON ---
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)

  // Menggunakan optional chaining untuk safety
  React.useEffect(() => {
    if (modifiers?.focused) ref.current?.focus()
  }, [modifiers?.focused])

  const { children, ...restProps } = props

  // Logika Label
  // Kita pastikan modifiers ada sebelum mengakses property-nya
  const isRangeStart = modifiers?.range_start
  const isRangeEnd = modifiers?.range_end
  // const isSelected = modifiers?.selected (tidak digunakan di render, tapi ada di logic data attributes)

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      // Data attributes untuk styling CSS (shadcn standard)
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers?.selected &&
        !modifiers?.range_start &&
        !modifiers?.range_end &&
        !modifiers?.range_middle
      }
      data-range-start={modifiers?.range_start}
      data-range-end={modifiers?.range_end}
      data-range-middle={modifiers?.range_middle}
      className={cn(
        // Styling dasar state
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50",

        // Layout Utama Button
        "flex aspect-square h-auto w-full min-w-[--cell-size] flex-col items-center justify-center gap-0 font-normal leading-none",

        // Border radius logic
        "data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md",
        
        // Focus state
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px]",

        defaultClassNames.day,
        className
      )}
      {...restProps}
    >
      {/* 1. Render Nomor Tanggal */}
      <span
        className={cn(
          "text-sm font-medium transition-all",
          // Jika ada label start/end, teks tanggal diberi margin bawah kecil dan bold
          (isRangeStart || isRangeEnd) && "text-sm font-bold mb-0.5"
        )}
      >
        {children}
      </span>

      {/* 2. Render Label Mulai */}
      {isRangeStart && !isRangeEnd && (
        <span className="text-[0.55rem] font-medium uppercase tracking-wider opacity-90 leading-[0.6rem]">
          Mulai
        </span>
      )}

      {/* 3. Render Label Selesai */}
      {isRangeEnd && !isRangeStart && (
        <span className="text-[0.55rem] font-medium uppercase tracking-wider opacity-90 leading-[0.6rem]">
          Selesai
        </span>
      )}

      {/* 4. Render Label 1 Hari (Jika Mulai == Selesai) */}
      {isRangeStart && isRangeEnd && (
        <span className="text-[0.55rem] font-medium opacity-90 leading-[0.6rem]">
          1 Hari
        </span>
      )}
    </Button>
  )
}

Calendar.displayName = "Calendar"

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const selectedValue = value === undefined ? undefined : String(value)
  const selectedLabel =
    options?.find((option) => String(option.value) === selectedValue)?.label ??
    ""

  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (!onChange) {
          return
        }

        const event = {
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as React.ChangeEvent<HTMLSelectElement>

        onChange(event)
      }}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 min-w-[5.25rem] gap-1 rounded-md border-slate-300 bg-white px-2 text-sm shadow-none focus-visible:ring-2"
      >
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="max-h-[12.5rem] min-w-[var(--radix-select-trigger-width)]"
      >
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { Calendar, CalendarDayButton }

