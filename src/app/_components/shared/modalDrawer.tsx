"use client";

import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useState,
} from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogOverlay,
	DialogTitle,
} from "~/components/ui/dialog";

import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerOverlay,
	DrawerTitle,
} from "~/components/ui/drawer";

interface ModalDrawerProps {
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	title: string;
	description: string;
	children: ReactNode;
}

/**
 * Modal en desktop
 * Drawer en mobile
 * El componente arma internamente la estructura obligatoria de shadcn
 */
export default function ModalDrawer({
	isOpen,
	setIsOpen,
	title,
	description,
	children,
}: ModalDrawerProps) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 768);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);

	// --- MOBILE (DRAWER) ---
	if (isMobile) {
		return (
			<Drawer onOpenChange={setIsOpen} open={isOpen}>
				<DrawerOverlay className="bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" />
				<DrawerContent className="border-slate-200/80 border-t bg-white/95 shadow-2xl backdrop-blur-lg transition-all duration-300 ease-in-out dark:border-slate-800/80 dark:bg-slate-950/95">
					<div className="mx-auto w-full max-w-md">
						<DrawerHeader>
							{title && <DrawerTitle>{title}</DrawerTitle>}
							{description && (
								<DrawerDescription>{description}</DrawerDescription>
							)}
						</DrawerHeader>

						<div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
							{children}
						</div>
					</div>
				</DrawerContent>
			</Drawer>
		);
	}

	// --- DESKTOP (MODAL / DIALOG) ---
	return (
		<Dialog onOpenChange={setIsOpen} open={isOpen}>
			<DialogOverlay className="bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" />
			<DialogContent className="flex max-h-[calc(100vh-4rem)] max-w-md flex-col gap-4 border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-lg transition-all duration-300 ease-in-out dark:border-slate-800/80 dark:bg-slate-950/95">
				<DialogHeader>
					{title && <DialogTitle>{title}</DialogTitle>}
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
			</DialogContent>
		</Dialog>
	);
}
