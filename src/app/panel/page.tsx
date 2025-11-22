"use client";

import {
	BarChart3,
	Calendar,
	Crown,
	Medal,
	TrendingUp,
	Trophy,
} from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "~/components/ui/chart";
import { DatePicker } from "~/components/ui/date-picker";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

const MEDAL_COLORS = [
	"from-yellow-400 to-yellow-600", // Oro
	"from-gray-300 to-gray-500", // Plata
	"from-amber-600 to-amber-800", // Bronce
	"from-blue-400 to-blue-600", // 4to
	"from-purple-400 to-purple-600", // 5to
];

const RANK_ICONS = [Crown, Trophy, Medal, Trophy, Medal];

export default function PanelPage() {
	// Fechas para rankings
	const [rankingStartDate, setRankingStartDate] = useState<Date | undefined>(
		undefined,
	);
	const [rankingEndDate, setRankingEndDate] = useState<Date | undefined>(
		undefined,
	);

	// Fechas para mejoras porcentuales
	const [improvementStartDate, setImprovementStartDate] = useState<
		Date | undefined
	>(undefined);
	const [improvementEndDate, setImprovementEndDate] = useState<
		Date | undefined
	>(undefined);
	const [compareStartDate, setCompareStartDate] = useState<Date | undefined>(
		undefined,
	);
	const [compareEndDate, setCompareEndDate] = useState<Date | undefined>(
		undefined,
	);

	// Query para rankings
	const { data: rankingsData, isLoading: isLoadingRankings } =
		api.activity.getTopRankings.useQuery(
			{
				startDate: rankingStartDate,
				endDate: rankingEndDate,
			},
			{
				enabled: true,
			},
		);

	// Query para mejoras porcentuales
	const { data: improvementsData, isLoading: isLoadingImprovements } =
		api.activity.getImprovementPercentage.useQuery(
			{
				startDate: improvementStartDate ?? new Date(),
				endDate: improvementEndDate ?? new Date(),
				compareStartDate,
				compareEndDate,
			},
			{
				enabled:
					!!improvementStartDate &&
					!!improvementEndDate &&
					improvementStartDate <= improvementEndDate,
			},
		);

	const handleClearRankingFilters = () => {
		setRankingStartDate(undefined);
		setRankingEndDate(undefined);
	};

	const handleClearImprovementFilters = () => {
		setImprovementStartDate(undefined);
		setImprovementEndDate(undefined);
		setCompareStartDate(undefined);
		setCompareEndDate(undefined);
	};

	// Preparar datos para el gráfico de mejoras
	const chartData =
		improvementsData?.map((imp) => ({
			name: imp.activity.name,
			mejora: Number(imp.improvementPercentage.toFixed(2)),
			categoria: imp.category.name,
		})) ?? [];

	const chartConfig = {
		mejora: {
			label: "Mejora (%)",
			color: "hsl(var(--chart-1))",
		},
	};

	return (
		<div className="mx-auto max-w-7xl space-y-8 py-6">
			{/* Header */}
			<div>
				<h1 className="mb-2 font-bold text-3xl">Panel de Rendimiento</h1>
				<p className="text-muted-foreground text-sm">
					Revisa tus rankings y tu progreso en diferentes actividades
				</p>
			</div>

			{/* Rankings Section */}
			<Card className="border-2 shadow-lg">
				<CardHeader className="bg-linear-to-r from-purple-500/10 to-blue-500/10 pb-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-linear-to-br from-purple-500 to-blue-500 p-3">
								<Trophy className="h-6 w-6 text-white" />
							</div>
							<div>
								<CardTitle className="font-bold text-2xl">
									Top 5 Rankings
								</CardTitle>
								<CardDescription>
									Tus mejores posiciones en diferentes categorías
								</CardDescription>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-6">
					{/* Filtros de fecha para rankings */}
					<Card className="mb-6 border bg-muted/50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<Calendar className="h-5 w-5" />
								Filtros de Fecha - Rankings
							</CardTitle>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel>Fecha desde</FieldLabel>
										<FieldContent>
											<DatePicker
												date={rankingStartDate}
												onDateChange={setRankingStartDate}
												placeholder="Selecciona fecha inicial"
											/>
										</FieldContent>
									</Field>

									<Field>
										<FieldLabel>Fecha hasta</FieldLabel>
										<FieldContent>
											<DatePicker
												date={rankingEndDate}
												onDateChange={setRankingEndDate}
												placeholder="Selecciona fecha final"
											/>
										</FieldContent>
									</Field>
								</div>

								<Button
									onClick={handleClearRankingFilters}
									type="button"
									variant="outline"
								>
									Limpiar filtros
								</Button>
							</FieldGroup>
						</CardContent>
					</Card>

					{/* Loading */}
					{isLoadingRankings && (
						<div className="space-y-4">
							{Array.from({ length: 5 }, (_, i) => `ranking-skeleton-${i}`).map(
								(key) => (
									<Skeleton className="h-24 w-full" key={key} />
								),
							)}
						</div>
					)}

					{/* No data */}
					{!isLoadingRankings &&
						(!rankingsData || rankingsData.length === 0) && (
							<Alert>
								<AlertTitle>No hay datos de ranking</AlertTitle>
								<AlertDescription>
									No se encontraron rankings para el período seleccionado.
									Asegúrate de tener actividades y registros de progreso.
								</AlertDescription>
							</Alert>
						)}

					{/* Rankings List */}
					{!isLoadingRankings && rankingsData && rankingsData.length > 0 && (
						<div className="space-y-4">
							{rankingsData.map((ranking, index) => {
								const RankIcon = RANK_ICONS[index] ?? Medal;
								const medalGradient =
									MEDAL_COLORS[index] ?? "from-gray-400 to-gray-600";
								const unitName = ranking.unit.shortName ?? ranking.unit.name;

								return (
									<Card
										className={`relative overflow-hidden border-2 transition-all hover:shadow-xl ${
											index === 0
												? "border-yellow-400 bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20"
												: index === 1
													? "border-gray-300 bg-linear-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20"
													: index === 2
														? "border-amber-600 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
														: "border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
										}`}
										key={ranking.activity.id}
									>
										<CardContent className="p-6">
											<div className="flex items-start justify-between gap-4">
												<div className="flex items-start gap-4">
													{/* Medalla/Ranking */}
													<div
														className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${medalGradient} shadow-lg`}
													>
														<RankIcon className="h-8 w-8 text-white" />
													</div>

													{/* Información */}
													<div className="flex-1 space-y-2">
														<div className="flex items-center gap-3">
															<h3 className="font-bold text-xl">
																{ranking.activity.name}
															</h3>
															<Badge variant="secondary">
																{ranking.category.name}
															</Badge>
														</div>

														<div className="flex flex-wrap items-center gap-4 text-sm">
															<div>
																<span className="font-semibold">
																	Mejor marca:{" "}
																</span>
																<span className="font-bold text-lg text-primary">
																	{Number(ranking.userBestValue).toLocaleString(
																		"es-ES",
																		{
																			maximumFractionDigits: 2,
																		},
																	)}{" "}
																	{unitName}
																</span>
															</div>
															<div className="text-muted-foreground">
																Posición:{" "}
																<span className="font-bold text-foreground">
																	#{ranking.position}
																</span>{" "}
																de {ranking.totalUsers}
															</div>
														</div>

														{/* Barra de posición */}
														<div className="space-y-1">
															<div className="flex items-center justify-between text-xs">
																<span className="text-muted-foreground">
																	Posición en el ranking
																</span>
																<span className="font-semibold">
																	{ranking.positionPercentage.toFixed(1)}%
																</span>
															</div>
															<Progress
																className="h-3"
																value={ranking.positionPercentage}
															/>
														</div>
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Improvements Section */}
			<Card className="border-2 shadow-lg">
				<CardHeader className="bg-linear-to-r from-green-500/10 to-emerald-500/10 pb-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-linear-to-br from-green-500 to-emerald-500 p-3">
								<TrendingUp className="h-6 w-6 text-white" />
							</div>
							<div>
								<CardTitle className="font-bold text-2xl">
									Porcentaje de Mejora
								</CardTitle>
								<CardDescription>
									Compara tu rendimiento con períodos anteriores
								</CardDescription>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-6">
					{/* Filtros de fecha para mejoras */}
					<Card className="mb-6 border bg-muted/50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<BarChart3 className="h-5 w-5" />
								Filtros de Fecha - Mejoras
							</CardTitle>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<div className="space-y-4">
									<div>
										<h4 className="mb-3 font-semibold">Período Actual</h4>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<Field>
												<FieldLabel>Fecha desde</FieldLabel>
												<FieldContent>
													<DatePicker
														date={improvementStartDate}
														onDateChange={setImprovementStartDate}
														placeholder="Inicio período actual"
													/>
												</FieldContent>
											</Field>

											<Field>
												<FieldLabel>Fecha hasta</FieldLabel>
												<FieldContent>
													<DatePicker
														date={improvementEndDate}
														onDateChange={setImprovementEndDate}
														placeholder="Fin período actual"
													/>
												</FieldContent>
											</Field>
										</div>
									</div>

									<div>
										<h4 className="mb-3 font-semibold">
											Período de Comparación (Opcional)
										</h4>
										<p className="mb-3 text-muted-foreground text-sm">
											Si no se especifica, se usará el mismo rango anterior al
											período actual
										</p>
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<Field>
												<FieldLabel>Fecha desde</FieldLabel>
												<FieldContent>
													<DatePicker
														date={compareStartDate}
														onDateChange={setCompareStartDate}
														placeholder="Inicio período comparación"
													/>
												</FieldContent>
											</Field>

											<Field>
												<FieldLabel>Fecha hasta</FieldLabel>
												<FieldContent>
													<DatePicker
														date={compareEndDate}
														onDateChange={setCompareEndDate}
														placeholder="Fin período comparación"
													/>
												</FieldContent>
											</Field>
										</div>
									</div>
								</div>

								<Button
									onClick={handleClearImprovementFilters}
									type="button"
									variant="outline"
								>
									Limpiar filtros
								</Button>
							</FieldGroup>
						</CardContent>
					</Card>

					{/* Loading */}
					{isLoadingImprovements && <Skeleton className="h-96 w-full" />}

					{/* No data */}
					{!isLoadingImprovements &&
						(!improvementsData || improvementsData.length === 0) &&
						improvementStartDate &&
						improvementEndDate && (
							<Alert>
								<AlertTitle>No hay datos de mejora</AlertTitle>
								<AlertDescription>
									No se encontraron datos de mejora para el período
									seleccionado. Asegúrate de tener registros en ambos períodos.
								</AlertDescription>
							</Alert>
						)}

					{/* Warning para seleccionar fechas */}
					{(!improvementStartDate || !improvementEndDate) && (
						<Alert className="border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-300">
							<AlertTitle>Selecciona un período</AlertTitle>
							<AlertDescription>
								Por favor, selecciona las fechas del período actual para ver tus
								mejoras porcentuales.
							</AlertDescription>
						</Alert>
					)}

					{/* Chart */}
					{!isLoadingImprovements &&
						improvementsData &&
						improvementsData.length > 0 && (
							<div className="space-y-6">
								<ChartContainer className="h-96 w-full" config={chartConfig}>
									<ResponsiveContainer height="100%" width="100%">
										<BarChart data={chartData}>
											<XAxis
												angle={-45}
												dataKey="name"
												height={100}
												textAnchor="end"
												tick={{ fontSize: 12 }}
											/>
											<YAxis
												label={{
													value: "Mejora (%)",
													angle: -90,
													position: "insideLeft",
												}}
												tick={{ fontSize: 12 }}
											/>
											<ChartTooltip content={<ChartTooltipContent />} />
											<Bar
												dataKey="mejora"
												fill="var(--color-mejora)"
												radius={[8, 8, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								</ChartContainer>

								{/* Improvement Cards */}
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{improvementsData.map((improvement) => {
										const unitName =
											improvement.unit.shortName ?? improvement.unit.name;
										const isPositive = improvement.improvementPercentage > 0;

										return (
											<Card
												className={`border-2 transition-all hover:shadow-lg ${
													isPositive
														? "border-green-400 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
														: "border-red-400 bg-linear-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20"
												}`}
												key={improvement.activity.id}
											>
												<CardHeader>
													<div className="flex items-center justify-between">
														<CardTitle className="text-lg">
															{improvement.activity.name}
														</CardTitle>
														<Badge variant="secondary">
															{improvement.category.name}
														</Badge>
													</div>
													<CardDescription>{unitName}</CardDescription>
												</CardHeader>
												<CardContent className="space-y-3">
													<div className="text-center">
														<div
															className={`font-bold text-4xl ${
																isPositive
																	? "text-green-600 dark:text-green-400"
																	: "text-red-600 dark:text-red-400"
															}`}
														>
															{isPositive ? "+" : ""}
															{improvement.improvementPercentage.toFixed(2)}%
														</div>
														<div className="text-muted-foreground text-sm">
															{isPositive ? "Mejora" : "Disminución"}
														</div>
													</div>

													<div className="space-y-2 border-t pt-3 text-sm">
														<div className="flex justify-between">
															<span className="text-muted-foreground">
																Promedio actual:
															</span>
															<span className="font-semibold">
																{improvement.currentAvg.toFixed(2)} {unitName}
															</span>
														</div>
														<div className="flex justify-between">
															<span className="text-muted-foreground">
																Promedio anterior:
															</span>
															<span className="font-semibold">
																{improvement.previousAvg.toFixed(2)} {unitName}
															</span>
														</div>
													</div>
												</CardContent>
											</Card>
										);
									})}
								</div>
							</div>
						)}
				</CardContent>
			</Card>
		</div>
	);
}
