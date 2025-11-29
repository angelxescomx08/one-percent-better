import Header from "../_components/shared/header";
import EnsureTrialAccess from "./_components/ensure-trial-access";

// Marcar como dinámico porque EnsureTrialAccess usa headers()
export const dynamic = "force-dynamic";

export default function PanelLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<EnsureTrialAccess />
			<Header />
			<main className="container m-auto">{children}</main>
		</>
	);
}
