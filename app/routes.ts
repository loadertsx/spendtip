import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("sign-in/*", "features/auth/routes/sign-in.tsx"),
	route("sign-up/*", "features/auth/routes/sign-up.tsx"),
	route("account", "features/users/routes/account.tsx"),
] satisfies RouteConfig;
