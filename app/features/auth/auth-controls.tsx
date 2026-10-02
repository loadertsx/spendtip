import {
	Show,
	SignInButton,
	SignUpButton,
	UserButton,
} from "@clerk/react-router";
import { Link } from "react-router";

export function AuthControls() {
	return (
		<nav aria-label="Account navigation">
			<ul>
				<li>
					<Link to="/">Spendtip</Link>
				</li>
				<Show when="signed-out">
					<li>
						<SignInButton>
							<button type="button">Sign in</button>
						</SignInButton>
					</li>
					<li>
						<SignUpButton>
							<button type="button">Sign up</button>
						</SignUpButton>
					</li>
				</Show>
				<Show when="signed-in">
					<li>
						<Link to="/account">My account</Link>
					</li>
					<li>
						<UserButton />
					</li>
				</Show>
			</ul>
		</nav>
	);
}
