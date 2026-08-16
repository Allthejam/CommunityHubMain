"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ date, setDate, disabled, className, placeholder = "dd/mm/yyyy" }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>(
    date ? format(date, "dd/MM/yyyy") : ""
  );
  const [isInvalid, setIsInvalid] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (date && isValid(date)) {
      const formatted = format(date, "dd/MM/yyyy");
      if (formatted !== inputValue) {
        setInputValue(formatted);
        setIsInvalid(false);
      }
    } else if (!date) {
        setInputValue("");
        setIsInvalid(false);
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, ""); // Allow only numbers

    if (value.length > 2 && value.length < 5) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    } else if (value.length >= 5) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4, 8)}`;
    }

    setInputValue(value);

    if (value.length === 10) {
      const parsedDate = parse(value, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate)) {
        setDate(parsedDate);
        setIsInvalid(false);
      } else {
        setIsInvalid(true);
      }
    } else {
      setIsInvalid(true);
    }
  };

  const handleBlur = () => {
    if (inputValue === "" || !isInvalid) {
        setIsInvalid(false);
        if (inputValue === "") setDate(undefined);
        return;
    }
    
    const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());
    if (isValid(parsedDate)) {
      setDate(parsedDate);
      setInputValue(format(parsedDate, "dd/MM/yyyy"));
      setIsInvalid(false);
    } else {
       setIsInvalid(true);
    }
  }

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate && isValid(selectedDate)) {
      setInputValue(format(selectedDate, "dd/MM/yyyy"));
      setIsInvalid(false);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={cn("pr-10", isInvalid && "border-destructive focus-visible:ring-destructive")}
        maxLength={10}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 h-full w-9 px-0 text-muted-foreground hover:text-foreground"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
