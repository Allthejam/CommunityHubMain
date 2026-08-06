
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4 w-full",
        month: "space-y-3 w-full flex flex-col items-center",
        month_caption: "flex justify-between pt-1 relative items-center w-full max-w-[280px] mb-2 px-1",
        caption_label: "text-sm font-semibold tracking-tight text-foreground",
        nav: "flex items-center space-x-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-border/60"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-border/60"
        ),
        month_grid: "w-full max-w-[280px] border-collapse",
        weekdays: "flex w-full flex-nowrap justify-between items-center mb-1",
        weekday:
          "text-muted-foreground rounded-md font-medium text-[0.8rem] h-8 w-[14.28%] shrink-0 flex items-center justify-center text-center",
        weeks: "w-full space-y-1",
        week: "flex w-full flex-nowrap justify-between items-center mt-1",
        day: "h-8 w-[14.28%] shrink-0 text-center text-sm p-0 relative flex items-center justify-center rounded-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal rounded-md flex items-center justify-center text-center"
        ),
        selected:
          "bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-xs",
        today: "bg-accent text-accent-foreground font-semibold border border-primary/30",
        outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
