import type { InferSelectModel } from "drizzle-orm";
import { ArrowRight, BarChart3, Clock, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { activity } from "~/server/db/schema";
import { Button } from "~/components/ui/button";

type ActivityCardProps = {
  activity: InferSelectModel<typeof activity>;
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const router = useRouter();

  // Función simple para obtener iniciales
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  // Función para determinar un color base "pseudo-aleatorio" basado en el nombre
  // Esto mantiene consistencia visual sin guardar el color en BD
  const colors = [
    "from-blue-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-purple-500 to-pink-500",
    "from-cyan-500 to-blue-500",
  ];
  const colorIndex = activity.name.length % colors.length;
  const gradientClass = colors[colorIndex];

  return (
    <Card
      className="group relative flex flex-col justify-between overflow-hidden border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
      onClick={() => router.push(`/panel/activities/activity-logs/${activity.id}`)}
    >
      {/* Barra de color superior */}
      <div className={`absolute left-0 top-0 h-1 w-full bg-linear-to-r ${gradientClass}`} />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-6">
        <div className="flex items-center gap-3">
          {/* Avatar de la actividad */}
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${gradientClass} text-white shadow-md`}>
            <span className="font-bold tracking-wider">{getInitials(activity.name)}</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {activity.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
               {/* Si tuvieras created_at, podrías ponerlo aquí, si no, pon category si existe */}
               Actividad registrada
            </p>
          </div>
        </div>
        
        {/* Menú de opciones (Placeholder para el futuro: editar/borrar) */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300 min-h-10">
          {activity.description || "Sin descripción detallada para esta actividad."}
        </p>
      </CardContent>

      <CardFooter className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex w-full items-center justify-between">
          <Badge variant="secondary" className="bg-white hover:bg-white dark:bg-slate-800">
             <BarChart3 className="mr-1 h-3 w-3 text-slate-400" />
             Ver Progreso
          </Badge>
          
          <div className="flex items-center text-xs font-medium text-indigo-600 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 dark:text-indigo-400 -translate-x-2">
            Registrar
            <ArrowRight className="ml-1 h-3 w-3" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}