import { Landing } from "../landing";
import type { Route } from "./+types/landing";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Spendtip" },
		{ name: "description", content: "Know exactly where your money goes." },
	];
}

export default function Component() {
	return <Landing />;
}
