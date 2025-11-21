"use client";

import { Info, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function Activities() {
	const { data: activities, isLoading } = api.activity.getActivities.useQuery();
	const router = useRouter();
	return (
		<section className="space-y-6 py-4">
			{/* BOTÓN SUPERIOR PARA CREAR ACTIVIDAD */}
			<div className="flex justify-end">
				<Button
					className="flex items-center gap-2"
					onClick={() => router.push("/panel/activities/create")}
				>
					<Plus className="h-4 w-4" />
					Agregar actividad
				</Button>
			</div>

			{/* LOADING */}
			{isLoading && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }, (_, i) => `activity-skeleton-${i}`).map(
						(key) => (
							<div
								className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"
								key={key}
							>
								<Skeleton className="h-5 w-2/3" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-1/2" />
							</div>
						),
					)}
				</div>
			)}

			{/* NO ACTIVIDADES */}
			{!isLoading && (!activities || activities.length === 0) && (
				<Alert className="border-blue-300 bg-blue-50 text-blue-900">
					<Info className="h-4 w-4" />
					<AlertTitle>No tienes actividades</AlertTitle>
					<AlertDescription>
						Crea una actividad para comenzar a registrar tu progreso.
					</AlertDescription>
				</Alert>
			)}

			{/* ACTIVIDADES */}
			{!isLoading && activities && activities.length > 0 && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{activities.map((activity) => (
						<Card
							className="cursor-pointer transition-all hover:shadow-md"
							key={activity.id}
							onClick={() =>
								console.log("Registrar progreso de actividad:", activity.id)
							}
						>
							<CardHeader>
								<CardTitle>{activity.name}</CardTitle>
								<CardDescription>
									{activity.description ?? "Sin descripción"}
								</CardDescription>
							</CardHeader>
							<CardFooter>
								<p className="font-medium text-blue-600 text-xs">
									🍀 Da click para registrar tu progreso →
								</p>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</section>
	);
}
