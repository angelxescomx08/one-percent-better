"use client";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  History,
  FilterX,
  Clock,
  SearchX,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";

// Asumo que ActivityLogCard ya está estilizada o usa la versión mejorada que te daré abajo
import { api } from "~/trpc/react";
import { ActivityLogCard } from "~/modules/activities/modules/activity_log/components/activityLogCard";

const ITEMS_PER_PAGE = 9; // Ajustado a múltiplo de 3 para grid

export default function ActivityLogsPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.activityId as string;

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [offset, setOffset] = useState(0);

  const { data: activityData, isLoading: isLoadingActivity } =
    api.activity.getActivityById.useQuery(
      { activityId },
      { enabled: !!activityId }
    );

  const { data: logsData, isLoading: isLoadingLogs } =
    api.activity.getActivityLogs.useQuery(
      {
        activityId,
        startDate,
        endDate,
        limit: ITEMS_PER_PAGE,
        offset,
      },
      { enabled: !!activityId }
    );

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setOffset(0);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setOffset(0);
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setOffset(0);
  };

  const handlePreviousPage = () => {
    setOffset((prev) => Math.max(0, prev - ITEMS_PER_PAGE));
  };

  const handleNextPage = () => {
    if (logsData?.hasMore) {
      setOffset((prev) => prev + ITEMS_PER_PAGE);
    }
  };

  // --- LOADING STATE: ACTIVITY INFO ---
  if (isLoadingActivity) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 dark:bg-black">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex items-center gap-4">
             <Skeleton className="h-10 w-10 rounded-full" />
             <div className="space-y-2">
               <Skeleton className="h-8 w-64" />
               <Skeleton className="h-4 w-96" />
             </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
             {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
             ))}
          </div>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (!activityData) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4">
        <Alert className="max-w-md border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          <AlertTitle>Actividad no encontrada</AlertTitle>
          <AlertDescription>
            No pudimos cargar la información solicitada. Verifica la URL o intenta más tarde.
          </AlertDescription>
          <Button variant="outline" className="mt-4 border-red-200 hover:bg-red-100" onClick={() => router.push('/panel/activities')}>
             Volver al panel
          </Button>
        </Alert>
      </div>
    );
  }

  const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
  const totalPages = logsData
    ? Math.ceil(logsData.totalCount / ITEMS_PER_PAGE)
    : 0;

  const hasFilters = startDate || endDate;

  return (
    <div className="min-h-screen w-full bg-slate-50/50 p-4 dark:bg-black md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* === HEADER SECTION === */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="mb-2 -ml-2 h-auto p-2 text-slate-500 hover:bg-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              onClick={() => router.push("/panel/activities")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver a Actividades
            </Button>
            
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {activityData.activity.name}
              </h1>
              <Badge variant="outline" className="border-slate-300 dark:border-slate-700">
                Historial
              </Badge>
            </div>
            <p className="max-w-2xl text-slate-500 dark:text-slate-400">
              {activityData.activity.description ?? "Gestiona y visualiza el historial completo de tus registros para esta actividad."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => router.push(`/panel/activities/progress/register/${activityId}`)}
              className="bg-indigo-600 shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Registro
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-200 dark:bg-slate-800" />

        {/* === TOOLBAR DE FILTROS === */}
        <div className="sticky top-4 z-10 -mx-1 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 pl-2">
               <History className="h-4 w-4" />
               <span className="hidden sm:inline">Filtrar por fecha:</span>
            </div>
            
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <div className="flex items-center gap-2">
                <DatePicker
                  date={startDate}
                  onDateChange={handleStartDateChange}
                  placeholder="Desde..."
                  className="w-full sm:w-[160px]"
                />
                <span className="text-slate-300 dark:text-slate-700">→</span>
                <DatePicker
                  date={endDate}
                  onDateChange={handleEndDateChange}
                  placeholder="Hasta..."
                  className="w-full sm:w-[160px]"
                />
              </div>
              
              {hasFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <FilterX className="mr-2 h-3.5 w-3.5" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* === CONTENT SECTION === */}
        <div className="min-h-[400px]">
          {isLoadingLogs ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="flex flex-col gap-3 rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900">
                    <div className="flex justify-between"><Skeleton className="h-4 w-24"/><Skeleton className="h-4 w-4"/></div>
                    <Skeleton className="h-8 w-1/2 my-2"/>
                    <Skeleton className="h-4 w-full"/>
                 </div>
              ))}
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
               <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                 {hasFilters ? <SearchX className="h-8 w-8 text-slate-400"/> : <Clock className="h-8 w-8 text-slate-400"/>}
               </div>
               <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                 {hasFilters ? "No se encontraron resultados" : "Historial vacío"}
               </h3>
               <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">
                 {hasFilters 
                   ? "Intenta ajustar las fechas de tu búsqueda para ver más resultados." 
                   : "Aún no has registrado ningún progreso. ¡Haz tu primer registro hoy!"}
               </p>
               {!hasFilters && (
                 <Button 
                   onClick={() => router.push(`/panel/activities/progress/register/${activityId}`)}
                   variant="outline" 
                   className="mt-6"
                 >
                   Empezar ahora
                 </Button>
               )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grid de Logs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {logsData.logs.map((log) => (
                  <ActivityLogCard
                    key={log.id}
                    log={{
                      id: log.id,
                      date: log.date,
                      value: Number(log.value),
                      note: log.note,
                      unit: log.unit,
                    }}
                  />
                ))}
              </div>

              {/* Paginación Estilizada */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
                  Mostrando <span className="font-medium text-slate-900 dark:text-slate-200">{offset + 1}-{Math.min(offset + ITEMS_PER_PAGE, logsData.totalCount)}</span> de <span className="font-medium text-slate-900 dark:text-slate-200">{logsData.totalCount}</span> registros
                </p>
                
                <div className="flex items-center gap-1 rounded-md bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-sm"
                    onClick={handlePreviousPage}
                    disabled={offset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[80px] text-center text-sm font-medium">
                     Pág. {currentPage} / {totalPages || 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-sm"
                    onClick={handleNextPage}
                    disabled={!logsData.hasMore}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}