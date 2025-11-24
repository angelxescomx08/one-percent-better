"use client";

import { Plus, LayoutGrid, Search, Telescope } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input"; // Asumiendo que tienes este componente
import { ActivityCard } from "~/modules/activities/components/activityCard";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function Activities() {
  const { data: activities, isLoading } = api.activity.getActivities.useQuery();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrado simple en cliente (opcional, mejora UX)
  const filteredActivities = activities?.filter((act) =>
    act.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-slate-50/50 p-4 dark:bg-black md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* HEADER & CONTROLES */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Mis Actividades
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gestiona y registra tu progreso diario.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Barra de búsqueda decorativa (funcional si pasas props) */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar actividad..."
                className="w-64 bg-white pl-9 shadow-sm dark:bg-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => router.push("/panel/activities/create")}
              className="bg-indigo-600 shadow-md shadow-indigo-500/20 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Actividad
            </Button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-4 h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE (Diseño mejorado) */}
        {!isLoading && (!activities || activities.length === 0) && (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center animate-in fade-in zoom-in-95 duration-500 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="rounded-full bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <Telescope className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
              Aún no hay actividades
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Comienza creando tu primera actividad para empezar a rastrear tus métricas y visualizar tu progreso.
            </p>
            <Button
              className="mt-8"
              variant="outline"
              onClick={() => router.push("/panel/activities/create")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear mi primera actividad
            </Button>
          </div>
        )}

        {/* GRID DE ACTIVIDADES */}
        {!isLoading && filteredActivities && filteredActivities.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {filteredActivities.map((activity) => (
              <ActivityCard activity={activity} key={activity.id} />
            ))}
          </div>
        )}
        
        {/* Empty Search State */}
        {!isLoading && activities && activities.length > 0 && filteredActivities?.length === 0 && (
           <div className="py-12 text-center">
             <p className="text-slate-500">No se encontraron actividades con ese nombre.</p>
           </div>
        )}
      </div>
    </div>
  );
}