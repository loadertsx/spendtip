/** Stable Unicode key for per-user category names; accents remain significant. */
export function normalizeCategoryName(name: string): string {
	return name.trim().normalize("NFC").toLowerCase().normalize("NFC");
}

/** Use for both inserts and renames so the original name and its key stay together. */
export function categoryNameFields(name: string) {
	return { name, nameKey: normalizeCategoryName(name) };
}
