import type { InferSelectModel } from "drizzle-orm";
import { useRouter } from "next/navigation";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { activity } from "~/server/db/schema";

type ActivityCardProps = {
	activity: InferSelectModel<typeof activity>;
};
export function ActivityCard({ activity }: ActivityCardProps) {

	const router = useRouter();

	return (
		<Card
			className="cursor-pointer transition-all hover:shadow-md"
			key={activity.id}
			onClick={() =>
				router.push(`/panel/activities/activity-logs/${activity.id}`)
			}
		>
			<CardHeader>
				<CardTitle>{activity.name}</CardTitle>
				<CardDescription>
					{activity.description ?? "Sin descripción"}
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<p className="font-medium text-blue-600 text-xs">
					🍀 Da click para registrar tu progreso →
				</p>
			</CardFooter>
		</Card>
	);
}
