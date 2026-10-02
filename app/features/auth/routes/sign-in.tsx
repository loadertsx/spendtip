import { SignIn } from "@clerk/react-router";
import { AuthPage } from "../auth-page";

export default function Component() {
	return (
		<AuthPage
			title={
				<>
					Welcome <span className="marker">back</span>!
				</>
			}
			subtitle="Good to see you. Let's check in on your spending."
		>
			<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
		</AuthPage>
	);
}
