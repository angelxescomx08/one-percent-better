import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, FileText } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

interface ActivityLogCardProps {
	log: {
		id: string;
		date: Date;
		value: number;
		note?: string | null;
		unit: {
			name: string;
			shortName?: string | null;
		};
	};
}

export function ActivityLogCard({ log }: ActivityLogCardProps) {
	return (
		<Card className="group relative overflow-hidden transition-all hover:shadow-md dark:hover:border-slate-700">
			{/* Indicador lateral de color (opcional, decorativo) */}
			<div className="absolute top-0 left-0 h-full w-1 bg-indigo-500/0 transition-colors group-hover:bg-indigo-500" />

			<CardHeader className="pt-5 pb-3">
				<div className="flex items-center justify-between">
					<Badge
						className="bg-slate-100 font-normal text-slate-600 dark:bg-slate-800 dark:text-slate-300"
						variant="secondary"
					>
						<CalendarDays className="mr-1.5 h-3 w-3" />
						{format(log.date, "d MMM, yyyy", { locale: es })}
					</Badge>

					<span className="text-slate-400 text-xs">
						{format(log.date, "HH:mm")}
					</span>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Valor Principal Grande */}
				<div className="flex items-baseline gap-1">
					<span className="font-extrabold text-4xl text-slate-900 tracking-tight dark:text-slate-50">
						{Number(log.value).toLocaleString("es-ES")}
					</span>
					<span className="font-semibold text-slate-500 text-sm uppercase dark:text-slate-400">
						{log.unit.shortName ?? log.unit.name}
					</span>
				</div>

				{/* Nota (si existe) */}
				{log.note && (
					<div className="relative rounded-md bg-amber-50 p-3 text-amber-900/80 text-sm dark:bg-amber-900/10 dark:text-amber-200/80">
						<FileText className="absolute top-2.5 left-2 h-3 w-3 opacity-50" />
						<p className="line-clamp-2 pl-4 italic leading-relaxed">
							"{log.note}"
						</p>
					</div>
				)}
			</CardContent>

			{/* Footer solo si queremos acciones futuras como Editar/Borrar */}
			{/* 
      <CardFooter className="border-t bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            <Edit2 className="mr-2 h-3 w-3" /> Editar registro
          </Button>
      </CardFooter> 
      */}
		</Card>
	);
}
