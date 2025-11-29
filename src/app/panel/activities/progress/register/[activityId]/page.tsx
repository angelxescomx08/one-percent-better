"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	Activity,
	ArrowLeft,
	CalendarIcon,
	Hash,
	NotebookPen,
	Save,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
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
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

// --- Schema y Tipos ---
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
			router.push(`/panel/activities/activity-logs/${activityId}`);
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

	// --- Loading State ---
	if (isLoading) {
		return (
			<div className="min-h-screen w-full bg-slate-50/50 p-4 md:p-8 dark:bg-black">
				<section className="mx-auto max-w-xl space-y-6">
					<Skeleton className="h-10 w-32" />
					<Card>
						<CardHeader className="space-y-4">
							<div className="flex items-center gap-4">
								<Skeleton className="h-12 w-12 rounded-lg" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-48" />
									<Skeleton className="h-4 w-24" />
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-10 w-full" />
						</CardContent>
					</Card>
				</section>
			</div>
		);
	}

	// --- Error State ---
	if (!activityData) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center p-4">
				<div className="w-full max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive shadow-sm">
					<Activity className="mx-auto mb-4 h-10 w-10 opacity-20" />
					<p className="font-semibold text-lg">No se encontró la actividad</p>
					<p className="mb-4 text-sm opacity-80">
						Verifica que la actividad exista y tengas permisos.
					</p>
					<Button
						className="border-destructive/30 hover:bg-destructive/10"
						onClick={() => router.back()}
						variant="outline"
					>
						Volver atrás
					</Button>
				</div>
			</div>
		);
	}

	const unitName = activityData.unit.name;
	const shortUnit = activityData.unit.shortName;

	return (
		<div className="min-h-screen w-full bg-slate-50/50 p-4 md:p-8 dark:bg-black">
			<section className="mx-auto max-w-xl space-y-6">
				{/* Navegación */}
				<Button
					className="pl-0 text-slate-500 hover:bg-transparent hover:text-slate-900 dark:text-slate-400"
					onClick={() => router.back()}
					variant="ghost"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Cancelar y volver
				</Button>

				<Card className="fade-in slide-in-from-bottom-4 animate-in border-slate-200 shadow-xl duration-500 dark:border-slate-800">
					<CardHeader className="rounded-t-xl bg-white pb-6 dark:bg-slate-950">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="flex items-start gap-4">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
									<Activity className="h-6 w-6" />
								</div>
								<div>
									<CardTitle className="font-bold text-slate-900 text-xl leading-tight dark:text-slate-100">
										{activityData.activity.name}
									</CardTitle>
									<CardDescription className="mt-1 text-sm">
										Registra tu progreso para mantener tu racha.
									</CardDescription>
								</div>
							</div>
							<Badge
								className="w-fit shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
								variant="secondary"
							>
								Unidad: {unitName}
							</Badge>
						</div>
					</CardHeader>

					<Separator />

					<CardContent className="p-6 md:p-8">
						<form onSubmit={handleSubmit(onSubmit)}>
							<FieldGroup className="space-y-6">
								{/* 1. FECHA Y VALOR (Grid) */}
								<div className="grid gap-6 md:grid-cols-2">
									{/* Campo Fecha */}
									<Field data-invalid={!!errors.date}>
										<FieldLabel
											className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
											htmlFor="date"
										>
											<CalendarIcon className="h-4 w-4 text-slate-400" />
											Fecha del registro <span className="text-red-500">*</span>
										</FieldLabel>
										<FieldContent>
											<Controller
												control={control}
												name="date"
												render={({ field }) => (
													<DatePicker
														className="w-full"
														date={field.value}
														disabled={isSubmitting}
														onDateChange={(date) => {
															field.onChange(date ?? new Date());
														}}
														placeholder="Selecciona una fecha"
													/>
												)}
											/>
											<FieldError errors={errors.date ? [errors.date] : []} />
										</FieldContent>
									</Field>

									{/* Campo Valor */}
									<Field data-invalid={!!errors.value}>
										<FieldLabel
											className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
											htmlFor="value"
										>
											<Hash className="h-4 w-4 text-slate-400" />
											Cantidad ({shortUnit ?? unitName}){" "}
											<span className="text-red-500">*</span>
										</FieldLabel>
										<FieldContent>
											<div className="relative">
												<Input
													id="value"
													inputMode="decimal"
													placeholder="0.00"
													type="text"
													{...register("value")}
													className="pr-12 font-medium font-mono text-lg tracking-tight"
													disabled={isSubmitting}
												/>
												<div className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-bold text-slate-400 text-xs uppercase">
													{shortUnit ?? unitName.slice(0, 3)}
												</div>
											</div>
											<FieldError errors={errors.value ? [errors.value] : []} />
										</FieldContent>
									</Field>
								</div>

								{/* 2. NOTA ADICIONAL */}
								<Field data-invalid={!!errors.note}>
									<FieldLabel
										className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
										htmlFor="note"
									>
										<NotebookPen className="h-4 w-4 text-slate-400" />
										Nota / Comentario
									</FieldLabel>
									<FieldContent>
										<Textarea
											className="resize-none bg-slate-50 dark:bg-slate-900/50"
											id="note"
											placeholder="¿Cómo te sentiste? ¿Algún detalle importante a recordar?"
											rows={4}
											{...register("note")}
											disabled={isSubmitting}
										/>
										<FieldDescription>
											Opcional. Agrega contexto a este registro.
										</FieldDescription>
										<FieldError errors={errors.note ? [errors.note] : []} />
									</FieldContent>
								</Field>

								{/* 3. BOTONES DE ACCIÓN */}
								<div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
									<Button
										className="w-full sm:w-auto"
										disabled={isSubmitting}
										onClick={() => router.back()}
										type="button"
										variant="ghost"
									>
										Cancelar
									</Button>
									<Button
										className="w-full bg-indigo-600 shadow-sm hover:bg-indigo-700 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-600"
										disabled={isSubmitting}
										type="submit"
									>
										{isSubmitting ? (
											<span className="flex items-center gap-2">
												Guardando...
											</span>
										) : (
											<span className="flex items-center gap-2">
												<Save className="h-4 w-4" />
												Guardar Progreso
											</span>
										)}
									</Button>
								</div>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
