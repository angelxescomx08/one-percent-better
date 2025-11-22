"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

const registerProgressSchema = z.object({
	date: z.string().min(1, "La fecha es requerida"),
	value: z
		.string()
		.min(1, "El valor es requerido")
		.refine(
			(val) => !Number.isNaN(Number(val)) && Number(val) > 0,
			"El valor debe ser un número mayor a 0",
		),
	note: z.string().optional(),
});

type RegisterProgressForm = z.infer<typeof registerProgressSchema>;

export default function RegisterProgressPage() {
	const router = useRouter();
	const params = useParams();
	const activityId = params.activityId as string;

	const { data: activityData, isLoading } =
		api.activity.getActivityById.useQuery(
			{ activityId },
			{ enabled: !!activityId },
		);

	const createActivityLog = api.activity.createActivityLog.useMutation({
		onSuccess: () => {
			router.push("/panel/activities");
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<RegisterProgressForm>({
		resolver: zodResolver(registerProgressSchema),
		defaultValues: {
			date: new Date().toISOString().split("T")[0],
			value: "",
			note: "",
		},
	});

	const onSubmit = async (data: RegisterProgressForm) => {
		try {
			await createActivityLog.mutateAsync({
				activityId,
				date: new Date(data.date),
				value: data.value,
				note: data.note,
			});
		} catch (error) {
			console.error("Error al registrar progreso:", error);
		}
	};

	if (isLoading) {
		return (
			<section className="mx-auto max-w-2xl py-4">
				<Skeleton className="mb-6 h-8 w-64" />
				<div className="space-y-6">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			</section>
		);
	}

	if (!activityData) {
		return (
			<section className="mx-auto max-w-2xl py-4">
				<div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
					<p className="font-medium">Error</p>
					<p className="text-sm">No se pudo cargar la actividad.</p>
				</div>
			</section>
		);
	}

	const unitName = activityData.unit.name;

	return (
		<section className="mx-auto max-w-2xl py-4">
			<h1 className="mb-6 font-bold text-2xl">
				Registrar progreso: {activityData.activity.name}
			</h1>

			<form onSubmit={handleSubmit(onSubmit)}>
				<FieldGroup>
					{/* Campo Fecha */}
					<Field data-invalid={!!errors.date}>
						<FieldLabel htmlFor="date">
							Fecha <span className="text-destructive">*</span>
						</FieldLabel>
						<FieldContent>
							<input
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
								id="date"
								type="date"
								{...register("date", {
									setValueAs: (value: string | Date) => {
										if (value instanceof Date) {
											return value.toISOString().split("T")[0];
										}
										return value || "";
									},
								})}
								disabled={isSubmitting}
							/>
							<FieldDescription>
								Selecciona la fecha en la que realizaste esta actividad
							</FieldDescription>
							<FieldError errors={errors.date ? [errors.date] : []} />
						</FieldContent>
					</Field>

					{/* Campo Valor */}
					<Field data-invalid={!!errors.value}>
						<FieldLabel htmlFor="value">
							Valor ({unitName}) <span className="text-destructive">*</span>
						</FieldLabel>
						<FieldContent>
							<input
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
								id="value"
								inputMode="decimal"
								placeholder={`Ej: 10, 5.5, 100`}
								type="text"
								{...register("value")}
								disabled={isSubmitting}
							/>
							<FieldDescription>
								Ingresa la cantidad de {unitName} que completaste
							</FieldDescription>
							<FieldError errors={errors.value ? [errors.value] : []} />
						</FieldContent>
					</Field>

					{/* Campo Nota */}
					<Field data-invalid={!!errors.note}>
						<FieldLabel htmlFor="note">Nota</FieldLabel>
						<FieldContent>
							<textarea
								className="flex min-h-[60px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
								id="note"
								placeholder="Agrega una nota adicional sobre tu progreso (opcional)..."
								rows={4}
								{...register("note")}
								disabled={isSubmitting}
							/>
							<FieldDescription>
								Agrega comentarios o notas adicionales sobre tu progreso
							</FieldDescription>
							<FieldError errors={errors.note ? [errors.note] : []} />
						</FieldContent>
					</Field>

					{/* Botones */}
					<div className="flex justify-end gap-3 pt-4">
						<Button
							disabled={isSubmitting}
							onClick={() => router.back()}
							type="button"
							variant="outline"
						>
							Cancelar
						</Button>
						<Button disabled={isSubmitting} type="submit">
							{isSubmitting ? "Registrando..." : "Registrar progreso"}
						</Button>
					</div>
				</FieldGroup>
			</form>
		</section>
	);
}
