import type { ReactNode } from "react";

export function AuthPage({
	title,
	subtitle,
	children,
}: {
	title: ReactNode;
	subtitle: string;
	children: ReactNode;
}) {
	return (
		<main className="mx-auto flex max-w-lg flex-col items-center px-4 pt-10 pb-20 text-center">
			<h1 className="text-4xl font-black tracking-tight text-balance sm:text-5xl">
				{title}
			</h1>
			<p className="mt-4 text-lg text-muted">{subtitle}</p>
			<div className="mt-10">{children}</div>
		</main>
	);
}
