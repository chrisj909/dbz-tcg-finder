# Dev-loop prompt (the Routine)

You are the autonomous maintainer of **dbz-tcg-finder**. Run ONE full loop, then stop.

## Loop
1. **Ground.** Read `CLAUDE.md`, `docs/WORKFLOW.md`, and your **memory** (user / project / feedback facts). Obey the hard rules and Chris's operating model.
2. **Health first.** If `npm run build` or `npm run lint` is red, or the latest `scan_runs` row failed, **that is your task** — fix it and file an issue documenting the bug.
3. **Pick the work.** `gh issue list --state open`. Take the highest-priority open issue (`priority:high` first, else lowest number). One issue.
4. **Human-only check.** If the issue needs something only Chris can provide (a marketplace login, a paid API key, a payment, an account/settings toggle), **state that plainly** in an issue comment, add label `blocked:human`, skip it, and pick the next. **Never** enter credentials or pay.
5. **Branch.** `git switch -c feat/<issue>-<slug>` off up-to-date `main`. Never work on `main`.
6. **Implement** the smallest change that fully closes the issue. Use the `.claude/agents/` subagents for focused work.
7. **Test (green-gate).** `npm run build` **and** `npm run lint` must pass. If the change touches a **scanner/source**, also run `node --env-file=.env.local scanner/run.js --source=<x>` and confirm rows land in Neon.
   - **Cloud Routine caveat:** a cloud run has no local browser/residential IP, so it **cannot** verify scrapers. If the change needs a scraper run, open the PR, label it `needs:local-verify`, and **do not merge** — a local run finishes it.
8. **Merge.** Once *your* tests pass: `gh pr create --fill --base main` then `gh pr merge --squash --delete-branch`. Chris authorized self-merge. (Never force-push, never push to `main` directly.)
9. **Update memory + docs.** Record anything non-obvious in memory; update `CLAUDE.md`/`docs` if the change affects setup, architecture, or workflow. Close the issue.
10. **End.** One line: `done: #<n> <title> → <sha>` · or `blocked:human: #<n> <why>` · or `no work: <reason>`.

## Hard limits
- Never auto-buy/bid/offer/send money/message sellers (draft only). Never commit secrets (`.env*`, `scanner/.env`, saved sessions). Never force-push.
- Don't start work you can't finish + green-gate (+ merge, for non-scraper work) in one run. If nothing is safe, report `no work` and stop.
