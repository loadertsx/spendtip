# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `loadertsx/spendtip`.
Use the `gh` CLI for all operations; it infers the repository from
the git remote when run inside this clone.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
  Use a heredoc for multi-line bodies.
- Read: `gh issue view <number> --json number,title,body,labels,comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
  Add appropriate `--label` and `--state` filters.
- Comment: `gh issue comment <number> --body "..."`
- Apply/remove labels: `gh issue edit <number> --add-label "..."`
  / `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`
- Link a sub-issue: `gh issue create --parent <parent> ...`
  or `gh issue edit <parent> --add-sub-issue <child>` (gh 2.94+).
  If unavailable, put `Part of #<parent>` at the top of the child
  and add it to a task list in the parent.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub shares issue and PR numbers. If a reference might be a PR,
resolve it with `gh pr view <number>` and fall back to
`gh issue view <number>`.

## Skill instructions

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the GitHub issue.
