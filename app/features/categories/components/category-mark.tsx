import clsx from "clsx";

export function CategoryMark({
	emoji,
	size = "md",
}: {
	emoji: string;
	size?: "md" | "sm";
}) {
	return (
		<span
			aria-hidden="true"
			className={clsx(
				"grid shrink-0 place-items-center border border-rule bg-paper",
				size === "md"
					? "size-11 rounded-xl text-2xl"
					: "size-7 rounded-full text-base",
			)}
		>
			{emoji}
		</span>
	);
}
