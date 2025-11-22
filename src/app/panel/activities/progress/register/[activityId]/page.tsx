"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

const registerProgressSchema = z.object({
	date: z.date({
		required_error: "La fecha es requerida",
		invalid_type_error: "Debes seleccionar una fecha válida",
	}),
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

	const utils = api.useUtils();

	const { data: activityData, isLoading } =
		api.activity.getActivityById.useQuery(
			{ activityId },
			{ enabled: !!activityId },
		);

	const createActivityLog = api.activity.createActivityLog.useMutation({
		onSuccess: async () => {
			await utils.activity.getActivityLogs.invalidate();
			router.push("/panel/activities");
		},
	});

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
	} = useForm<RegisterProgressForm>({
		resolver: zodResolver(registerProgressSchema),
		defaultValues: {
			date: new Date(),
			value: "",
			note: "",
		},
	});

	const onSubmit = async (data: RegisterProgressForm) => {
		try {
			await createActivityLog.mutateAsync({
				activityId,
				date: data.date,
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
							<Controller
								control={control}
								name="date"
								render={({ field }) => (
									<DatePicker
										date={field.value}
										disabled={isSubmitting}
										onDateChange={(date) => {
											field.onChange(date ?? new Date());
										}}
										placeholder="Selecciona una fecha"
									/>
								)}
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
							<Input
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
							<Textarea
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
