"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { api } from "~/trpc/react";

const nav = [
	{ name: "Panel", href: "/panel" },
	{ name: "Actividades", href: "/panel/activities" },
	{ name: "Progreso", href: "/panel/progress" },
];

export default function Header() {
	const pathname = usePathname();
	const session = api.auth.getSession.useQuery();
	const { mutate: signOut } = api.auth.signOut.useMutation();
	return (
		<header className="sticky top-0 z-50 w-full border-b bg-white">
			<div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
				{/* LOGO */}
				<Link className="font-bold text-xl" href="/dashboard">
					OnePercent
				</Link>

				{/* NAV DESKTOP */}
				<nav className="hidden items-center gap-6 md:flex">
					{nav.map((item) => (
						<Link
							className={`text-sm transition ${
								pathname === item.href
									? "font-medium text-black"
									: "text-gray-600 hover:text-black"
							}`}
							href={item.href}
							key={item.href}
						>
							{item.name}
						</Link>
					))}
				</nav>

				{/* USER MENU DESKTOP */}
				<div className="hidden md:block">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Avatar className="cursor-pointer">
								<AvatarImage
									alt={session.data?.user?.name || ""}
									src={session.data?.user?.image || ""}
								/>
								<AvatarFallback>
									{session.data?.user?.name?.slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>

						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
							<DropdownMenuSeparator />

							<DropdownMenuItem asChild>
								<Link href="/dashboard/settings">Configuración</Link>
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<DropdownMenuItem
								className="text-red-600"
								onClick={() => signOut()}
							>
								Cerrar sesión
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* MENU MOBILE */}
				<div className="md:hidden">
					<Sheet>
						<SheetTrigger>
							<Menu className="h-6 w-6" />
						</SheetTrigger>

						<SheetContent className="p-4" side="left">
							<SheetHeader>
								<SheetTitle className="mb-4 font-bold text-xl">
									OnePercent
								</SheetTitle>
							</SheetHeader>

							{/* NAV MOBILE */}
							<nav className="mt-4 flex flex-col gap-4">
								{nav.map((item) => (
									<Link
										className={`text-lg ${
											pathname === item.href
												? "font-semibold text-black"
												: "text-gray-700"
										}`}
										href={item.href}
										key={item.href}
									>
										{item.name}
									</Link>
								))}
							</nav>

							<div className="mt-8 border-t pt-4">
								<p className="mb-2 text-gray-500 text-sm">Mi cuenta</p>

								<Button
									className="text-red-500 text-sm"
									onClick={() => signOut()}
								>
									Cerrar sesión
								</Button>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
