import { data } from "react-router";
import { requireSpendtipUser } from "~/features/auth/session.server";
import type { Route } from "./+types/account";

export async function loader(args: Route.LoaderArgs) {
	const user = await requireSpendtipUser(args);
	return data(
		{
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatarUrl,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			},
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData;
	return (
		<main>
			<h1>My account</h1>
			{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : null}
			<dl>
				<dt>Spendtip user ID</dt>
				<dd>{user.id}</dd>
				<dt>Name</dt>
				<dd>{user.name ?? "Not provided"}</dd>
				<dt>Email</dt>
				<dd>{user.email ?? "Not provided"}</dd>
				<dt>Created</dt>
				<dd>
					<time dateTime={user.createdAt}>{user.createdAt}</time>
				</dd>
				<dt>Updated</dt>
				<dd>
					<time dateTime={user.updatedAt}>{user.updatedAt}</time>
				</dd>
			</dl>
		</main>
	);
}
