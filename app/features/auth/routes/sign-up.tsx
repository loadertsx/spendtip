import { SignUp } from "@clerk/react-router";
import { AuthPage } from "../auth-page";

export default function Component() {
	return (
		<AuthPage
			title={
				<>
					Let's get you <span className="marker">set up</span>.
				</>
			}
			subtitle="It takes about thirty seconds. No credit card, no catch."
		>
			<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
		</AuthPage>
	);
}
