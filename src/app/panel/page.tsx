"use client";

import {
	Activity,
	ArrowUpRight,
	BarChart3,
	Crown,
	Medal,
	NotebookPen,
	Plus,
	TrendingDown,
	TrendingUp,
	Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

// Componente personalizado para rotar los ticks del eje Y
const CustomYAxisTick = (props: {
	x?: number;
	y?: number;
	payload?: { value: string };
	[key: string]: unknown;
}) => {
	const { x = 0, y = 0, payload } = props;
	if (!payload?.value) return null;

	return (
		<g transform={`translate(${x},${y})`}>
			<text
				dy={4}
				fill="#64748b"
				fontSize={11}
				textAnchor="end"
				transform="rotate(-90)"
				x={0}
				y={0}
			>
				{payload.value.length > 25
					? `${payload.value.substring(0, 25)}...`
					: payload.value}
			</text>
		</g>
	);
};

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
import { ChartContainer } from "~/components/ui/chart";
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

// --- Constantes y Tipos ---

type Period = "yesterday" | "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
	yesterday: "Ayer",
	week: "Semana",
	month: "Mes",
	year: "Año",
	all: "Histórico",
};

// Estilos para los rankings (Oro, Plata, Bronce)
const RANK_STYLES = [
	{
		icon: Crown,
		color: "text-amber-400",
		bg: "bg-amber-400/10",
		border: "border-amber-400/30",
		gradient:
			"from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/10",
		shadow: "shadow-amber-900/10",
	},
	{
		icon: Medal,
		color: "text-slate-400",
		bg: "bg-slate-400/10",
		border: "border-slate-400/30",
		gradient:
			"from-slate-50 to-gray-50 dark:from-slate-800/30 dark:to-gray-900/10",
		shadow: "shadow-slate-900/10",
	},
	{
		icon: Medal,
		color: "text-orange-500",
		bg: "bg-orange-500/10",
		border: "border-orange-500/30",
		gradient:
			"from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/10",
		shadow: "shadow-orange-900/10",
	},
];

// Estilo por defecto para puestos > 3
const DEFAULT_RANK_STYLE = {
	icon: Trophy,
	color: "text-blue-500",
	bg: "bg-blue-500/10",
	border: "border-slate-200 dark:border-slate-800",
	gradient: "from-white to-slate-50 dark:from-slate-950 dark:to-slate-900",
	shadow: "shadow-sm",
};

export default function PanelPage() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"rankings" | "improvements">(
		"rankings",
	);
	const [rankingPeriod, setRankingPeriod] = useState<Period>("week");
	const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
		null,
	);
	const [improvementPeriod, setImprovementPeriod] = useState<Period>("week");

	// --- Queries TRPC ---
	const { data: activities } = api.activity.getActivities.useQuery();
	const { data: topRankingsData, isLoading: isLoadingTopRankings } =
		api.activity.getTopRankings.useQuery(
			{ period: rankingPeriod },
			{ enabled: activeTab === "rankings" },
		);

	const { data: rankingTableData } = api.activity.getRankingTable.useQuery(
		{ activityId: selectedActivityId ?? "", period: rankingPeriod },
		{ enabled: activeTab === "rankings" && !!selectedActivityId },
	);

	const { data: improvementsData, isLoading: isLoadingImprovements } =
		api.activity.getImprovementPercentage.useQuery(
			{ period: improvementPeriod },
			{ enabled: activeTab === "improvements" },
		);

	const { data: progressHistoryData, isLoading: isLoadingProgressHistory } =
		api.activity.getProgressHistory.useQuery(
			{ period: improvementPeriod },
			{ enabled: activeTab === "improvements" },
		);

	const { data: generalRankingData, isLoading: isLoadingGeneralRanking } =
		api.activity.getGeneralRanking.useQuery(
			{ period: rankingPeriod },
			{ enabled: activeTab === "rankings" },
		);

	// --- Preparación de datos ---
	// Filtrar ranking general: mostrar top 10 + usuario actual (si no está en top 10)
	const displayRankings = generalRankingData
		? (() => {
				const top10 = generalRankingData.rankings.slice(0, 10);
				const currentUserRanking = generalRankingData.rankings.find(
					(r) => r.userId === generalRankingData.currentUserId,
				);
				const isUserInTop10 =
					currentUserRanking &&
					top10.some((r) => r.userId === currentUserRanking.userId);

				if (isUserInTop10 || !currentUserRanking) {
					return top10;
				}

				return [...top10, currentUserRanking];
			})()
		: [];

	const hasNoActivities = !activities || activities.length === 0;
	const chartData =
		improvementsData?.map((imp) => ({
			name: imp.activity.name,
			actual: Number(imp.currentAvg.toFixed(2)),
			anterior: Number(imp.previousAvg.toFixed(2)),
			categoria: imp.category.name,
			// Usamos short_name si existe, sino name
			unidad: imp.unit.shortName ?? imp.unit.name,
		})) ?? [];

	const chartConfig = {
		actual: { label: "Hoy", color: "#10b981" },
		anterior: { label: "Promedio", color: "#94a3b8" },
	};

	// --- Renderizado ---
	return (
		<div className="min-h-screen w-full bg-slate-50/50 p-4 transition-colors duration-300 ease-in-out md:p-8 dark:bg-black">
			<div className="mx-auto max-w-7xl space-y-6">
				{/* Header & Controls */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="fade-in slide-in-from-left-4 animate-in duration-500">
						<h1 className="font-bold text-3xl text-slate-900 tracking-tight dark:text-slate-50">
							Panel de Rendimiento
						</h1>
						<p className="text-slate-500 text-sm dark:text-slate-400">
							Monitorea tu progreso y clasificación en tiempo real.
						</p>
					</div>

					<div className="fade-in slide-in-from-right-4 flex animate-in items-center gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-sm transition-all delay-100 duration-500 dark:border-slate-800/80 dark:bg-slate-900/90">
						{(Object.keys(PERIOD_LABELS) as Period[]).map((period) => {
							const currentPeriod =
								activeTab === "rankings" ? rankingPeriod : improvementPeriod;
							const setPeriod =
								activeTab === "rankings"
									? setRankingPeriod
									: setImprovementPeriod;
							const isActive = currentPeriod === period;
							return (
								<Button
									className={`rounded-md px-3 py-1.5 font-medium text-xs transition-all duration-300 ease-in-out ${
										isActive
											? "bg-slate-900 text-white shadow-sm hover:shadow-md active:scale-95"
											: "bg-transparent text-slate-600 hover:scale-105 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
									}`}
									key={period}
									onClick={() => setPeriod(period)}
									variant={isActive ? "default" : "ghost"}
								>
									{PERIOD_LABELS[period]}
								</Button>
							);
						})}
					</div>
				</div>

				{/* Tabs Principales */}
				<Tabs
					className="space-y-6"
					onValueChange={(v) => setActiveTab(v as "rankings" | "improvements")}
					value={activeTab}
				>
					<TabsList className="fade-in slide-in-from-bottom-2 grid w-full max-w-[400px] animate-in grid-cols-2 border border-slate-200/80 bg-slate-100/90 p-1 shadow-sm backdrop-blur-sm transition-all delay-150 duration-500 dark:border-slate-800/80 dark:bg-slate-900/90">
						<TabsTrigger
							className="transition-all duration-300 ease-in-out data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-600 data-[state=active]:shadow-sm data-[state=active]:active:scale-95 data-[state=inactive]:hover:bg-slate-200/50 data-[state=active]:hover:shadow-md dark:data-[state=active]:bg-slate-800 dark:data-[state=inactive]:hover:bg-slate-800/50"
							value="rankings"
						>
							<Trophy className="mr-2 h-4 w-4" />
							Rankings
						</TabsTrigger>
						<TabsTrigger
							className="transition-all duration-300 ease-in-out data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-600 data-[state=active]:shadow-sm data-[state=active]:active:scale-95 data-[state=inactive]:hover:bg-slate-200/50 data-[state=active]:hover:shadow-md dark:data-[state=active]:bg-slate-800 dark:data-[state=inactive]:hover:bg-slate-800/50"
							value="improvements"
						>
							<TrendingUp className="mr-2 h-4 w-4" />
							Progreso
						</TabsTrigger>
					</TabsList>

					{/* === RANKINGS TAB === */}
					<TabsContent
						className="fade-in slide-in-from-bottom-2 animate-in space-y-6"
						value="rankings"
					>
						{/* Grid Layout: Izquierda (Cartas) - Derecha (Tabla General) */}
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							{/* Columna Izquierda: Top Rankings Cards (2/3 ancho) */}
							<div className="space-y-6 lg:col-span-1">
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
										<Crown className="h-5 w-5" />
									</div>
									<h2 className="font-bold text-slate-900 text-xl dark:text-white">
										Tus Mejores Rankings
									</h2>
								</div>

								{isLoadingTopRankings ? (
									<div className="grid gap-4 sm:grid-cols-2">
										{[1, 2, 3, 4].map((i) => (
											<Skeleton className="h-44 rounded-2xl" key={i} />
										))}
									</div>
								) : !topRankingsData?.length ? (
									<Alert>
										<AlertTitle>Sin actividad</AlertTitle>
										<AlertDescription className="space-y-3">
											{hasNoActivities ? (
												<>
													<p>
														No tienes actividades registradas. Crea tu primera
														actividad para comenzar a rastrear tu progreso.
													</p>
													<Button
														className="mt-2 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
														onClick={() =>
															router.push("/panel/activities/create")
														}
														size="sm"
													>
														<Plus className="mr-2 h-4 w-4" />
														Agregar Actividad
													</Button>
												</>
											) : (
												<>
													<p>
														No tienes rankings registrados en este periodo.
														Registra tu progreso en alguna actividad para
														aparecer en los rankings.
													</p>
													{activities && activities.length > 0 && (
														<Button
															className="mt-2"
															onClick={() =>
																router.push(
																	`/panel/activities/progress/register/${activities[0]?.id}`,
																)
															}
															size="sm"
														>
															<NotebookPen className="mr-2 h-4 w-4" />
															Registrar Progreso
														</Button>
													)}
												</>
											)}
										</AlertDescription>
									</Alert>
								) : (
									<div className="grid gap-4 sm:grid-cols-1">
										{topRankingsData.map((ranking, index) => {
											const style = RANK_STYLES[index] || DEFAULT_RANK_STYLE;
											const RankIcon = style.icon;

											return (
												<Card
													className={`group fade-in slide-in-from-left-4 relative animate-in cursor-pointer overflow-hidden border-2 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] ${style.border} bg-linear-to-br ${style.gradient}`}
													key={ranking.activity.id}
													onClick={() =>
														setSelectedActivityId(ranking.activity.id)
													}
													style={{
														animationDelay: `${index * 100}ms`,
														animationDuration: "500ms",
														animationFillMode: "both",
													}}
												>
													{/* Marca de agua decorativa */}
													<RankIcon className="-right-6 -top-6 absolute h-32 w-32 rotate-12 opacity-[0.03] transition-transform group-hover:scale-110 group-hover:opacity-[0.07]" />

													<CardHeader className="relative pb-2">
														<div className="flex items-start justify-between">
															<Badge
																className="border-white/20 bg-white/40 backdrop-blur-sm dark:bg-black/20"
																variant="outline"
															>
																{ranking.category.name}
															</Badge>
															<div
																className={`flex h-10 w-10 items-center justify-center rounded-full shadow-inner ${style.bg} ${style.color}`}
															>
																<RankIcon className="h-6 w-6" />
															</div>
														</div>
														<CardTitle className="mt-2 line-clamp-1 text-lg">
															{ranking.activity.name}
														</CardTitle>
													</CardHeader>

													<CardContent className="relative">
														<div className="flex items-end justify-between">
															<div>
																<p className="font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">
																	Mejor Marca
																</p>
																<div className="mt-1 flex items-baseline gap-1">
																	<span className="font-bold text-2xl text-slate-900 tabular-nums tracking-tight dark:text-white">
																		{Number(
																			ranking.userBestValue,
																		).toLocaleString("es-ES")}
																	</span>
																	<span className="font-medium text-slate-500 text-sm">
																		{ranking.unit.shortName ??
																			ranking.unit.name}
																	</span>
																</div>
															</div>
															<div className="text-right">
																<p className="font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">
																	Ranking
																</p>
																<div className="mt-1 flex items-center justify-end gap-1">
																	<span className="font-black text-3xl text-slate-900 dark:text-white">
																		#{ranking.position}
																	</span>
																	<span className="font-medium text-slate-400 text-sm">
																		/ {ranking.totalUsers}
																	</span>
																</div>
															</div>
														</div>
													</CardContent>
												</Card>
											);
										})}
									</div>
								)}

								{/* Detalle de Ranking (Si hay selección) */}
								{selectedActivityId && (
									<Card className="fade-in slide-in-from-left-4 animate-in overflow-hidden border-slate-200 dark:border-slate-800">
										<CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
											<div className="flex items-center justify-between">
												<div>
													<CardTitle>
														Top Usuarios: {rankingTableData?.activity.name}
													</CardTitle>
													<CardDescription>
														Tabla de líderes específica para esta actividad
													</CardDescription>
												</div>
												<Button
													onClick={() => setSelectedActivityId(null)}
													size="sm"
													variant="ghost"
												>
													Cerrar
												</Button>
											</div>
										</CardHeader>
										<CardContent className="p-0">
											<div className="max-h-[300px] overflow-auto">
												<Table>
													<TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
														<TableRow>
															<TableHead className="w-[60px] text-center">
																#
															</TableHead>
															<TableHead>Atleta</TableHead>
															<TableHead className="text-right">
																Marca ({rankingTableData?.unit.shortName})
															</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{rankingTableData?.rankings.map((r) => (
															<TableRow
																className={
																	r.userId === rankingTableData.currentUserId
																		? "bg-blue-50/50 dark:bg-blue-900/10"
																		: ""
																}
																key={r.userId}
															>
																<TableCell className="text-center font-bold text-slate-500">
																	{r.position}
																</TableCell>
																<TableCell className="font-medium">
																	{r.userName}{" "}
																	{r.userId ===
																		rankingTableData.currentUserId && (
																		<Badge className="ml-2 h-5 text-[10px]">
																			Tú
																		</Badge>
																	)}
																</TableCell>
																<TableCell className="text-right font-mono">
																	{Number(r.bestValue).toFixed(2)}
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										</CardContent>
									</Card>
								)}
							</div>

							{/* Columna Derecha: Ranking General (1/3 ancho) */}
							<div className="lg:col-span-2">
								<Card className="flex h-full flex-col border border-slate-200/80 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl dark:border-slate-800/80">
									<CardHeader className="border-slate-200/80 border-b bg-slate-50/40 pb-4 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/40">
										<div className="mb-1 flex items-center gap-2">
											<Trophy className="h-4 w-4 text-purple-500" />
											<h3 className="font-semibold text-slate-900 dark:text-white">
												Clasificación General
											</h3>
										</div>
										<CardDescription className="text-xs">
											Puntuación acumulada en todas las actividades.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex-1 p-0">
										{isLoadingGeneralRanking ? (
											<div className="space-y-2 p-4">
												<Skeleton className="h-10 w-full" />
												<Skeleton className="h-10 w-full" />
												<Skeleton className="h-10 w-full" />
											</div>
										) : (
											<div className="relative h-full overflow-hidden">
												{/* Tabla con scroll interno si es muy larga */}
												<div className="custom-scrollbar max-h-[600px] overflow-auto">
													<Table>
														<TableHeader className="sticky top-0 z-20 border-slate-200/80 border-b-2 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
															<TableRow className="border-slate-100 border-b-2 dark:border-slate-800">
																<TableHead className="w-12 text-center font-bold text-slate-400 text-xs uppercase">
																	Rank
																</TableHead>
																<TableHead className="font-bold text-slate-400 text-xs uppercase">
																	Usuario
																</TableHead>
																<TableHead className="text-right font-bold text-slate-400 text-xs uppercase">
																	Puntos
																</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{displayRankings.length === 0 ? (
																<TableRow>
																	<TableCell
																		className="p-8 text-center"
																		colSpan={3}
																	>
																		{hasNoActivities ? (
																			<div className="space-y-3">
																				<p className="text-slate-500 text-sm dark:text-slate-400">
																					No hay rankings disponibles. Crea tu
																					primera actividad para comenzar.
																				</p>
																				<Button
																					onClick={() =>
																						router.push(
																							"/panel/activities/create",
																						)
																					}
																					size="sm"
																				>
																					<Plus className="mr-2 h-4 w-4" />
																					Agregar Actividad
																				</Button>
																			</div>
																		) : (
																			<p className="text-slate-500 text-sm dark:text-slate-400">
																				No hay rankings disponibles en este
																				periodo.
																			</p>
																		)}
																	</TableCell>
																</TableRow>
															) : (
																displayRankings.map((ranking) => {
																	const isMe =
																		generalRankingData &&
																		ranking.userId ===
																			generalRankingData.currentUserId;
																	const isTop3 = ranking.position <= 3;
																	const top3Styles = [
																		{
																			bg: "bg-amber-500",
																			text: "text-amber-50",
																			border: "border-amber-500/30",
																			rowBg:
																				"bg-amber-50/50 dark:bg-amber-950/20",
																		},
																		{
																			bg: "bg-slate-400",
																			text: "text-slate-50",
																			border: "border-slate-400/30",
																			rowBg:
																				"bg-slate-50/50 dark:bg-slate-900/20",
																		},
																		{
																			bg: "bg-orange-500",
																			text: "text-orange-50",
																			border: "border-orange-500/30",
																			rowBg:
																				"bg-orange-50/50 dark:bg-orange-950/20",
																		},
																	];
																	const top3Style = isTop3
																		? top3Styles[ranking.position - 1]
																		: null;

																	return (
																		<TableRow
																			className={`group border-slate-50 border-b transition-all duration-300 ease-in-out hover:shadow-sm dark:border-slate-900 ${
																				isTop3 && top3Style
																					? `${top3Style.rowBg} hover:opacity-90`
																					: isMe
																						? "bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/40"
																						: "hover:bg-slate-50 dark:hover:bg-slate-900"
																			}`}
																			key={ranking.userId}
																		>
																			<TableCell className="p-3 text-center">
																				<div
																					className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${
																						isTop3 && top3Style
																							? `${top3Style.bg} ${top3Style.text} shadow-md`
																							: isMe
																								? "bg-indigo-500 text-white shadow-sm"
																								: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
																					}`}
																				>
																					{ranking.position}
																				</div>
																			</TableCell>
																			<TableCell className="p-3">
																				<div className="flex items-center gap-2">
																					{isTop3 && (
																						<>
																							{ranking.position === 1 && (
																								<Crown className="h-4 w-4 text-amber-500" />
																							)}
																							{ranking.position === 2 && (
																								<Medal className="h-4 w-4 text-slate-400" />
																							)}
																							{ranking.position === 3 && (
																								<Medal className="h-4 w-4 text-orange-500" />
																							)}
																						</>
																					)}
																					<div className="flex flex-col">
																						<span
																							className={`font-semibold text-sm ${
																								isTop3
																									? "text-slate-900 dark:text-slate-100"
																									: isMe
																										? "text-indigo-700 dark:text-indigo-400"
																										: "text-slate-700 dark:text-slate-300"
																							}`}
																						>
																							{ranking.userName}
																						</span>
																						{isMe && (
																							<span className="font-medium text-[10px] text-indigo-500">
																								Tú
																							</span>
																						)}
																					</div>
																				</div>
																			</TableCell>
																			<TableCell className="p-3 text-right">
																				<Badge
																					className={`font-mono font-normal ${
																						isTop3
																							? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
																							: isMe
																								? "bg-indigo-500 text-white"
																								: ""
																					}`}
																					variant={
																						isTop3 || isMe
																							? "default"
																							: "secondary"
																					}
																				>
																					{ranking.totalScore.toLocaleString(
																						"es-ES",
																						{
																							maximumFractionDigits: 0,
																						},
																					)}
																				</Badge>
																			</TableCell>
																		</TableRow>
																	);
																})
															)}
														</TableBody>
													</Table>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</div>
					</TabsContent>

					{/* === IMPROVEMENTS TAB === */}
					<TabsContent
						className="fade-in slide-in-from-bottom-2 animate-in space-y-6"
						value="improvements"
					>
						{hasNoActivities ? (
							<Alert>
								<AlertTitle>No hay datos para mostrar</AlertTitle>
								<AlertDescription className="space-y-3">
									<p>
										No tienes actividades registradas. Crea tu primera actividad
										para comenzar a rastrear tu progreso y ver tus mejoras.
									</p>
									<Button
										onClick={() => router.push("/panel/activities/create")}
										size="sm"
									>
										<Plus className="mr-2 h-4 w-4" />
										Agregar Actividad
									</Button>
								</AlertDescription>
							</Alert>
						) : (
							<>
								{/* KPI Cards de Resumen */}
								<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
									{isLoadingImprovements
										? [1, 2, 3, 4].map((i) => (
												<Skeleton className="h-32 w-full rounded-xl" key={i} />
											))
										: improvementsData && improvementsData.length > 0
											? improvementsData.slice(0, 4).map((imp, index) => {
													const isPositive = imp.improvementPercentage > 0;
													const unit = imp.unit.shortName ?? imp.unit.name;
													return (
														<Card
															className="fade-in slide-in-from-bottom-4 animate-in overflow-hidden border border-slate-200/80 border-l-4 shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] dark:border-slate-800/80"
															key={imp.activity.id}
															style={{
																borderLeftColor: isPositive
																	? "#10b981"
																	: "#f43f5e",
																animationDelay: `${index * 100}ms`,
																animationDuration: "500ms",
																animationFillMode: "both",
															}}
														>
															<CardContent className="p-5">
																<div className="mb-2 flex items-start justify-between">
																	<p
																		className="truncate font-medium text-slate-500 text-sm"
																		title={imp.activity.name}
																	>
																		{imp.activity.name}
																	</p>
																	{isPositive ? (
																		<div className="rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30">
																			<ArrowUpRight className="h-3 w-3" />
																		</div>
																	) : (
																		<div className="rounded-full bg-rose-100 p-1 text-rose-600 dark:bg-rose-900/30">
																			<TrendingDown className="h-3 w-3" />
																		</div>
																	)}
																</div>
																<div className="flex items-baseline gap-2">
																	<h3 className="font-bold text-2xl tracking-tight">
																		{Math.abs(
																			imp.improvementPercentage,
																		).toFixed(1)}
																		%
																	</h3>
																	<span
																		className={`font-bold text-xs uppercase ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
																	>
																		{isPositive ? "Mejora" : "Baja"}
																	</span>
																</div>
																<p className="mt-2 text-slate-400 text-xs">
																	Hoy: {imp.currentAvg.toFixed(2)} {unit}{" "}
																	{imp.previousAvg > 0
																		? `(promedio: ${imp.previousAvg.toFixed(2)})`
																		: "(primer registro)"}
																</p>
															</CardContent>
														</Card>
													);
												})
											: null}
								</div>

								{/* Mostrar alerta si hay actividades pero no hay datos de mejoras */}
								{!isLoadingImprovements &&
									(!improvementsData || improvementsData.length === 0) && (
										<Alert>
											<AlertTitle>No hay datos para mostrar</AlertTitle>
											<AlertDescription className="space-y-3">
												<p>
													No tienes datos de progreso registrados en este
													periodo. Registra algunas actividades para ver tus
													mejoras.
												</p>
												{activities && activities.length > 0 && (
													<Button
														className="mt-2"
														onClick={() =>
															router.push(
																`/panel/activities/progress/register/${activities[0]?.id}`,
															)
														}
														size="sm"
													>
														<NotebookPen className="mr-2 h-4 w-4" />
														Registrar Progreso
													</Button>
												)}
											</AlertDescription>
										</Alert>
									)}

								{/* Gráficos */}
								{improvementsData && improvementsData.length > 0 && (
									<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
										{/* Gráfico 1: Evolución */}
										<Card className="fade-in slide-in-from-left-4 flex animate-in flex-col border border-slate-200/80 shadow-lg transition-all delay-300 duration-500 hover:shadow-xl dark:border-slate-800/80">
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<Activity className="h-4 w-4 text-emerald-500" />
													Evolución del Rendimiento
												</CardTitle>
												<CardDescription>
													Tu promedio a lo largo del tiempo
												</CardDescription>
											</CardHeader>
											<CardContent className="min-h-[350px] flex-1 p-2 sm:p-6">
												<div className="h-[300px] w-full min-w-0">
													{" "}
													{/* min-w-0 evita overflow en grid */}
													{isLoadingProgressHistory ? (
														<Skeleton className="h-full w-full" />
													) : (
														<ResponsiveContainer height="100%" width="100%">
															<AreaChart
																data={progressHistoryData?.data}
																margin={{
																	top: 10,
																	right: 10,
																	left: -20,
																	bottom: 0,
																}}
															>
																<defs>
																	<linearGradient
																		id="colorVal"
																		x1="0"
																		x2="0"
																		y1="0"
																		y2="1"
																	>
																		<stop
																			offset="5%"
																			stopColor="#10b981"
																			stopOpacity={0.2}
																		/>
																		<stop
																			offset="95%"
																			stopColor="#10b981"
																			stopOpacity={0}
																		/>
																	</linearGradient>
																</defs>
																<CartesianGrid
																	opacity={0.6}
																	stroke="#e2e8f0"
																	strokeDasharray="3 3"
																	vertical={false}
																/>
																<XAxis
																	axisLine={false}
																	dataKey="date"
																	dy={10}
																	minTickGap={30}
																	tick={{ fontSize: 11, fill: "#94a3b8" }}
																	tickLine={false}
																/>
																<YAxis
																	axisLine={false}
																	tick={{ fontSize: 11, fill: "#94a3b8" }}
																	tickLine={false}
																/>
																<Tooltip
																	contentStyle={{
																		borderRadius: "8px",
																		border: "none",
																		boxShadow:
																			"0 4px 6px -1px rgb(0 0 0 / 0.1)",
																	}}
																	formatter={(value: number) => [
																		`${value.toFixed(2)} pts`,
																		"Promedio",
																	]}
																	labelStyle={{
																		color: "#64748b",
																		marginBottom: "0.25rem",
																	}}
																/>
																<Area
																	dataKey="value"
																	fill="url(#colorVal)"
																	stroke="#10b981"
																	strokeWidth={2.5}
																	type="monotone"
																/>
															</AreaChart>
														</ResponsiveContainer>
													)}
												</div>
											</CardContent>
										</Card>

										{/* Gráfico 2: Comparativa Barras */}
										<Card className="fade-in slide-in-from-right-4 flex animate-in flex-col border border-slate-200/80 shadow-lg transition-all delay-400 duration-500 hover:shadow-xl dark:border-slate-800/80">
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<BarChart3 className="h-4 w-4 text-blue-500" />
													Comparativa: {PERIOD_LABELS[improvementPeriod]}
												</CardTitle>
												<CardDescription>
													Hoy vs Promedio por actividad
												</CardDescription>
											</CardHeader>
											<CardContent className="min-h-[350px] flex-1 p-2 sm:p-6">
												<div className="h-[300px] w-full min-w-0">
													{" "}
													{/* min-w-0 esencial para responsive */}
													<ChartContainer
														className="h-full w-full"
														config={chartConfig}
													>
														<ResponsiveContainer height="100%" width="100%">
															<BarChart
																barCategoryGap="20%"
																data={chartData}
																layout="vertical"
																margin={{
																	top: 0,
																	right: 20,
																	left: 0,
																	bottom: 0,
																}}
															>
																<CartesianGrid
																	horizontal={false}
																	opacity={0.6}
																	stroke="#e2e8f0"
																/>
																<YAxis
																	axisLine={false}
																	dataKey="name"
																	tick={<CustomYAxisTick />}
																	tickLine={false}
																	type="category"
																	width={100}
																/>
																<XAxis hide type="number" />
																<Tooltip
																	content={({ active, payload }) => {
																		if (
																			active &&
																			payload &&
																			Array.isArray(payload) &&
																			payload.length > 1 &&
																			payload[0]?.payload &&
																			payload[0]?.payload.name &&
																			payload[0]?.payload.unidad
																		) {
																			const data = payload[0].payload;
																			return (
																				<div className="rounded-lg border bg-white p-3 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900">
																					<p className="mb-2 border-b pb-1 font-semibold text-sm dark:border-slate-800">
																						{data.name}
																					</p>
																					<div className="space-y-1.5 text-xs">
																						<div className="flex justify-between gap-4">
																							<div className="flex items-center gap-2">
																								<div className="h-2 w-2 rounded-full bg-emerald-500" />
																								<span className="text-slate-500">
																									Hoy:
																								</span>
																							</div>
																							<span className="font-medium font-mono">
																								{payload[0]?.value}{" "}
																								{data.unidad}
																							</span>
																						</div>
																						<div className="flex justify-between gap-4">
																							<div className="flex items-center gap-2">
																								<div className="h-2 w-2 rounded-full bg-slate-400" />
																								<span className="text-slate-500">
																									Promedio:
																								</span>
																							</div>
																							<span className="font-medium font-mono">
																								{payload[1]?.value}{" "}
																								{data.unidad}
																							</span>
																						</div>
																					</div>
																				</div>
																			);
																		}
																		return null;
																	}}
																	cursor={{ fill: "transparent" }}
																/>
																<Legend
																	iconType="circle"
																	wrapperStyle={{
																		fontSize: "12px",
																		paddingTop: "10px",
																	}}
																/>
																<Bar
																	barSize={12}
																	dataKey="actual"
																	fill="#10b981"
																	radius={[0, 4, 4, 0]}
																/>
																<Bar
																	barSize={12}
																	dataKey="anterior"
																	fill="#cbd5e1"
																	radius={[0, 4, 4, 0]}
																/>
															</BarChart>
														</ResponsiveContainer>
													</ChartContainer>
												</div>
											</CardContent>
										</Card>
									</div>
								)}
							</>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
