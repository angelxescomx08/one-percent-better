"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface DatePickerProps {
	date?: Date;
	onDateChange?: (date: Date | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function DatePicker({
	date,
	onDateChange,
	placeholder = "Selecciona una fecha",
	className,
	disabled,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					className={cn(
						"w-full justify-start text-left font-normal",
						!date && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
					variant="outline"
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date ? (
						format(date, "PPP", { locale: es })
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar
					initialFocus
					locale={es}
					mode="single"
					onSelect={(selectedDate) => {
						onDateChange?.(selectedDate);
						setOpen(false);
					}}
					selected={date}
				/>
			</PopoverContent>
		</Popover>
	);
}
