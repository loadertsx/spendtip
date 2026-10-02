import { SignIn } from "@clerk/react-router";

export default function Component() {
	return (
		<main>
			<h1>Sign in</h1>
			<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
		</main>
	);
}
