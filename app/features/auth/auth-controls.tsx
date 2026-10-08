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
			className="mx-auto grid max-w-5xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:h-16 sm:grid-cols-[1fr_auto_1fr] sm:py-0"
		>
			{/* On phones the links get their own row under the logo and controls. */}
			<ul className="col-span-2 row-start-2 flex items-center justify-center gap-1 empty:hidden sm:col-span-1 sm:row-start-1 sm:flex sm:justify-start">
				<Show when="signed-in">
					<li>
						<NavLink to="/me" end className={navLinkClass}>
							Home
						</NavLink>
					</li>
					<li>
						<NavLink to="/categories" className={navLinkClass}>
							Categories
						</NavLink>
					</li>
					<li>
						<NavLink to="/account" className={navLinkClass}>
							Account
						</NavLink>
					</li>
				</Show>
			</ul>
			<Link
				to="/"
				className="row-start-1 text-xl font-black tracking-tight sm:col-start-2"
			>
				spendtip<span className="text-cat-orange">.</span>
			</Link>
			<ul className="row-start-1 flex items-center justify-end gap-2 sm:col-start-3">
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
