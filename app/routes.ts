import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("features/landing/routes/landing.tsx"),
	route("me", "features/users/routes/me.tsx"),
	route("categories", "features/categories/routes/categories.tsx"),
	route("sign-in/*", "features/auth/routes/sign-in.tsx"),
	route("sign-up/*", "features/auth/routes/sign-up.tsx"),
	route("account", "features/users/routes/account.tsx"),
] satisfies RouteConfig;
