"use client";

import {
	BadgeDollarSign,
	BarChart3,
	LayoutDashboard,
	LogOut,
	Menu,
	Settings,
	User,
	Zap,
} from "lucide-react";
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
import { signOutAction } from "~/modules/auth/actions/auth";
import { api } from "~/trpc/react";

const nav = [
	{ name: "Panel General", href: "/panel", icon: LayoutDashboard },
	{ name: "Mis Actividades", href: "/panel/activities", icon: BarChart3 },
];

export default function Header() {
	const pathname = usePathname();
	const session = api.auth.getSession.useQuery();
	const user = session.data?.user;

	// Función auxiliar para detectar link activo
	const isActive = (path: string) => pathname === path;

	return (
		<header className="sticky top-0 z-50 w-full border-slate-200/80 border-b bg-white/90 shadow-sm backdrop-blur-lg transition-all duration-300 ease-in-out dark:border-slate-800/80 dark:bg-black/90">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				{/* === LOGO & BRANDING === */}
				<Link
					className="group flex items-center gap-2 transition-opacity hover:opacity-90"
					href="/panel"
				>
					{/* Isotipo con gradiente */}
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 shadow-indigo-500/20 shadow-lg transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:shadow-xl group-active:scale-95">
						<Zap className="h-5 w-5 fill-white text-white" />
					</div>
					{/* Texto del logo */}
					<div className="flex flex-col">
						<span className="font-bold text-lg text-slate-900 leading-tight tracking-tight dark:text-white">
							One
							<span className="text-indigo-600 dark:text-indigo-400">
								Percent
							</span>
						</span>
						<span className="font-medium text-[10px] text-slate-500 uppercase tracking-widest">
							Better Every Day
						</span>
					</div>
				</Link>

				{/* === NAV DESKTOP === */}
				<nav className="hidden items-center gap-1 md:flex">
					{nav.map((item) => {
						const active = isActive(item.href);
						const Icon = item.icon;
						return (
							<Link
								className={`group flex items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 ${
									active
										? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800"
										: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
								}
                `}
								href={item.href}
								key={item.href}
							>
								<Icon
									className={`h-4 w-4 transition-colors ${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}
								/>
								{item.name}
							</Link>
						);
					})}
				</nav>

				{/* === USER ACTIONS === */}
				<div className="flex items-center gap-4">
					{/* Dropdown Desktop */}
					<div className="hidden md:block">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className="relative h-10 w-10 rounded-full hover:bg-transparent"
									variant="ghost"
								>
									<Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-2 ring-slate-100 transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-md hover:ring-indigo-200 active:scale-95 dark:border-slate-900 dark:ring-slate-800">
										<AvatarImage
											alt={user?.name || "Usuario"}
											src={user?.image || ""}
										/>
										<AvatarFallback className="bg-indigo-100 font-bold text-indigo-700">
											{user?.name?.slice(0, 2).toUpperCase() || "OP"}
										</AvatarFallback>
									</Avatar>
									{/* Indicador de estado online (decorativo) */}
									<span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-black" />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end" className="w-56" forceMount>
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col space-y-1">
										<p className="font-medium text-sm leading-none">
											{user?.name}
										</p>
										<p className="text-muted-foreground text-xs leading-none">
											{user?.email}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link className="cursor-pointer" href="/panel/settings">
										<Settings className="mr-2 h-4 w-4" />
										Configuración
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link className="cursor-pointer" href="/panel/profile">
										<User className="mr-2 h-4 w-4" />
										Mi Perfil
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link className="cursor-pointer" href="/panel/membership">
										<BadgeDollarSign className="mr-2 h-4 w-4" />
										Mi membresía
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/20"
									onClick={() => signOutAction()}
								>
									<LogOut className="mr-2 h-4 w-4" />
									Cerrar sesión
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* === MOBILE MENU === */}
					<div className="md:hidden">
						<Sheet>
							<SheetTrigger asChild>
								<Button
									className="text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
									size="icon"
									variant="ghost"
								>
									<Menu className="h-6 w-6" />
								</Button>
							</SheetTrigger>

							<SheetContent className="w-[300px] sm:w-[350px]" side="right">
								<SheetHeader className="mb-8 flex flex-row items-center gap-3 space-y-0 text-left">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
										<Zap className="h-6 w-6 fill-white text-white" />
									</div>
									<div>
										<SheetTitle className="font-bold text-lg">
											OnePercent
										</SheetTitle>
										<p className="text-slate-500 text-xs">Mejorando cada día</p>
									</div>
								</SheetHeader>

								<div className="flex h-[calc(100vh-140px)] flex-col justify-between">
									<nav className="flex flex-col gap-2">
										{nav.map((item) => {
											const active = isActive(item.href);
											const Icon = item.icon;
											return (
												<Link
													className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-sm transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-[0.98] ${
														active
															? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
															: "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
													}
                          `}
													href={item.href}
													key={item.href}
												>
													<Icon className="h-5 w-5" />
													{item.name}
												</Link>
											);
										})}
									</nav>

									<div className="space-y-4">
										{/* User Info Mobile */}
										<div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
											<Avatar className="h-10 w-10">
												<AvatarImage src={user?.image || ""} />
												<AvatarFallback>
													{user?.name?.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="overflow-hidden">
												<p className="truncate font-medium text-sm">
													{user?.name}
												</p>
												<p className="truncate text-slate-500 text-xs">
													{user?.email}
												</p>
											</div>
										</div>

										{/* User Menu Options Mobile */}
										<div className="flex flex-col gap-2 border-slate-100 border-t pt-4 dark:border-slate-800">
											<Link
												className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-sm transition-colors ${
													isActive("/panel/settings")
														? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
														: "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
												}`}
												href="/panel/settings"
											>
												<Settings className="h-5 w-5" />
												Configuración
											</Link>
											<Link
												className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-sm transition-colors ${
													isActive("/panel/profile")
														? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
														: "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
												}`}
												href="/panel/profile"
											>
												<User className="h-5 w-5" />
												Mi Perfil
											</Link>
											<Link
												className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-sm transition-colors ${
													isActive("/panel/membership")
														? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
														: "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
												}`}
												href="/panel/membership"
											>
												<BadgeDollarSign className="h-5 w-5" />
												Mi membresía
											</Link>
										</div>

										<Button
											className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
											onClick={() => signOutAction()}
											variant="outline"
										>
											<LogOut className="mr-2 h-4 w-4" />
											Cerrar sesión
										</Button>
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</header>
	);
}
