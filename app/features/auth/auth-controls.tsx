import {
	Show,
	SignInButton,
	SignUpButton,
	UserButton,
} from "@clerk/react-router";
import { Link, NavLink } from "react-router";
import { ThemeToggle } from "~/features/theme/theme-toggle";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
	[
		"rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
		isActive ? "bg-ink text-paper" : "text-muted hover:text-ink",
	].join(" ");

export function AuthControls() {
	return (
		<nav
			aria-label="Account navigation"
			className="mx-auto grid h-16 max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4"
		>
			<ul className="flex items-center gap-1">
				<Show when="signed-in">
					<li>
						<NavLink to="/" end className={navLinkClass}>
							Home
						</NavLink>
					</li>
					<li>
						<NavLink to="/account" className={navLinkClass}>
							Account
						</NavLink>
					</li>
				</Show>
			</ul>
			<Link to="/" className="text-xl font-black tracking-tight">
				spendtip<span className="text-cat-orange">.</span>
			</Link>
			<ul className="flex items-center justify-end gap-2">
				<li>
					<ThemeToggle />
				</li>
				<Show when="signed-out">
					<li className="hidden sm:block">
						<SignInButton>
							<button
								type="button"
								className="px-2 text-sm font-semibold text-muted hover:text-ink"
							>
								Sign in
							</button>
						</SignInButton>
					</li>
					<li>
						<SignUpButton>
							<button
								type="button"
								className="btn-primary px-4 py-1.5 text-sm whitespace-nowrap"
							>
								Sign up
							</button>
						</SignUpButton>
					</li>
				</Show>
				<Show when="signed-in">
					<li className="flex items-center">
						<UserButton />
					</li>
				</Show>
			</ul>
		</nav>
	);
}
