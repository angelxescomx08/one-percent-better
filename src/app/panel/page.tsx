"use client";

import {
  BarChart3,
  Crown,
  Medal,
  TrendingDown,
  TrendingUp,
  Trophy,
  Calendar,
  ArrowUpRight,
  Activity,
} from "lucide-react";
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
    gradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/10",
    shadow: "shadow-amber-900/10",
  },
  {
    icon: Medal,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
    gradient: "from-slate-50 to-gray-50 dark:from-slate-800/30 dark:to-gray-900/10",
    shadow: "shadow-slate-900/10",
  },
  {
    icon: Medal,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    gradient: "from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/10",
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
  const [activeTab, setActiveTab] = useState<"rankings" | "improvements">("rankings");
  const [rankingPeriod, setRankingPeriod] = useState<Period>("week");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [improvementPeriod, setImprovementPeriod] = useState<Period>("week");

  // --- Queries TRPC ---
  const { data: topRankingsData, isLoading: isLoadingTopRankings } =
    api.activity.getTopRankings.useQuery(
      { period: rankingPeriod },
      { enabled: activeTab === "rankings" }
    );

  const { data: rankingTableData, isLoading: isLoadingRankingTable } =
    api.activity.getRankingTable.useQuery(
      { activityId: selectedActivityId ?? "", period: rankingPeriod },
      { enabled: activeTab === "rankings" && !!selectedActivityId }
    );

  const { data: improvementsData, isLoading: isLoadingImprovements } =
    api.activity.getImprovementPercentage.useQuery(
      { period: improvementPeriod },
      { enabled: activeTab === "improvements" }
    );

  const { data: progressHistoryData, isLoading: isLoadingProgressHistory } =
    api.activity.getProgressHistory.useQuery(
      { period: improvementPeriod },
      { enabled: activeTab === "improvements" }
    );

  const { data: generalRankingData, isLoading: isLoadingGeneralRanking } =
    api.activity.getGeneralRanking.useQuery(
      { period: rankingPeriod },
      { enabled: activeTab === "rankings" }
    );

  // --- Preparación de datos ---
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
    actual: { label: "Actual", color: "#10b981" },
    anterior: { label: "Anterior", color: "#94a3b8" },
  };

  // --- Renderizado ---
  return (
    <div className="min-h-screen w-full bg-slate-50/50 p-4 dark:bg-black md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Panel de Rendimiento
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monitorea tu progreso y clasificación en tiempo real.
            </p>
          </div>
          
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((period) => {
              const currentPeriod = activeTab === "rankings" ? rankingPeriod : improvementPeriod;
              const setPeriod = activeTab === "rankings" ? setRankingPeriod : setImprovementPeriod;
              const isActive = currentPeriod === period;
              return (
                <button
                  key={period}
                  onClick={() => setPeriod(period)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  {PERIOD_LABELS[period]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs Principales */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "rankings" | "improvements")}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-slate-200/50 p-1 dark:bg-slate-900/50">
            <TabsTrigger value="rankings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Trophy className="mr-2 h-4 w-4" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="improvements" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              Progreso
            </TabsTrigger>
          </TabsList>

          {/* === RANKINGS TAB === */}
          <TabsContent value="rankings" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Grid Layout: Izquierda (Cartas) - Derecha (Tabla General) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              
              {/* Columna Izquierda: Top Rankings Cards (2/3 ancho) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                    <Crown className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tus Mejores Rankings</h2>
                </div>

                {isLoadingTopRankings ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                  </div>
                ) : !topRankingsData?.length ? (
                   <Alert>
                    <AlertTitle>Sin actividad</AlertTitle>
                    <AlertDescription>No tienes rankings registrados en este periodo.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {topRankingsData.map((ranking, index) => {
                      const style = RANK_STYLES[index] || DEFAULT_RANK_STYLE;
                      const RankIcon = style.icon;
                      
                      return (
                        <Card
                          key={ranking.activity.id}
                          onClick={() => setSelectedActivityId(ranking.activity.id)}
                          className={`group relative cursor-pointer overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${style.border} bg-linear-to-br ${style.gradient}`}
                        >
                          {/* Marca de agua decorativa */}
                          <RankIcon className="absolute -right-6 -top-6 h-32 w-32 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 group-hover:opacity-[0.07]" />
                          
                          <CardHeader className="relative pb-2">
                            <div className="flex justify-between items-start">
                              <Badge variant="outline" className="bg-white/40 backdrop-blur-sm border-white/20 dark:bg-black/20">
                                {ranking.category.name}
                              </Badge>
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full shadow-inner ${style.bg} ${style.color}`}>
                                <RankIcon className="h-6 w-6" />
                              </div>
                            </div>
                            <CardTitle className="mt-2 text-lg line-clamp-1">{ranking.activity.name}</CardTitle>
                          </CardHeader>
                          
                          <CardContent className="relative">
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Mejor Marca
                                </p>
                                <div className="mt-1 flex items-baseline gap-1">
                                  <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                                    {Number(ranking.userBestValue).toLocaleString("es-ES")}
                                  </span>
                                  <span className="text-sm font-medium text-slate-500">
                                    {ranking.unit.shortName ?? ranking.unit.name}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Ranking
                                </p>
                                <div className="mt-1 flex items-center justify-end gap-1">
                                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                                    #{ranking.position}
                                  </span>
                                  <span className="text-sm text-slate-400 font-medium">/ {ranking.totalUsers}</span>
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
                  <Card className="overflow-hidden border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-left-4">
                    <CardHeader className="bg-slate-50/50 border-b dark:bg-slate-900/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Top Usuarios: {rankingTableData?.activity.name}</CardTitle>
                          <CardDescription>Tabla de líderes específica para esta actividad</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedActivityId(null)}>Cerrar</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[300px] overflow-auto">
                        <Table>
                          <TableHeader className="bg-slate-50 sticky top-0 z-10 dark:bg-slate-950">
                            <TableRow>
                              <TableHead className="w-[60px] text-center">#</TableHead>
                              <TableHead>Atleta</TableHead>
                              <TableHead className="text-right">Marca ({rankingTableData?.unit.shortName})</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rankingTableData?.rankings.map((r) => (
                              <TableRow key={r.userId} className={r.userId === rankingTableData.currentUserId ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}>
                                <TableCell className="text-center font-bold text-slate-500">{r.position}</TableCell>
                                <TableCell className="font-medium">
                                  {r.userName} {r.userId === rankingTableData.currentUserId && <Badge className="ml-2 h-5 text-[10px]">Tú</Badge>}
                                </TableCell>
                                <TableCell className="text-right font-mono">{Number(r.bestValue).toFixed(2)}</TableCell>
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
              <div className="lg:col-span-1">
                <Card className="h-full border-slate-200 shadow-sm dark:border-slate-800 flex flex-col">
                  <CardHeader className="border-b bg-slate-50/40 pb-4 dark:bg-slate-900/40">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-purple-500" />
                      <h3 className="font-semibold text-slate-900 dark:text-white">Clasificación General</h3>
                    </div>
                    <CardDescription className="text-xs">
                      Puntuación acumulada en todas las actividades.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    {isLoadingGeneralRanking ? (
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="relative overflow-hidden h-full">
                        {/* Tabla con scroll interno si es muy larga */}
                        <div className="max-h-[600px] overflow-auto custom-scrollbar">
                          <Table>
                            <TableHeader className="sticky top-0 z-20 bg-white shadow-sm dark:bg-slate-950">
                              <TableRow className="border-b-2 border-slate-100 dark:border-slate-800">
                                <TableHead className="w-12 text-center text-xs font-bold uppercase text-slate-400">Rank</TableHead>
                                <TableHead className="text-xs font-bold uppercase text-slate-400">Usuario</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase text-slate-400">Puntos</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {generalRankingData?.rankings.map((ranking, i) => {
                                const isMe = ranking.userId === generalRankingData.currentUserId;
                                const isTop3 = i < 3;
                                
                                return (
                                  <TableRow 
                                    key={ranking.userId} 
                                    className={`
                                      group border-b border-slate-50 transition-colors dark:border-slate-900
                                      ${isMe ? "bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60" : "hover:bg-slate-50 dark:hover:bg-slate-900"}
                                    `}
                                  >
                                    <TableCell className="text-center p-3">
                                      <div className={`
                                        mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                                        ${isTop3 ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}
                                      `}>
                                        {ranking.position}
                                      </div>
                                    </TableCell>
                                    <TableCell className="p-3">
                                      <div className="flex flex-col">
                                        <span className={`font-medium text-sm ${isMe ? 'text-indigo-700 dark:text-indigo-400' : ''}`}>
                                          {ranking.userName}
                                        </span>
                                        {isMe && <span className="text-[10px] text-indigo-500 font-medium">Tú</span>}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right p-3">
                                      <Badge variant="secondary" className="font-mono font-normal">
                                        {ranking.totalScore.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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
          <TabsContent value="improvements" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* KPI Cards de Resumen */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoadingImprovements ? (
                [1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl"/>)
              ) : (
                improvementsData?.slice(0, 4).map((imp) => {
                  const isPositive = imp.improvementPercentage > 0;
                  const unit = imp.unit.shortName ?? imp.unit.name;
                  return (
                    <Card key={imp.activity.id} className="overflow-hidden border-l-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800" style={{ borderLeftColor: isPositive ? '#10b981' : '#f43f5e' }}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm text-slate-500 truncate" title={imp.activity.name}>{imp.activity.name}</p>
                          {isPositive 
                            ? <div className="rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30"><ArrowUpRight className="h-3 w-3" /></div>
                            : <div className="rounded-full bg-rose-100 p-1 text-rose-600 dark:bg-rose-900/30"><TrendingDown className="h-3 w-3" /></div>
                          }
                        </div>
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-2xl font-bold tracking-tight">
                            {Math.abs(imp.improvementPercentage).toFixed(1)}%
                          </h3>
                          <span className={`text-xs font-bold uppercase ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? 'Mejora' : 'Baja'}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {imp.currentAvg} {unit} (vs {imp.previousAvg})
                        </p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              
              {/* Gráfico 1: Evolución */}
              <Card className="flex flex-col border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Evolución del Rendimiento
                  </CardTitle>
                  <CardDescription>Tu promedio a lo largo del tiempo</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-[350px] p-2 sm:p-6">
                  <div className="h-[300px] w-full min-w-0"> {/* min-w-0 evita overflow en grid */}
                    {isLoadingProgressHistory ? <Skeleton className="h-full w-full" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={progressHistoryData?.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#94a3b8' }} 
                            dy={10}
                            minTickGap={30}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#94a3b8' }} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`${value.toFixed(2)} pts`, "Promedio"]}
                            labelStyle={{ color: '#64748b', marginBottom: '0.25rem' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#10b981" 
                            strokeWidth={2.5} 
                            fill="url(#colorVal)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico 2: Comparativa Barras */}
              <Card className="flex flex-col border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Comparativa: {PERIOD_LABELS[improvementPeriod]}
                  </CardTitle>
                  <CardDescription>Actual vs Anterior por actividad</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-[350px] p-2 sm:p-6">
                  <div className="h-[300px] w-full min-w-0"> {/* min-w-0 esencial para responsive */}
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={chartData} 
                          layout="vertical" 
                          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                          barCategoryGap="20%"
                        >
                          <CartesianGrid horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{ fontSize: 11, fill: '#64748b' }} 
                            axisLine={false}
                            tickLine={false}
                            // Truco para truncar texto largo en YAxis si es necesario
                            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                          />
                          <XAxis type="number" hide />
                          <Tooltip
                            cursor={{ fill: 'transparent' }}
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
                                  <div className="rounded-lg border bg-white p-3 shadow-lg ring-1 ring-black/5 dark:bg-slate-900 dark:border-slate-800">
                                    <p className="mb-2 font-semibold text-sm border-b pb-1 dark:border-slate-800">{data.name}</p>
                                    <div className="space-y-1.5 text-xs">
                                      <div className="flex justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                          <span className="text-slate-500">Actual:</span>
                                        </div>
                                        <span className="font-mono font-medium">
                                          {payload[0]?.value} {data.unidad}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                          <div className="h-2 w-2 rounded-full bg-slate-400" />
                                          <span className="text-slate-500">Anterior:</span>
                                        </div>
                                        <span className="font-mono font-medium">
                                          {payload[1]?.value} {data.unidad}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Bar dataKey="actual" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                          <Bar dataKey="anterior" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}