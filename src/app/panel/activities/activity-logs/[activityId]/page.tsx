"use client";

import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Skeleton } from "~/components/ui/skeleton";
import { ActivityLogCard } from "~/modules/activities/components/activityLogCard";
import { api } from "~/trpc/react";

const ITEMS_PER_PAGE = 10;

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
		setOffset(0); // Resetear a la primera página al cambiar filtro
	};

	const handleEndDateChange = (date: Date | undefined) => {
		setEndDate(date);
		setOffset(0); // Resetear a la primera página al cambiar filtro
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

	if (isLoadingActivity) {
		return (
			<section className="space-y-6 py-4">
				<Skeleton className="h-8 w-64" />
				<div className="space-y-4">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			</section>
		);
	}

	if (!activityData) {
		return (
			<section className="space-y-6 py-4">
				<Alert className="border-destructive bg-destructive/10 text-destructive">
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						No se pudo cargar la actividad. Por favor, intenta de nuevo.
					</AlertDescription>
				</Alert>
			</section>
		);
	}

	const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
	const totalPages = logsData
		? Math.ceil(logsData.totalCount / ITEMS_PER_PAGE)
		: 0;

	return (
		<section className="space-y-6 py-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">
						Registros de: {activityData.activity.name}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{activityData.activity.description ?? "Sin descripción"}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						className="flex items-center gap-2"
						onClick={() =>
							router.push(
								`/panel/activities/progress/register/${activityId}`,
							)
						}
					>
						<Plus className="h-4 w-4" />
						Registrar progreso
					</Button>
					<Button
						onClick={() => router.push("/panel/activities")}
						variant="outline"
					>
						Volver
					</Button>
				</div>
			</div>

			{/* Filtros */}
			<Card className="border">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Calendar className="h-5 w-5" />
						Filtros de fecha
					</CardTitle>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel>Fecha desde</FieldLabel>
								<FieldContent>
									<DatePicker
										date={startDate}
										onDateChange={handleStartDateChange}
										placeholder="Selecciona fecha inicial"
									/>
								</FieldContent>
							</Field>

							<Field>
								<FieldLabel>Fecha hasta</FieldLabel>
								<FieldContent>
									<DatePicker
										date={endDate}
										onDateChange={handleEndDateChange}
										placeholder="Selecciona fecha final"
									/>
								</FieldContent>
							</Field>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={handleClearFilters}
								type="button"
								variant="outline"
							>
								Limpiar filtros
							</Button>
						</div>
					</FieldGroup>
				</CardContent>
			</Card>

			{/* Loading */}
			{isLoadingLogs && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from(
						{ length: ITEMS_PER_PAGE },
						(_, i) => `log-skeleton-${i}`,
					).map((key) => (
						<div
							className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"
							key={key}
						>
							<Skeleton className="h-5 w-2/3" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					))}
				</div>
			)}

			{/* No logs */}
			{!isLoadingLogs && logsData && logsData.logs.length === 0 && (
				<Alert className="border-blue-300 bg-blue-50 text-blue-900">
					<AlertTitle>No hay registros</AlertTitle>
					<AlertDescription>
						{startDate || endDate
							? "No se encontraron registros con los filtros aplicados."
							: "Aún no has registrado progreso para esta actividad."}
					</AlertDescription>
				</Alert>
			)}

			{/* Logs */}
			{!isLoadingLogs && logsData && logsData.logs.length > 0 && (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{logsData.logs.map((log) => (
							<ActivityLogCard
								key={log.id}
								log={{
									id: log.id,
									date: log.date,
									value: log.value,
									note: log.note,
									unit: log.unit,
								}}
							/>
						))}
					</div>

					{/* Paginación */}
					<div className="flex items-center justify-between border-t pt-4">
						<div className="text-muted-foreground text-sm">
							Mostrando {offset + 1} -{" "}
							{Math.min(offset + ITEMS_PER_PAGE, logsData.totalCount)} de{" "}
							{logsData.totalCount} registros
						</div>
						<div className="flex items-center gap-2">
							<Button
								disabled={offset === 0}
								onClick={handlePreviousPage}
								size="sm"
								variant="outline"
							>
								<ChevronLeft className="h-4 w-4" />
								Anterior
							</Button>
							<span className="text-muted-foreground text-sm">
								Página {currentPage} de {totalPages || 1}
							</span>
							<Button
								disabled={!logsData.hasMore}
								onClick={handleNextPage}
								size="sm"
								variant="outline"
							>
								Siguiente
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</>
			)}
		</section>
	);
}
