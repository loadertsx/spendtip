# Spendtip design guide

How Spendtip looks, sounds, and behaves. Read this before building a new
screen, and update it when we deliberately change direction.

The short version: **friendly, plain, and calm** — in the spirit of
37signals products like HEY, Basecamp, and Fizzy. Warm paper, bold type,
pill buttons, one yellow highlighter, and copy that sounds like a person.

---

## 1. Principles

1. **Plain over clever.** Every screen should be understandable at a glance.
   If it needs a tooltip to explain it, simplify it.
2. **Show, don't decorate.** Illustrate features with real-looking product
   UI (an expense, a breakdown, a note), not generic icons or stock art.
3. **One idea per screen.** Centered, narrow columns. Generous whitespace.
   Fewer, bigger things.
4. **Calm money.** No red alerts, streaks, badges, or guilt. Numbers are
   honest and stated in sentences.
5. **Sound like a person.** Short, warm, direct copy. Contractions are fine.

---

## 2. Color

All colors are tokens in `app/app.css`. Components use the Tailwind classes
generated from them (`bg-paper`, `text-ink`, `border-rule`, …). **Never
hard-code hex values in components** — the one exception is the dark text on
yellow surfaces (see the marker and note sample), which must stay dark in
both themes.

### Core tokens

| Token       | Light     | Dark      | Use                                             |
| ----------- | --------- | --------- | ----------------------------------------------- |
| `paper`     | `#fffdf8` | `#17161a` | Page background (warm white, never pure `#fff`) |
| `surface`   | `#ffffff` | `#211f25` | Cards, inputs, popovers                         |
| `ink`       | `#1b1b1f` | `#f3f1ec` | Primary text, primary buttons, active nav       |
| `muted`     | `#6e6a73` | `#a19ca6` | Secondary text, labels, metadata                |
| `rule`      | `#ebe6dc` | `#34313a` | Borders, dividers, dashed empty states          |
| `accent`    | `#1f6bff` | `#6f9bff` | Focus ring, primary button hover, links         |
| `highlight` | `#ffe45c` | `#e8c93a` | The marker highlight and yellow notes           |
| `positive`  | `#1a9b55` | `#4cc98a` | Income, money coming in                         |
| `negative`  | `#e0392b` | `#ff6b5e` | Errors and destructive actions only             |

### Category colors

`cat-pink`, `cat-orange`, `cat-green`, `cat-blue`, `cat-purple`. Used for
expense categories (dots, bar segments, avatar fallbacks) and the orange dot
in the wordmark. They are **identifiers, not decoration**: one color always
means the same category.

- Show them as small dots or bar segments next to ink text. Don't put body
  text in a category color — contrast is too low.
- If we need more than five categories, add tokens here first.

### Rules

- Ink and paper do the heavy lifting. Color is the exception.
- Spending is **not** shown in red. Red means something is wrong (an
  error, a destructive action), not "you spent money".
- Yellow appears at most **once or twice per screen** (see the marker).

---

## 3. Typography

- **Font:** the system UI stack (`font-sans`). No web fonts — fast, native,
  and it matches the 37signals approach. `font-mono` is only for IDs.
- **Weights:** headings `font-black` (900), section titles `font-extrabold`,
  UI text `font-semibold`/`font-bold`, body regular.
- **Headings:** `tracking-tight` and `text-balance`.
- **Numbers:** always `tabular-nums` so amounts line up.

| Role             | Classes                                                   |
| ---------------- | --------------------------------------------------------- |
| Hero (marketing) | `text-5xl sm:text-7xl font-black tracking-tight`          |
| Page title       | `text-4xl sm:text-5xl font-black tracking-tight`          |
| Section title    | `text-3xl sm:text-4xl font-black` (marketing) / `text-xl font-extrabold` (app) |
| Lead paragraph   | `text-lg sm:text-xl text-muted`                           |
| Body             | default size, `text-ink` or `text-muted`                  |
| Label            | `label` utility (xs, bold, uppercase, muted)              |

---

## 4. Layout

- **Centered columns.** App screens: `max-w-xl` / `max-w-2xl`. Marketing:
  `max-w-5xl`. Header: `max-w-5xl`.
- **Gutters:** `px-4` on every page container. No horizontal scrolling at
  phone width.
- **Vertical rhythm:** pages start with `pt-10` (app) or `pt-16 sm:pt-24`
  (marketing) and end with `pb-24`.
- **Mobile first.** Two-column layouts collapse to one; check every screen
  at ~375px wide.
- **Header:** three columns — nav pills on the left, the `spendtip.`
  wordmark centered, theme toggle and account on the right.

---

## 5. Components

Shared utilities live in `app/app.css`. Use them instead of re-composing
the same classes.

| Utility         | What it is                                                     |
| --------------- | -------------------------------------------------------------- |
| `btn-primary`   | Ink pill button; turns accent blue on hover. One per view.     |
| `btn-secondary` | Bordered pill on surface, for secondary actions.               |
| `card`          | `rounded-2xl`, 1px `rule` border, very soft shadow.            |
| `label`         | Small uppercase muted label above a value or section.          |
| `marker`        | Yellow highlighter behind a word or two.                       |

### Buttons

- Pills (`rounded-full`), bold text, sentence case.
- One primary action per view. Everything else is secondary or a text link.
- Button labels describe the outcome: "Start your ledger", "Save it" —
  not "Submit" or "OK".
- Buttons get `cursor: pointer` globally (Tailwind v4 resets it; we restore
  it in `app/app.css`). Disabled buttons keep the default cursor.

### Navigation

- Nav links are pills: active is `bg-ink text-paper`, inactive is
  `text-muted hover:text-ink`. Use `NavLink` so the active state is
  automatic.

### Cards and lists

- Use `card` for grouped content. Inside, separate rows with
  `divide-y divide-rule`, not more cards.
- Don't nest cards.
- Key/value lists use `<dl>`: muted bold term on the left, value on the
  right, stacking on mobile.

### Empty states

- A dashed box: `rounded-2xl border-2 border-dashed border-rule`, centered
  text.
- A bold first line saying what's missing, then one muted line saying what
  will appear there. Example: **Nothing here yet.** "When you log your first
  expense, it'll show up right here."

### Chips (categories)

- `rounded-full border-2` with a category dot and the name.
- Selected: `border-ink`. Unselected: `border-rule text-muted`.

### The marker

The yellow highlighter is our signature. It works because it's rare.

- **Max one per screen**, on the two or three words that carry the message
  ("your money", "back", "set up", a key amount).
- Never on whole sentences, buttons, or more than one heading.
- Text on yellow is always dark (`#1b1b1f`), in both themes.

### Product samples (marketing)

Marketing sections show miniature product UI instead of icons:

- Built from real components and tokens, so they look like the app.
- A slight tilt (`rotate-1` / `-rotate-1`) and `shadow-lg`, like a note
  pinned to the page.
- Wrapped in `aria-hidden="true"` — they illustrate, the adjacent text
  explains.
- Sample data must look plausible and be clearly illustrative.

---

## 6. Voice and copy

- Write in English, sentence case, short sentences.
- Friendly and direct: "Hey, Sam!", "Welcome back!", "Nothing here yet."
- Say numbers in sentences when possible: "You've spent $412 across 18
  expenses." instead of a bare table of KPIs.
- No hype, no guilt. Avoid "Supercharge", "Unlock", "Oops! Something went
  wrong 😬", "You overspent!".
- Errors explain what happened and what to do next, in plain words.

| Instead of                     | Write                                      |
| ------------------------------ | ------------------------------------------ |
| "No data available"            | "Nothing here yet."                        |
| "Submit"                       | "Save it"                                  |
| "404 Not Found"                | "We couldn't find that page."              |
| "Authentication required"      | "Sign in to see your ledger."              |
| "Budget exceeded!"             | "That's $40 more than last month."         |

---

## 7. Money and data

- Amounts: `tabular-nums`, right-aligned in lists, currency symbol included
  (`$4.50`).
- Income in `positive`. Spending in `ink` — never red.
- Dates in tables: short and human ("Today, 8:42 AM", "02 Oct 2026").
  Server-rendered timestamps use a fixed time zone so server and client
  render the same string.
- IDs in `font-mono`, truncated, with a "Copy" pill.

---

## 8. Light and dark

- Three modes: **Auto** (follows the OS, default), **Light**, **Dark**,
  cycled by the toggle in the header (`app/features/theme/theme-toggle.tsx`).
- The choice is stored in `localStorage` and applied by an inline script in
  `<head>` before first paint, so there's no flash.
- Dark values are defined twice in `app/app.css` (for `[data-theme="dark"]`
  and for the OS preference). **Change both together.**
- Design in tokens and dark mode comes for free. Don't use Tailwind's
  `dark:` variant — it isn't wired to the toggle.
- Check every new screen in both themes.

---

## 9. Clerk components

Clerk's sign-in, sign-up, and user menu are themed in `app/root.tsx` via
`appearance`:

- `variables` point at our CSS tokens, so Clerk follows light/dark.
- `elements` use **style objects**, not Tailwind classes — Clerk's own
  styles outrank our layered utilities. Some borders need `!important`.
- Keep Clerk visually consistent with our own components: pill buttons,
  2px `rule` borders on inputs, `card`-like container.

---

## 10. Accessibility

- Visible focus ring everywhere: `outline-accent` on `:focus-visible`.
  Don't remove it.
- Text meets WCAG AA contrast in both themes. Muted text is for secondary
  information only.
- Decorative visuals get `aria-hidden="true"`; icon-only buttons get an
  `aria-label` (see the theme toggle).
- Use semantic elements: `<button>` for actions, `<a>`/`<Link>` for
  navigation, `<dl>` for key/value data, `<time>` for dates.

---

## 11. Avoid

These read as generic or "AI-generated" and don't fit Spendtip:

- Grids of three cards, each with an icon in a colored square.
- Gradients, glassmorphism, glows, and heavy shadows.
- Multiple accent colors competing on one screen.
- KPI dashboards full of tiles when a sentence would do.
- Emoji as decoration, confetti, streaks, badges.
- Pure white backgrounds and pure black text.
- Tiny gray text for anything important.

---

## 12. Checklist for a new screen

- [ ] Uses tokens and shared utilities, no hard-coded colors
- [ ] One primary action, one marker at most
- [ ] Centered column with `px-4` gutters; works at 375px
- [ ] Looks right in light and dark
- [ ] Amounts use `tabular-nums`; spending isn't red
- [ ] Empty state written and styled
- [ ] Copy is short, friendly, and in sentence case
- [ ] Keyboard focus visible; decorative elements hidden from screen readers

---

## Where things live

| What                         | File                                     |
| ---------------------------- | ---------------------------------------- |
| Tokens and utilities         | `app/app.css`                            |
| Clerk theme, error page      | `app/root.tsx`                           |
| Header and nav               | `app/features/auth/auth-controls.tsx`    |
| Theme toggle                 | `app/features/theme/theme-toggle.tsx`    |
| Auth page layout             | `app/features/auth/auth-page.tsx`        |
| Landing and product samples  | `app/features/landing/landing.tsx`       |
| Signed-in overview           | `app/features/users/routes/me.tsx`       |
| Account page                 | `app/features/users/routes/account.tsx`  |
