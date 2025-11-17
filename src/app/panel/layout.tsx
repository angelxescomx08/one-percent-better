import Header from "../_components/shared/header";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="container m-auto">{children}</main>
    </>
  );
}
