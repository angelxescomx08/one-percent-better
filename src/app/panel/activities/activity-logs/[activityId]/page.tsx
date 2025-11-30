"use client";

import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Clock,
	FilterX,
	History,
	Plus,
	SearchX,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { ActivityLogCard } from "~/modules/activities/modules/activity_log/components/activityLogCard";
// Asumo que ActivityLogCard ya está estilizada o usa la versión mejorada que te daré abajo
import { api } from "~/trpc/react";

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
			{ enabled: !!activityId },
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
			{ enabled: !!activityId },
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
						{Array.from({ length: 6 }).map((_) => (
							<Skeleton
								className="h-40 w-full rounded-2xl"
								key={crypto.randomUUID()}
							/>
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
						No pudimos cargar la información solicitada. Verifica la URL o
						intenta más tarde.
					</AlertDescription>
					<Button
						className="mt-4 border-red-200 hover:bg-red-100"
						onClick={() => router.push("/panel/activities")}
						variant="outline"
					>
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
		<div className="min-h-screen w-full bg-slate-50/50 p-4 transition-colors duration-300 ease-in-out md:p-8 dark:bg-black">
			<div className="mx-auto max-w-7xl space-y-8">
				{/* === HEADER SECTION === */}
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="fade-in slide-in-from-left-4 animate-in space-y-1 duration-500">
						<Button
							className="-ml-2 mb-2 h-auto p-2 text-slate-500 transition-all duration-300 ease-in-out hover:scale-105 hover:bg-transparent hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:text-slate-200"
							onClick={() => router.push("/panel/activities")}
							variant="ghost"
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							Volver a Actividades
						</Button>

						<div className="flex items-center gap-3">
							<h1 className="font-bold text-3xl text-slate-900 tracking-tight dark:text-slate-50">
								{activityData.activity.name}
							</h1>
							<Badge
								className="border-slate-300 dark:border-slate-700"
								variant="outline"
							>
								Historial
							</Badge>
						</div>
						<p className="max-w-2xl text-slate-500 dark:text-slate-400">
							{activityData.activity.description ??
								"Gestiona y visualiza el historial completo de tus registros para esta actividad."}
						</p>
					</div>

					<div className="fade-in slide-in-from-right-4 flex shrink-0 animate-in items-center gap-2 delay-100 duration-500">
						<Button
							className="bg-indigo-600 shadow-indigo-500/20 shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:shadow-xl focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600"
							onClick={() =>
								router.push(`/panel/activities/progress/register/${activityId}`)
							}
						>
							<Plus className="mr-2 h-4 w-4" />
							Nuevo Registro
						</Button>
					</div>
				</div>

				<Separator className="bg-slate-200 dark:bg-slate-800" />

				{/* === TOOLBAR DE FILTROS === */}
				<div className="-mx-1 fade-in slide-in-from-bottom-4 sticky top-4 z-10 animate-in rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-lg backdrop-blur-md transition-all delay-150 duration-500 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/90">
					<div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2">
						<div className="flex items-center gap-2 pl-2 font-medium text-slate-500 text-sm dark:text-slate-400">
							<History className="h-4 w-4 shrink-0" />
							<span>Filtrar por fecha</span>
						</div>

						<div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
								<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
									<span className="font-medium text-slate-600 text-xs sm:hidden dark:text-slate-400">
										Desde
									</span>
									<DatePicker
										className="w-full sm:w-[160px]"
										date={startDate}
										onDateChange={handleStartDateChange}
										placeholder="Desde..."
									/>
								</div>
								<span className="hidden self-center text-slate-300 text-sm sm:inline dark:text-slate-700">
									→
								</span>
								<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
									<span className="font-medium text-slate-600 text-xs sm:hidden dark:text-slate-400">
										Hasta
									</span>
									<DatePicker
										className="w-full sm:w-[160px]"
										date={endDate}
										onDateChange={handleEndDateChange}
										placeholder="Hasta..."
									/>
								</div>
							</div>

							{hasFilters && (
								<Button
									className="h-9 px-3 text-red-500 transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-50 hover:text-red-600 active:scale-95 dark:hover:bg-red-900/20"
									onClick={handleClearFilters}
									size="sm"
									variant="ghost"
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
							{Array.from({ length: 6 }).map((_) => (
								<div
									className="flex flex-col gap-3 rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900"
									key={crypto.randomUUID()}
								>
									<div className="flex justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-4" />
									</div>
									<Skeleton className="my-2 h-8 w-1/2" />
									<Skeleton className="h-4 w-full" />
								</div>
							))}
						</div>
					) : !logsData || logsData.logs.length === 0 ? (
						<div className="fade-in zoom-in-95 flex animate-in flex-col items-center justify-center py-20 text-center">
							<div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
								{hasFilters ? (
									<SearchX className="h-8 w-8 text-slate-400" />
								) : (
									<Clock className="h-8 w-8 text-slate-400" />
								)}
							</div>
							<h3 className="mt-4 font-semibold text-lg text-slate-900 dark:text-slate-100">
								{hasFilters
									? "No se encontraron resultados"
									: "Historial vacío"}
							</h3>
							<p className="mt-2 max-w-sm text-slate-500 dark:text-slate-400">
								{hasFilters
									? "Intenta ajustar las fechas de tu búsqueda para ver más resultados."
									: "Aún no has registrado ningún progreso. ¡Haz tu primer registro hoy!"}
							</p>
							{!hasFilters && (
								<Button
									className="mt-6"
									onClick={() =>
										router.push(
											`/panel/activities/progress/register/${activityId}`,
										)
									}
									variant="outline"
								>
									Empezar ahora
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-6">
							{/* Grid de Logs */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{logsData.logs.map((log, index) => (
									<div
										className="fade-in slide-in-from-bottom-4 animate-in"
										key={log.id}
										style={{
											animationDelay: `${index * 50}ms`,
											animationDuration: "500ms",
											animationFillMode: "both",
										}}
									>
										<ActivityLogCard
											log={{
												id: log.id,
												date: log.date,
												value: Number(log.value),
												note: log.note,
												unit: log.unit,
											}}
										/>
									</div>
								))}
							</div>

							{/* Paginación Estilizada */}
							<div className="flex flex-col items-center justify-between gap-4 border-slate-200 border-t pt-6 sm:flex-row dark:border-slate-800">
								<p className="text-center text-slate-500 text-sm sm:text-left dark:text-slate-400">
									Mostrando{" "}
									<span className="font-medium text-slate-900 dark:text-slate-200">
										{offset + 1}-
										{Math.min(offset + ITEMS_PER_PAGE, logsData.totalCount)}
									</span>{" "}
									de{" "}
									<span className="font-medium text-slate-900 dark:text-slate-200">
										{logsData.totalCount}
									</span>{" "}
									registros
								</p>

								<div className="flex items-center gap-1 rounded-md border border-slate-200/80 bg-white/90 p-1 shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out dark:border-slate-800/80 dark:bg-slate-900/90">
									<Button
										className="h-8 w-8 rounded-sm transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
										disabled={offset === 0}
										onClick={handlePreviousPage}
										size="icon"
										variant="ghost"
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<span className="min-w-[80px] text-center font-medium text-sm">
										Pág. {currentPage} / {totalPages || 1}
									</span>
									<Button
										className="h-8 w-8 rounded-sm transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
										disabled={!logsData.hasMore}
										onClick={handleNextPage}
										size="icon"
										variant="ghost"
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
