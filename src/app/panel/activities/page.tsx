"use client";

import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Skeleton } from "~/components/ui/skeleton";
import { Info, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useRouter } from "next/navigation";

export default function Activities() {
  const { data: activities, isLoading } = api.activity.getActivities.useQuery();
  const router = useRouter();
  return (
    <section className="py-4 space-y-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-4 bg-card shadow-sm space-y-3"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-xl border p-5 bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
              onClick={() =>
                console.log("Registrar progreso de actividad:", activity.id)
              }
            >
              <div>
                <h3 className="font-semibold text-lg">{activity.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.description ?? "Sin descripción"}
                </p>
              </div>

              <p className="text-xs text-blue-600 font-medium mt-4">
                🍀 Da click para registrar tu progreso →
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
