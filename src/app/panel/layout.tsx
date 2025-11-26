import Header from "../_components/shared/header";
import EnsureTrialAccess from "./_components/ensure-trial-access";

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
