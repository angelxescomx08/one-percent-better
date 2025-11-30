"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	ArrowLeft,
	Info,
	LayoutGrid,
	Library,
	Plus,
	Ruler,
	Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ModalDrawer from "~/app/_components/shared/modalDrawer";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { DialogFooter } from "~/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";

const createActivitySchema = z.object({
	categoryId: z.string().min(1, "La categoría es requerida"),
	unitId: z.string().min(1, "La unidad es requerida"),
	name: z.string().min(1, "El nombre es requerido"),
	description: z.string().optional(),
});

const createCategorySchema = z.object({
	name: z.string().min(1, "El nombre es requerido"),
});

const createUnitSchema = z.object({
	name: z.string().min(1, "El nombre es requerido"),
	shortName: z.string().optional(),
});

type CreateActivityForm = z.infer<typeof createActivitySchema>;
type CreateCategoryForm = z.infer<typeof createCategorySchema>;
type CreateUnitForm = z.infer<typeof createUnitSchema>;

export default function CreateActivityPage() {
	const router = useRouter();
	const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
	const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);

	const utils = api.useUtils();
	const { data: categories, isLoading: isLoadingCategories } =
		api.activity.getCategories.useQuery();

	const createActivity = api.activity.create.useMutation({
		onSuccess: async () => {
			await utils.activity.getActivities.invalidate();
			router.push("/panel/activities");
		},
	});

	const createCategory = api.activity.createCategory.useMutation({
		onSuccess: async (newCategory) => {
			if (newCategory) {
				await utils.activity.getCategories.invalidate();
				setValue("categoryId", newCategory.id);
				setIsCategoryDialogOpen(false);
				categoryForm.reset();
			}
		},
	});

	const createUnit = api.activity.createUnit.useMutation({
		onSuccess: async (newUnit) => {
			if (newUnit) {
				await utils.activity.getUnitsByCategory.invalidate();
				setValue("unitId", newUnit.id);
				setIsUnitDialogOpen(false);
				unitForm.reset();
			}
		},
	});

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<CreateActivityForm>({
		resolver: zodResolver(createActivitySchema),
		defaultValues: {
			categoryId: "",
			unitId: "",
			name: "",
			description: "",
		},
	});

	const selectedCategoryId = watch("categoryId");

	const { data: units } = api.activity.getUnitsByCategory.useQuery(
		{ categoryId: selectedCategoryId },
		{ enabled: !!selectedCategoryId },
	);

	const categoryForm = useForm<CreateCategoryForm>({
		resolver: zodResolver(createCategorySchema),
		defaultValues: { name: "" },
	});

	const unitForm = useForm<CreateUnitForm>({
		resolver: zodResolver(createUnitSchema),
		defaultValues: { name: "", shortName: "" },
	});

	useEffect(() => {
		if (selectedCategoryId) {
			setValue("unitId", "");
		}
	}, [selectedCategoryId, setValue]);

	const onCategorySubmit = async (data: CreateCategoryForm) => {
		try {
			await createCategory.mutateAsync(data);
		} catch (error) {
			console.error("Error al crear categoría:", error);
		}
	};

	const onUnitSubmit = async (data: CreateUnitForm) => {
		if (!selectedCategoryId) return;
		try {
			await createUnit.mutateAsync({
				...data,
				categoryId: selectedCategoryId,
			});
		} catch (error) {
			console.error("Error al crear unidad:", error);
		}
	};

	const onSubmit = async (data: CreateActivityForm) => {
		try {
			await createActivity.mutateAsync(data);
		} catch (error) {
			console.error("Error al crear actividad:", error);
		}
	};

	return (
		<div className="min-h-screen w-full bg-slate-50/50 p-4 transition-colors duration-300 ease-in-out md:p-8 dark:bg-black">
			<section className="mx-auto max-w-3xl space-y-6">
				{/* Botón Volver */}
				<Button
					className="pl-0 text-slate-500 transition-all duration-300 ease-in-out hover:scale-105 hover:bg-transparent hover:text-slate-900 active:scale-95 dark:text-slate-400"
					onClick={() => router.back()}
					variant="ghost"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Cancelar y volver
				</Button>

				<Card className="border border-slate-200/80 shadow-xl transition-all duration-300 ease-in-out hover:shadow-2xl dark:border-slate-800/80">
					<CardHeader className="border-slate-200/80 border-b bg-white pb-6 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
								<Plus className="h-6 w-6" />
							</div>
							<div>
								<CardTitle className="text-xl">Nueva Actividad</CardTitle>
								<CardDescription>
									Define qué quieres lograr y cómo vas a medir tu progreso.
								</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6 md:p-8">
						<form onSubmit={handleSubmit(onSubmit)}>
							<FieldGroup className="space-y-6">
								{/* --- SECCIÓN 1: DETALLES BÁSICOS (Nombre y Descripción primero) --- */}
								<div className="space-y-4">
									{/* Campo Nombre */}
									<Field data-invalid={!!errors.name}>
										<FieldLabel
											className="flex items-center gap-2 font-semibold text-base"
											htmlFor="name"
										>
											<Type className="h-4 w-4 text-slate-400" />
											Nombre de la actividad{" "}
											<span className="text-destructive">*</span>
										</FieldLabel>
										<FieldContent>
											<Input
												className="h-11 text-lg transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
												id="name"
												placeholder="Ej: Leer 'Hábitos Atómicos', Ahorrar para viaje..."
												type="text"
												{...register("name")}
												disabled={isSubmitting}
											/>
											<FieldError errors={errors.name ? [errors.name] : []} />
										</FieldContent>
									</Field>

									{/* Campo Descripción */}
									<Field data-invalid={!!errors.description}>
										<FieldLabel htmlFor="description">
											Descripción (Opcional)
										</FieldLabel>
										<FieldContent>
											<Textarea
												className="resize-none transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
												id="description"
												placeholder="¿Cuál es tu objetivo? Ej: Leer 10 páginas al día..."
												rows={3}
												{...register("description")}
												disabled={isSubmitting}
											/>
											<FieldError
												errors={errors.description ? [errors.description] : []}
											/>
										</FieldContent>
									</Field>
								</div>

								{/* --- SECCIÓN 2: CLASIFICACIÓN Y MEDICIÓN (Agrupado Visualmente) --- */}
								<div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 ease-in-out dark:border-slate-800/80 dark:bg-slate-900/50">
									<h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
										<LayoutGrid className="h-4 w-4 text-indigo-500" />
										Configuración de Medición
									</h3>

									<div className="grid gap-6 md:grid-cols-2">
										{/* Campo Categoría */}
										<Field data-invalid={!!errors.categoryId}>
											<FieldLabel htmlFor="categoryId">
												Categoría <span className="text-destructive">*</span>
											</FieldLabel>
											<FieldContent>
												<div className="flex gap-2">
													<Select
														disabled={isLoadingCategories || isSubmitting}
														onValueChange={(value) => {
															setValue("categoryId", value);
															setValue("unitId", "");
														}}
														value={watch("categoryId")}
													>
														<SelectTrigger
															className="w-full bg-white dark:bg-slate-950"
															id="categoryId"
														>
															<SelectValue placeholder="Seleccionar..." />
														</SelectTrigger>
														<SelectContent>
															{categories?.map((category) => (
																<SelectItem
																	key={category.id}
																	value={category.id}
																>
																	{category.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Button
														className="shrink-0 bg-white transition-all duration-300 ease-in-out hover:scale-110 hover:bg-slate-100 hover:shadow-md active:scale-95 dark:bg-slate-950 dark:hover:bg-slate-800"
														disabled={isSubmitting}
														onClick={() => setIsCategoryDialogOpen(true)}
														size="icon"
														title="Crear nueva categoría"
														type="button"
														variant="outline"
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
												<FieldDescription>
													Agrupa tu actividad (Salud, Estudio, etc.)
												</FieldDescription>
												<FieldError
													errors={errors.categoryId ? [errors.categoryId] : []}
												/>
											</FieldContent>
										</Field>

										{/* Campo Unidad con TOOLTIP */}
										<Field data-invalid={!!errors.unitId}>
											<FieldLabel
												className="flex items-center gap-2"
												htmlFor="unitId"
											>
												Unidad de Medida{" "}
												<span className="text-destructive">*</span>
												<TooltipProvider delayDuration={0}>
													<Tooltip>
														<TooltipTrigger asChild>
															<Info className="h-4 w-4 cursor-help text-indigo-500 transition-colors hover:text-indigo-600" />
														</TooltipTrigger>
														<TooltipContent
															className="max-w-xs border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-100"
															side="top"
														>
															<p className="mb-1 font-semibold">
																¿Cómo medirás el progreso?
															</p>
															<ul className="list-disc space-y-1 pl-4 text-xs">
																<li>
																	📚 <strong>Lectura:</strong> Páginas,
																	Capítulos
																</li>
																<li>
																	⏱️ <strong>Tiempo:</strong> Minutos, Pomodoros
																</li>
																<li>
																	💰 <strong>Finanzas:</strong> Pesos ahorrados,
																	Gastos
																</li>
																<li>
																	🥤 <strong>Salud:</strong> Litros de agua,
																	Calorías
																</li>
															</ul>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</FieldLabel>
											<FieldContent>
												<div className="flex gap-2">
													<Select
														disabled={!selectedCategoryId || isSubmitting}
														onValueChange={(value) => setValue("unitId", value)}
														value={watch("unitId")}
													>
														<SelectTrigger
															className="w-full bg-white dark:bg-slate-950"
															id="unitId"
														>
															<SelectValue
																placeholder={
																	!selectedCategoryId
																		? "Elige categoría primero"
																		: "Seleccionar unidad..."
																}
															/>
														</SelectTrigger>
														<SelectContent>
															{units?.map((unit) => (
																<SelectItem key={unit.id} value={unit.id}>
																	{unit.name}
																	{unit.shortName && ` (${unit.shortName})`}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Button
														className="shrink-0 bg-white transition-all duration-300 ease-in-out hover:scale-110 hover:bg-slate-100 hover:shadow-md active:scale-95 dark:bg-slate-950 dark:hover:bg-slate-800"
														disabled={!selectedCategoryId || isSubmitting}
														onClick={() => setIsUnitDialogOpen(true)}
														size="icon"
														title="Crear nueva unidad"
														type="button"
														variant="outline"
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
												<FieldDescription>
													Define la métrica (ej: km, pags, min).
												</FieldDescription>
												<FieldError
													errors={errors.unitId ? [errors.unitId] : []}
												/>
											</FieldContent>
										</Field>
									</div>
								</div>

								{/* Botones */}
								<div className="flex justify-end gap-3 pt-6">
									<Button
										disabled={isSubmitting}
										onClick={() => router.back()}
										type="button"
										variant="ghost"
									>
										Cancelar
									</Button>
									<Button
										className="bg-indigo-600 transition-all duration-300 ease-in-out hover:scale-105 hover:bg-indigo-700 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600"
										disabled={isSubmitting}
										type="submit"
									>
										{isSubmitting ? "Guardando..." : "Crear actividad"}
									</Button>
								</div>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>

				{/* --- DIÁLOGOS (Mantienen estructura, mejora visual mínima) --- */}

				{/* Diálogo Categoría */}
				<ModalDrawer
					description="Organiza tus actividades por grupos."
					isOpen={isCategoryDialogOpen}
					setIsOpen={setIsCategoryDialogOpen}
					title="Nueva categoría"
				>
					<form
						className="space-y-4"
						onSubmit={categoryForm.handleSubmit(onCategorySubmit)}
					>
						<div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
							<Library className="h-5 w-5 text-slate-600 dark:text-slate-300" />
						</div>
						<Field data-invalid={!!categoryForm.formState.errors.name}>
							<FieldLabel htmlFor="category-name">Nombre</FieldLabel>
							<FieldContent>
								<Input
									id="category-name"
									placeholder="Ej: Lectura, Ejercicio..."
									type="text"
									{...categoryForm.register("name")}
									disabled={createCategory.isPending}
								/>
								<FieldError
									errors={
										categoryForm.formState.errors.name
											? [categoryForm.formState.errors.name]
											: []
									}
								/>
							</FieldContent>
						</Field>
						<DialogFooter>
							<Button
								disabled={createCategory.isPending}
								onClick={() => setIsCategoryDialogOpen(false)}
								type="button"
								variant="outline"
							>
								Cancelar
							</Button>
							<Button disabled={createCategory.isPending} type="submit">
								Guardar
							</Button>
						</DialogFooter>
					</form>
				</ModalDrawer>

				{/* Diálogo Unidad */}
				<ModalDrawer
					description="Personaliza cómo mides esta actividad."
					isOpen={isUnitDialogOpen}
					setIsOpen={setIsUnitDialogOpen}
					title="Nueva unidad"
				>
					<form
						className="space-y-4"
						onSubmit={unitForm.handleSubmit(onUnitSubmit)}
					>
						<div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
							<Ruler className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
						</div>
						<Field data-invalid={!!unitForm.formState.errors.name}>
							<FieldLabel htmlFor="unit-name">Nombre (Plural)</FieldLabel>
							<FieldContent>
								<Input
									id="unit-name"
									placeholder="Ej: Páginas, Litros, Pesos"
									type="text"
									{...unitForm.register("name")}
									disabled={createUnit.isPending}
								/>
								<FieldError
									errors={
										unitForm.formState.errors.name
											? [unitForm.formState.errors.name]
											: []
									}
								/>
							</FieldContent>
						</Field>
						<Field data-invalid={!!unitForm.formState.errors.shortName}>
							<FieldLabel htmlFor="unit-short-name">Abreviatura</FieldLabel>
							<FieldContent>
								<Input
									id="unit-short-name"
									placeholder="Ej: pag, lts, mxn"
									type="text"
									{...unitForm.register("shortName")}
									disabled={createUnit.isPending}
								/>
								<FieldDescription>
									Lo que verás en las gráficas (Opcional)
								</FieldDescription>
							</FieldContent>
						</Field>
						<DialogFooter>
							<Button
								disabled={createUnit.isPending}
								onClick={() => setIsUnitDialogOpen(false)}
								type="button"
								variant="outline"
							>
								Cancelar
							</Button>
							<Button
								disabled={createUnit.isPending || !selectedCategoryId}
								type="submit"
							>
								Guardar
							</Button>
						</DialogFooter>
					</form>
				</ModalDrawer>
			</section>
		</div>
	);
}
