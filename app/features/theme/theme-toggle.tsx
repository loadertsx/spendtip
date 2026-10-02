import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "spendtip-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABELS: Record<Theme, string> = {
	system: "Auto",
	light: "Light",
	dark: "Dark",
};

function applyTheme(theme: Theme) {
	if (theme === "system") {
		document.documentElement.removeAttribute("data-theme");
	} else {
		document.documentElement.dataset.theme = theme;
	}
}

/**
 * Runs in <head> before first paint so a stored theme never flashes.
 * Storage can throw (private mode, blocked cookies); fall back to the OS.
 */
export const themeScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle() {
	// The server can't see localStorage, so render "system" until hydrated.
	const [theme, setTheme] = useState<Theme>("system");

	useEffect(() => {
		const stored = document.documentElement.dataset.theme;
		if (stored === "light" || stored === "dark") setTheme(stored);
	}, []);

	const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

	return (
		<button
			type="button"
			aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}`}
			title={`Theme: ${LABELS[theme]}`}
			className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-rule hover:text-ink"
			onClick={() => {
				setTheme(next);
				applyTheme(next);
				try {
					if (next === "system") localStorage.removeItem(STORAGE_KEY);
					else localStorage.setItem(STORAGE_KEY, next);
				} catch {}
			}}
		>
			<ThemeIcon theme={theme} />
		</button>
	);
}

function ThemeIcon({ theme }: { theme: Theme }) {
	return (
		<svg
			viewBox="0 0 16 16"
			className="size-[18px]"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			aria-hidden="true"
		>
			{theme === "light" ? (
				<>
					<circle cx="8" cy="8" r="3" />
					<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" />
				</>
			) : theme === "dark" ? (
				<path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
			) : (
				<>
					<circle cx="8" cy="8" r="6" />
					<path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" />
				</>
			)}
		</svg>
	);
}
