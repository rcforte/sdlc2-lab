# sdlc2 harness findings

Defects in the **sdlc2 plugin** found by running it against this lab repo. Not defects in the
lab's own code — that is disposable by design and exists only to give the graph something real
to chew on.

> **Read the version line on every finding.** Runs 1 and 2 in this repo executed sdlc2 **0.1.1**
> while **0.1.2 was the installed version** — see SD-03, which is why. SD-01 and SD-02 were real
> in the engine that ran, and both were already fixed upstream in 0.1.2 before this lab
> reproduced them. They are kept because independent reproduction from outside the plugin is
> worth having, and because the evidence is the regression test.

---

## SD-01 — The build node picks a slice's branch base by index, not by `Blocked by:`

**Affected:** sdlc2 0.1.1 · **Status:** fixed upstream in 0.1.2 (`baseFor()`, `[R-BUILD-04a]`)
**Severity:** high · **Found in:** run `nf-20260816T0246Z` (`greet-visitor`)

### What happened

`build` stacked slice *N* on slice *N-1* in file order. `blockedBy` was parsed and used for skip
logic, but never consulted when choosing a branch base. Run 1 declared a genuine diamond —
issues 03 and 04 are **both** `Blocked by: 02-blank-name-alert`, making them siblings:

```
declared:  02 -+- 03            actual:  02 - 03 - 04
               +- 04
```

Verified against the merged SHAs (`02=368aed6 03=6a1efc4 04=a296fc8`):

```
$ git merge-base --is-ancestor 368aed6 a296fc8   # 02 is ancestor of 04 - required, true
$ git merge-base --is-ancestor 6a1efc4 a296fc8   # 03 is ALSO ancestor of 04 - never declared
```

Slice 04 was cut from 03 despite declaring no dependency on it, so it could not be reviewed or
reverted without 03 coming along. 0.1.2's own `SPEC.md` §12 describes this verbatim.

### Why run 2 could not catch it

`greeting-log`'s `po` declared a pure chain (`01<-none`, `02<-01`, `03<-02`), so there were no
sibling slices and no parallel edge to get wrong. **A gate that checks only for the *presence* of
`Blocked by:` lines passes that run while learning nothing. Presence is not the property that
matters; branching is.** Any gate should assert that two slices which are siblings in the
declared graph are siblings in git — neither an ancestor of the other.

### A diamond cannot be ordered up

An attempted replay of `greet-visitor` from its original seed (run `nf-20260822T2015Z`, aborted)
produced a **different slicing**: two slices in a chain, not four with a diamond. The `po` is not
deterministic about how it cuts a capability, so "re-run the feature that produced a diamond
last time" is not a reliable way to obtain one. Exercising this path end to end needs a seed
written so that two slices are genuinely independent of each other.

### The 0.1.1 spec could not have been satisfied

`SPEC.md:185` required branches "cut from the default branch" while `SPEC.md:160` required each
issue to carry `Blocked by:`. Those are mutually exclusive: a slice cut from the default branch
cannot contain the code of the slice it declares itself blocked by, so its acceptance test could
not pass. 0.1.2 resolves it by splitting the rule and making the **tester** prove the base with
`git merge-base --is-ancestor` against the base, the blockers and the non-blockers.

### Note for anyone writing that assertion

`git merge-base --is-ancestor` exits non-zero on a **deleted or unknown ref**, which is
indistinguishable from a true negative when consumed with `||`. Reproducing SD-01 initially
reported PASS for branches that no longer existed. Resolve the refs first.

---

## SD-02 — The run report is left untracked, dirtying the tree for the next run

**Affected:** sdlc2 0.1.1 · **Status:** fixed upstream in 0.1.2 (`[R-REP-03]`)
**Severity:** medium · **Found in:** run `nf-20260822T0327Z` (`greeting-log`)

The build node committed the graph's artifacts (`7d12e31`), but the run report is written *after*
that commit and was never committed:

```
$ git status --porcelain
?? .sdlc2/features/greeting-log/runs/
```

`modes/new-feature.md` pre-check 1 requires a clean tree and stops otherwise, so a **successful**
run left the repo in a state where **the next run refuses to start** — cause and symptom one run
apart. In 0.1.1 no requirement covered committing it (`R-REP-01/02` cover only that it is
*written*). 0.1.2 adds `[R-REP-03]`: the report node commits `.sdlc2/` and `docs/adr/` to a
`sdlc2/<feature>` branch, and appends a `## Paperwork not committed` section when it cannot.

Run 1 committed *none* of its artifacts; run 2 committed all but the report. The gap was already
closing.

---

## SD-03 — A session pins `${CLAUDE_PLUGIN_ROOT}` at start, so a mid-session plugin update is invisible

**Affected:** the Claude Code plugin harness, not sdlc2 · **Status:** open
**Severity:** high — silently runs a stale engine and invalidates everything measured with it

### What happened

This session began 2026-08-15. sdlc2 was updated to 0.1.2 on 2026-08-21 22:26. The session's
router text still carried the absolute path it was injected with:

```
/home/rcforte/.claude/plugins/cache/sdlc2-marketplace/sdlc2/0.1.1
```

while `installed_plugins.json` recorded:

```json
"sdlc2@sdlc2-marketplace": [{ "installPath": ".../sdlc2/0.1.2", "version": "0.1.2" }]
```

Both version directories exist side by side in the cache, so the stale path kept resolving and
kept working. Every graph run in this session — runs 1 and 2 and the aborted replay — executed
0.1.1's engine, its personas and its skills.

### Why it is worth filing

Nothing signalled it. The runs succeeded, the reports were written, the verdicts looked normal.
It surfaced only because a finding was filed against `SPEC.md` and the requirement IDs the human
expected (`R-BUILD-04a`, `R-REP-03`) were absent from the spec being read — they exist in 0.1.2.

The costs were real: two full graph runs (~6.3M agent tokens) measured a superseded engine, two
defects were "found" that the author had already fixed, and a patch was written against a cache
directory that is both overwritten on update *and* already superseded.

### What to do about it

- **Print the version being executed.** A run report stating its own `pluginRoot` and `VERSION`
  would have caught this on run 1's first line. That is a cheap addition to `[R-REP-01]` and the
  single highest-value change suggested by this lab so far.
- Treat a long-lived session as pinned. After updating a plugin, restart the session, or pass the
  resolved path explicitly instead of relying on the injected router text.
- When a finding cites a requirement ID that is absent from the spec you are reading, suspect
  version skew before concluding the ID does not exist.
