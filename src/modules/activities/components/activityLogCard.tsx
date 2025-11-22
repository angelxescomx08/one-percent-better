import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

type ActivityLogCardProps = {
	log: {
		id: string;
		date: Date;
		value: string;
		note: string | null;
		unit: {
			name: string;
			shortName: string | null;
		};
	};
};

export function ActivityLogCard({ log }: ActivityLogCardProps) {
	const formattedDate = new Date(log.date).toLocaleDateString("es-ES", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const unitName = log.unit.shortName ?? log.unit.name;

	return (
		<Card className="transition-all hover:shadow-md">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-lg">
							{log.value} {unitName}
						</CardTitle>
						<CardDescription className="mt-1">
							{formattedDate}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			{log.note && (
				<CardContent>
					<p className="text-muted-foreground text-sm">{log.note}</p>
				</CardContent>
			)}
		</Card>
	);
}

