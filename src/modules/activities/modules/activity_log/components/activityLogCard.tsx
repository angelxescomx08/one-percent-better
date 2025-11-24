import { CalendarDays, Edit2, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

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
      <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500/0 transition-colors group-hover:bg-indigo-500" />
      
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-slate-100 font-normal text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <CalendarDays className="mr-1.5 h-3 w-3" />
            {format(log.date, "d MMM, yyyy", { locale: es })}
          </Badge>
          
          <span className="text-xs text-slate-400">
            {format(log.date, "HH:mm")}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Valor Principal Grande */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {Number(log.value).toLocaleString("es-ES")}
          </span>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">
            {log.unit.shortName ?? log.unit.name}
          </span>
        </div>

        {/* Nota (si existe) */}
        {log.note && (
          <div className="relative rounded-md bg-amber-50 p-3 text-sm text-amber-900/80 dark:bg-amber-900/10 dark:text-amber-200/80">
            <FileText className="absolute left-2 top-2.5 h-3 w-3 opacity-50" />
            <p className="pl-4 line-clamp-2 leading-relaxed italic">
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