"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium text-zinc-100",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 inline-flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 disabled:opacity-40"
        ),
        button_next: cn(
          "absolute right-1 inline-flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 disabled:opacity-40"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 font-normal text-[0.8rem] text-zinc-500",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          "inline-flex size-9 items-center justify-center rounded-md p-0 font-normal text-zinc-100",
          "hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500/60",
          "aria-selected:bg-blue-600 aria-selected:text-white aria-selected:hover:bg-blue-600"
        ),
        selected: "rounded-md",
        today: "text-amber-300",
        outside: "text-zinc-600 opacity-50",
        disabled: "text-zinc-600 opacity-30 pointer-events-none",
        hidden: "invisible",
        ...classNames
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" || orientation === "up" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
