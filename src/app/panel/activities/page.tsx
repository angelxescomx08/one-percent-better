"use client";

import { Plus, Search, Telescope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input"; // Asumiendo que tienes este componente
import { Skeleton } from "~/components/ui/skeleton";
import { ActivityCard } from "~/modules/activities/components/activityCard";
import { api } from "~/trpc/react";

export default function Activities() {
	const { data: activities, isLoading } = api.activity.getActivities.useQuery();
	const router = useRouter();
	const [searchTerm, setSearchTerm] = useState("");

	// Filtrado simple en cliente (opcional, mejora UX)
	const filteredActivities = activities?.filter((act) =>
		act.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="min-h-screen w-full bg-slate-50/50 p-4 transition-colors duration-300 ease-in-out md:p-8 dark:bg-black">
			<div className="mx-auto max-w-7xl space-y-8">
				{/* HEADER & CONTROLES */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<h1 className="font-bold text-3xl text-slate-900 tracking-tight dark:text-slate-50">
							Mis Actividades
						</h1>
						<p className="text-slate-500 text-sm dark:text-slate-400">
							Gestiona y registra tu progreso diario.
						</p>
					</div>

					<div className="flex items-center gap-2">
						{/* Barra de búsqueda decorativa (funcional si pasas props) */}
						<div className="relative hidden md:block">
							<Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400 transition-colors duration-300 ease-in-out" />
							<Input
								className="w-64 border border-slate-200/80 bg-white pl-9 shadow-sm transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800/80 dark:bg-slate-900 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Buscar actividad..."
								value={searchTerm}
							/>
						</div>
						<Button
							className="bg-indigo-600 shadow-indigo-500/20 shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600"
							onClick={() => router.push("/panel/activities/create")}
						>
							<Plus className="mr-2 h-4 w-4" />
							Nueva Actividad
						</Button>
					</div>
				</div>

				{/* LOADING STATE */}
				{isLoading && (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }).map((_) => (
							<div
								className="flex flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
								key={crypto.randomUUID()}
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
					<div className="fade-in zoom-in-95 flex min-h-[400px] animate-in flex-col items-center justify-center rounded-3xl border-2 border-slate-200/80 border-dashed bg-slate-50/50 p-8 text-center shadow-sm transition-all duration-500 ease-in-out dark:border-slate-800/80 dark:bg-slate-900/50">
						<div className="rounded-full bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
							<Telescope className="h-10 w-10 text-slate-400" />
						</div>
						<h3 className="mt-4 font-semibold text-lg text-slate-900 dark:text-slate-50">
							Aún no hay actividades
						</h3>
						<p className="mt-2 max-w-sm text-slate-500 text-sm dark:text-slate-400">
							Comienza creando tu primera actividad para empezar a rastrear tus
							métricas y visualizar tu progreso.
						</p>
						<Button
							className="mt-8 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md focus:ring-2 focus:ring-offset-2 active:scale-95"
							onClick={() => router.push("/panel/activities/create")}
							variant="outline"
						>
							<Plus className="mr-2 h-4 w-4" />
							Crear mi primera actividad
						</Button>
					</div>
				)}

				{/* GRID DE ACTIVIDADES */}
				{!isLoading && filteredActivities && filteredActivities.length > 0 && (
					<div className="fade-in slide-in-from-bottom-4 grid animate-in grid-cols-1 gap-6 duration-700 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredActivities.map((activity) => (
							<ActivityCard activity={activity} key={activity.id} />
						))}
					</div>
				)}

				{/* Empty Search State */}
				{!isLoading &&
					activities &&
					activities.length > 0 &&
					filteredActivities?.length === 0 && (
						<div className="py-12 text-center">
							<p className="text-slate-500">
								No se encontraron actividades con ese nombre.
							</p>
						</div>
					)}
			</div>
		</div>
	);
}
