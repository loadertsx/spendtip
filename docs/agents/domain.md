# Domain Docs

This repository uses a single-context layout:

- `GLOSSARY.md` at the repository root.
- `docs/adr/` for architectural decision records.
- `app/` for application code.

## Before exploring

Read the root `GLOSSARY.md` and ADRs relevant to the area being explored.

If these files do not exist, proceed silently. Do not flag their absence
or suggest creating them upfront. The `/domain-modeling` skill,
reached via `/grill-with-docs` and `/improve-codebase-architecture`,
creates them lazily when terms or decisions are resolved.

## Use the glossary's vocabulary

Use defined domain terms in issue titles, proposals, hypotheses,
and test names. Avoid synonyms the glossary explicitly rejects.

If a concept is missing, reconsider whether it belongs to the project's
language or note a genuine gap for `/domain-modeling`.

## Flag ADR conflicts

Surface contradictions with existing ADRs explicitly rather than
silently overriding them. Identify the ADR and explain why its
decision might be worth reopening.
