"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { api } from "~/trpc/react";

const nav = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Actividades", href: "/dashboard/activities" },
  { name: "Progreso", href: "/dashboard/progress" },
];

export default function Header() {
  const pathname = usePathname();
  const session = api.auth.getSession.useQuery();

  console.log({ session: session.data });

  return (
    <header className="w-full border-b bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* LOGO */}
        <Link href="/dashboard" className="text-xl font-bold">
          OnePercent
        </Link>

        {/* NAV DESKTOP */}
        <nav className="hidden md:flex items-center gap-6">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition ${
                pathname === item.href
                  ? "text-black font-medium"
                  : "text-gray-600 hover:text-black"
              }`}
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
                  src={session.data?.user?.image || ""}
                  alt={session.data?.user?.name || ""}
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
                onClick={() => fetch("/api/auth/logout")}
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
              <Menu className="w-6 h-6" />
            </SheetTrigger>

            <SheetContent side="left" className="p-4">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold mb-4">
                  OnePercent
                </SheetTitle>
              </SheetHeader>

              {/* NAV MOBILE */}
              <nav className="flex flex-col gap-4 mt-4">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-lg ${
                      pathname === item.href
                        ? "text-black font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="mt-8 border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Mi cuenta</p>

                <button
                  onClick={() => fetch("/api/auth/logout")}
                  className="text-red-500 text-sm"
                >
                  Cerrar sesión
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
