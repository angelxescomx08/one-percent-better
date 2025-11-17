"use client";

import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Skeleton } from "~/components/ui/skeleton";
import { Info } from "lucide-react";

export default function Activities() {
  const { data: activities, isLoading } = api.activity.getActivities.useQuery();

  if (isLoading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
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
      </section>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <section className="py-4">
        <Alert className="border-blue-300 bg-blue-50 text-blue-900">
          <Info className="h-4 w-4" />
          <AlertTitle>No tienes actividades</AlertTitle>
          <AlertDescription>
            Crea una actividad para comenzar a registrar tu progreso.
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-xl border p-5 bg-card shadow-sm hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-lg">{activity.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activity.description ?? "Sin descripción"}
          </p>
        </div>
      ))}
    </section>
  );
}
