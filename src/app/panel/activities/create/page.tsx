"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
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
		onSuccess: () => {
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

	// Formularios para crear categoría y unidad
	const categoryForm = useForm<CreateCategoryForm>({
		resolver: zodResolver(createCategorySchema),
		defaultValues: {
			name: "",
		},
	});

	const unitForm = useForm<CreateUnitForm>({
		resolver: zodResolver(createUnitSchema),
		defaultValues: {
			name: "",
			shortName: "",
		},
	});

	// Resetear la unidad cuando cambia la categoría
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
		<section className="mx-auto max-w-2xl py-4">
			<h1 className="mb-6 font-bold text-2xl">Crear nueva actividad</h1>

			<form onSubmit={handleSubmit(onSubmit)}>
				<FieldGroup>
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
										setValue("unitId", ""); // Resetear unidad
									}}
									value={watch("categoryId")}
								>
									<SelectTrigger className="w-full" id="categoryId">
										<SelectValue placeholder="Selecciona una categoría" />
									</SelectTrigger>
									<SelectContent>
										{categories?.map((category) => (
											<SelectItem key={category.id} value={category.id}>
												{category.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
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
								Selecciona la categoría a la que pertenece esta actividad
							</FieldDescription>
							<FieldError
								errors={errors.categoryId ? [errors.categoryId] : []}
							/>
						</FieldContent>
					</Field>

					{/* Campo Unidad */}
					<Field data-invalid={!!errors.unitId}>
						<FieldLabel htmlFor="unitId">
							Unidad <span className="text-destructive">*</span>
						</FieldLabel>
						<FieldContent>
							<div className="flex gap-2">
								<Select
									disabled={!selectedCategoryId || isSubmitting}
									onValueChange={(value) => setValue("unitId", value)}
									value={watch("unitId")}
								>
									<SelectTrigger className="w-full" id="unitId">
										<SelectValue
											placeholder={
												!selectedCategoryId
													? "Primero selecciona una categoría"
													: "Selecciona una unidad"
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
								Selecciona la unidad de medida para esta actividad
							</FieldDescription>
							<FieldError errors={errors.unitId ? [errors.unitId] : []} />
						</FieldContent>
					</Field>

					{/* Campo Nombre */}
					<Field data-invalid={!!errors.name}>
						<FieldLabel htmlFor="name">
							Nombre <span className="text-destructive">*</span>
						</FieldLabel>
						<FieldContent>
							<input
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
								id="name"
								placeholder="Ej: Leer libro X, Correr, Estudiar Python"
								type="text"
								{...register("name")}
								disabled={isSubmitting}
							/>
							<FieldDescription>
								Ingresa un nombre descriptivo para tu actividad
							</FieldDescription>
							<FieldError errors={errors.name ? [errors.name] : []} />
						</FieldContent>
					</Field>

					{/* Campo Descripción */}
					<Field data-invalid={!!errors.description}>
						<FieldLabel htmlFor="description">Descripción</FieldLabel>
						<FieldContent>
							<textarea
								className="flex min-h-[60px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
								id="description"
								placeholder="Descripción opcional de la actividad..."
								rows={4}
								{...register("description")}
								disabled={isSubmitting}
							/>
							<FieldDescription>
								Agrega una descripción adicional (opcional)
							</FieldDescription>
							<FieldError
								errors={errors.description ? [errors.description] : []}
							/>
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
							{isSubmitting ? "Creando..." : "Crear actividad"}
						</Button>
					</div>
				</FieldGroup>
			</form>

			{/* Diálogo para crear categoría */}
			<Dialog
				onOpenChange={setIsCategoryDialogOpen}
				open={isCategoryDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Crear nueva categoría</DialogTitle>
						<DialogDescription>
							Agrega una nueva categoría para organizar tus actividades
						</DialogDescription>
					</DialogHeader>
					<form
						className="space-y-4"
						onSubmit={categoryForm.handleSubmit(onCategorySubmit)}
					>
						<Field data-invalid={!!categoryForm.formState.errors.name}>
							<FieldLabel htmlFor="category-name">
								Nombre <span className="text-destructive">*</span>
							</FieldLabel>
							<FieldContent>
								<input
									className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
									id="category-name"
									placeholder="Ej: Lectura, Ejercicio, Estudio"
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
								{createCategory.isPending ? "Creando..." : "Crear categoría"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Diálogo para crear unidad */}
			<Dialog onOpenChange={setIsUnitDialogOpen} open={isUnitDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Crear nueva unidad</DialogTitle>
						<DialogDescription>
							Agrega una nueva unidad de medida para la categoría seleccionada
						</DialogDescription>
					</DialogHeader>
					<form
						className="space-y-4"
						onSubmit={unitForm.handleSubmit(onUnitSubmit)}
					>
						<Field data-invalid={!!unitForm.formState.errors.name}>
							<FieldLabel htmlFor="unit-name">
								Nombre <span className="text-destructive">*</span>
							</FieldLabel>
							<FieldContent>
								<input
									className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
									id="unit-name"
									placeholder="Ej: páginas, horas, repeticiones"
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
							<FieldLabel htmlFor="unit-short-name">Nombre corto</FieldLabel>
							<FieldContent>
								<input
									className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
									id="unit-short-name"
									placeholder="Ej: pag, hrs, rep"
									type="text"
									{...unitForm.register("shortName")}
									disabled={createUnit.isPending}
								/>
								<FieldDescription>
									Nombre abreviado de la unidad (opcional)
								</FieldDescription>
								<FieldError
									errors={
										unitForm.formState.errors.shortName
											? [unitForm.formState.errors.shortName]
											: []
									}
								/>
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
								{createUnit.isPending ? "Creando..." : "Crear unidad"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</section>
	);
}
