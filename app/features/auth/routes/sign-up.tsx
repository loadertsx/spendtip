import { SignUp } from "@clerk/react-router";

export default function Component() {
	return (
		<main>
			<h1>Sign up</h1>
			<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
		</main>
	);
}
