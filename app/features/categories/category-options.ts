export const categoryEmojis = [
	"🍔",
	"🛒",
	"☕",
	"🚕",
	"🎉",
	"💡",
	"🏠",
	"💊",
	"🎁",
	"✈️",
	"📚",
	"🐶",
] as const;

// Suggestions are editable starting points, never automatically created records.
export const categorySuggestions = [
	{
		name: "Food",
		description: "Groceries, lunches and delivery.",
		emoji: "🍔",
	},
	{
		name: "Transport",
		description: "Rides, public transport, fuel and parking.",
		emoji: "🚕",
	},
	{
		name: "Going out",
		description: "Restaurants, bars, concerts and plans with friends.",
		emoji: "🎉",
	},
	{
		name: "Bills",
		description: "Rent, utilities, internet, phone and subscriptions.",
		emoji: "💡",
	},
	{
		name: "Health",
		description: "Pharmacy, doctor visits, gym and therapy.",
		emoji: "💊",
	},
] as const;
