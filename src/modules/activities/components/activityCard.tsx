import type { InferSelectModel } from "drizzle-orm";
import { ArrowRight, BarChart3, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "~/components/ui/card";
import type { activity } from "~/server/db/schema";

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
			className="group hover:-translate-y-1 relative flex cursor-pointer flex-col justify-between overflow-hidden border-slate-200 bg-white transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
			onClick={() =>
				router.push(`/panel/activities/activity-logs/${activity.id}`)
			}
		>
			{/* Barra de color superior */}
			<div
				className={`absolute top-0 left-0 h-1 w-full bg-linear-to-r ${gradientClass}`}
			/>

			<CardHeader className="flex flex-row items-start justify-between space-y-0 pt-6 pb-2">
				<div className="flex items-center gap-3">
					{/* Avatar de la actividad */}
					<div
						className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${gradientClass} text-white shadow-md`}
					>
						<span className="font-bold tracking-wider">
							{getInitials(activity.name)}
						</span>
					</div>
					<div className="space-y-1">
						<h3 className="font-bold text-slate-900 leading-none tracking-tight transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
							{activity.name}
						</h3>
						<p className="text-slate-500 text-xs dark:text-slate-400">
							{/* Si tuvieras created_at, podrías ponerlo aquí, si no, pon category si existe */}
							Actividad registrada
						</p>
					</div>
				</div>

				{/* Menú de opciones (Placeholder para el futuro: editar/borrar) */}
				<Button
					className="h-8 w-8 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
					size="icon"
					variant="ghost"
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</CardHeader>

			<CardContent className="pb-4">
				<p className="line-clamp-2 min-h-10 text-slate-600 text-sm dark:text-slate-300">
					{activity.description ||
						"Sin descripción detallada para esta actividad."}
				</p>
			</CardContent>

			<CardFooter className="border-slate-100 border-t bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
				<div className="flex w-full items-center justify-between">
					<Badge
						className="bg-white hover:bg-white dark:bg-slate-800"
						variant="secondary"
					>
						<BarChart3 className="mr-1 h-3 w-3 text-slate-400" />
						Ver Progreso
					</Badge>

					<div className="-translate-x-2 flex items-center font-medium text-indigo-600 text-xs opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 dark:text-indigo-400">
						Registrar
						<ArrowRight className="ml-1 h-3 w-3" />
					</div>
				</div>
			</CardFooter>
		</Card>
	);
}
