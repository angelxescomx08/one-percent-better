"use client";

import {
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
import { Skeleton } from "~/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

type Period = "yesterday" | "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
	yesterday: "Ayer",
	week: "Última semana",
	month: "Último mes",
	year: "Último año",
	all: "Desde siempre",
};

const RANK_ICONS = [Crown, Trophy, Medal];

export default function PanelPage() {
	const [activeTab, setActiveTab] = useState<"rankings" | "improvements">(
		"rankings",
	);
	const [rankingPeriod, setRankingPeriod] = useState<Period>("week");
	const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
		null,
	);
	const [improvementPeriod, setImprovementPeriod] = useState<Period>("week");

	// Query para obtener top rankings
	const { data: topRankingsData, isLoading: isLoadingTopRankings } =
		api.activity.getTopRankings.useQuery(
			{
				period: rankingPeriod,
			},
			{
				enabled: activeTab === "rankings",
			},
		);

	// Query para obtener tabla completa de ranking de una actividad
	const { data: rankingTableData, isLoading: isLoadingRankingTable } =
		api.activity.getRankingTable.useQuery(
			{
				activityId: selectedActivityId ?? "",
				period: rankingPeriod,
			},
			{
				enabled:
					activeTab === "rankings" &&
					!!selectedActivityId &&
					selectedActivityId.length > 0,
			},
		);

	// Query para mejoras porcentuales
	const { data: improvementsData, isLoading: isLoadingImprovements } =
		api.activity.getImprovementPercentage.useQuery(
			{
				period: improvementPeriod,
			},
			{
				enabled: activeTab === "improvements",
			},
		);

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
		<div className="mx-auto max-w-7xl space-y-6 py-6">
			{/* Header */}
			<div>
				<h1 className="mb-2 font-bold text-3xl">Panel de Rendimiento</h1>
				<p className="text-muted-foreground text-sm">
					Revisa tus rankings y tu progreso en diferentes actividades
				</p>
			</div>

			{/* Tabs */}
			<Tabs
				className="w-full"
				defaultValue="rankings"
				onValueChange={(value) =>
					setActiveTab(value as "rankings" | "improvements")
				}
			>
				<TabsList className="mb-6">
					<TabsTrigger value="rankings">
						<Trophy className="mr-2 h-4 w-4" />
						Rankings
					</TabsTrigger>
					<TabsTrigger value="improvements">
						<TrendingUp className="mr-2 h-4 w-4" />
						Mejoras
					</TabsTrigger>
				</TabsList>

				{/* Rankings Tab */}
				<TabsContent className="space-y-6" value="rankings">
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
							{/* Selector de período */}
							<div className="mb-6 flex flex-wrap gap-2">
								{(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
									<Button
										key={period}
										onClick={() => setRankingPeriod(period)}
										size="sm"
										variant={rankingPeriod === period ? "default" : "outline"}
									>
										{PERIOD_LABELS[period]}
									</Button>
								))}
							</div>

							{/* Loading */}
							{isLoadingTopRankings && (
								<div className="space-y-4">
									{Array.from({ length: 5 }, (_, i) => `ranking-skeleton-${i}`).map(
										(key) => (
											<Skeleton className="h-24 w-full" key={key} />
										),
									)}
								</div>
							)}

							{/* No data */}
							{!isLoadingTopRankings &&
								(!topRankingsData || topRankingsData.length === 0) && (
									<Alert>
										<AlertTitle>No hay datos de ranking</AlertTitle>
										<AlertDescription>
											No se encontraron rankings para el período seleccionado.
										</AlertDescription>
									</Alert>
								)}

							{/* Top Rankings Cards */}
							{!isLoadingTopRankings &&
								topRankingsData &&
								topRankingsData.length > 0 && (
									<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{topRankingsData.map((ranking, index) => {
											const RankIcon = RANK_ICONS[index] ?? Medal;
											const unitName =
												ranking.unit.shortName ?? ranking.unit.name;

											return (
												<Card
													className={`cursor-pointer border-2 transition-all hover:shadow-lg ${
														index === 0
															? "border-yellow-400 bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20"
															: index === 1
																? "border-gray-300 bg-linear-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20"
																: index === 2
																	? "border-amber-600 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
																	: "border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
													}`}
													key={ranking.activity.id}
													onClick={() => setSelectedActivityId(ranking.activity.id)}
												>
													<CardHeader>
														<div className="flex items-center gap-3">
															<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-blue-500">
																<RankIcon className="h-6 w-6 text-white" />
															</div>
															<div className="flex-1">
																<CardTitle className="text-lg">
																	{ranking.activity.name}
																</CardTitle>
																<Badge variant="secondary">
																	{ranking.category.name}
																</Badge>
															</div>
														</div>
													</CardHeader>
													<CardContent>
														<div className="space-y-2">
															<div>
																<span className="text-muted-foreground text-sm">
																	Mejor marca:{" "}
																</span>
																<span className="font-bold text-primary">
																	{Number(ranking.userBestValue).toLocaleString(
																		"es-ES",
																		{
																			maximumFractionDigits: 2,
																		},
																	)}{" "}
																	{unitName}
																</span>
															</div>
															<div className="text-muted-foreground text-sm">
																Posición:{" "}
																<span className="font-bold text-foreground">
																	#{ranking.position}
																</span>{" "}
																de {ranking.totalUsers}
															</div>
														</div>
													</CardContent>
												</Card>
											);
										})}
									</div>
								)}

							{/* Ranking Table */}
							{selectedActivityId && (
								<Card className="border-2">
									<CardHeader>
										<CardTitle>
											{rankingTableData?.activity.name ?? "Cargando..."}
										</CardTitle>
										<CardDescription>
											Tabla completa de rankings - {PERIOD_LABELS[rankingPeriod]}
										</CardDescription>
									</CardHeader>
									<CardContent>
										{isLoadingRankingTable && (
											<Skeleton className="h-96 w-full" />
										)}

										{!isLoadingRankingTable &&
											rankingTableData &&
											rankingTableData.rankings.length > 0 && (
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead className="w-16">#</TableHead>
															<TableHead>Usuario</TableHead>
															<TableHead className="text-right">
																Mejor Marca
															</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{rankingTableData.rankings.map((ranking, index) => {
															const isCurrentUser =
																ranking.userId === rankingTableData.currentUserId;
															const isTopThree = index < 3;
															const unitName =
																rankingTableData.unit.shortName ??
																rankingTableData.unit.name;
															const RankIcon =
																isTopThree && RANK_ICONS[index]
																	? RANK_ICONS[index]
																	: null;

															return (
																<TableRow
																	className={`${
																		isCurrentUser
																			? "bg-primary/10 font-bold"
																			: isTopThree
																				? "bg-muted/50"
																				: ""
																	}`}
																	key={ranking.userId}
																>
																	<TableCell>
																		<div className="flex items-center gap-2">
																			{RankIcon && (
																				<RankIcon className="h-4 w-4" />
																			)}
																			<span>{ranking.position}</span>
																		</div>
																	</TableCell>
																	<TableCell>
																		<div className="flex items-center gap-2">
																			{ranking.userName}
																			{isCurrentUser && (
																				<Badge variant="default">
																					Tú
																				</Badge>
																			)}
																		</div>
																	</TableCell>
																	<TableCell className="text-right font-mono">
																		{ranking.bestValue.toLocaleString("es-ES", {
																			maximumFractionDigits: 2,
																		})}{" "}
																		{unitName}
																	</TableCell>
																</TableRow>
															);
														})}
													</TableBody>
												</Table>
											)}

										{!isLoadingRankingTable &&
											rankingTableData &&
											rankingTableData.rankings.length === 0 && (
												<Alert>
													<AlertTitle>No hay datos</AlertTitle>
													<AlertDescription>
														No se encontraron rankings para esta actividad en el
														período seleccionado.
													</AlertDescription>
												</Alert>
											)}
									</CardContent>
								</Card>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Improvements Tab */}
				<TabsContent className="space-y-6" value="improvements">
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
							{/* Selector de período */}
							<div className="mb-6 flex flex-wrap gap-2">
								{(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
									<Button
										key={period}
										onClick={() => setImprovementPeriod(period)}
										size="sm"
										variant={
											improvementPeriod === period ? "default" : "outline"
										}
									>
										{PERIOD_LABELS[period]}
									</Button>
								))}
							</div>

							{/* Loading */}
							{isLoadingImprovements && (
								<Skeleton className="h-96 w-full" />
							)}

							{/* No data */}
							{!isLoadingImprovements &&
								(!improvementsData || improvementsData.length === 0) && (
									<Alert>
										<AlertTitle>No hay datos de mejora</AlertTitle>
										<AlertDescription>
											No se encontraron datos de mejora para el período
											seleccionado.
										</AlertDescription>
									</Alert>
								)}

							{/* Chart and Cards */}
							{!isLoadingImprovements &&
								improvementsData &&
								improvementsData.length > 0 && (
									<div className="space-y-6">
										<ChartContainer
											className="h-96 w-full"
											config={chartConfig}
										>
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
															angle: -90,
															position: "insideLeft",
															value: "Mejora (%)",
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
				</TabsContent>
			</Tabs>
		</div>
	);
}
