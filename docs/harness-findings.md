# sdlc2 harness findings

Defects in the **sdlc2 plugin** found by running it against this lab repo. Not defects in the
lab's own code — that is disposable by design and exists only to give the graph something real
to chew on.

Filed here rather than in the plugin because the installed copy
(`~/.claude/plugins/cache/sdlc2-marketplace/sdlc2/<version>/`) is not a git repo and is
overwritten on update. Deliberately **not** under `.sdlc2/`, which this repo's `CLAUDE.md`
declares disposable.

Each finding names the requirement it breaks, using IDs as they appear in the installed
`SPEC.md`, and states plainly where no requirement covers the behaviour at all.

---

## SD-01 — The build node picks a slice's branch base by index, not by `Blocked by:`

**Version:** sdlc2 0.1.1
**Severity:** high — silently produces a branch topology that contradicts the declared plan
**Found in:** run `nf-20260816T0246Z` (`greet-visitor`); latent in run `nf-20260822T0327Z`
(`greeting-log`), which could not expose it

### What the spec says

`SPEC.md:185` —

> `[R-BUILD-04]` **MUST**: slices build **sequentially**, one branch `slice/<feature>/<NN>-<slug>`
> each, **cut from the default branch**; no worktrees, no lanes, no parallelism in v0.1.

`SPEC.md:160` —

> `[R-PO-03]` **MUST**: each issue carries `Blocked by:` and `Dir:`.

So the `po` node is required to declare a dependency graph, and the `build` node is required to
cut every branch from the default branch. **Neither of those is what happens, and the two rules
do not fit together in the first place** — a slice cut from `main` cannot contain the code of the
slice it declares itself blocked by, so its tests could not pass.

### What actually happens

`build` stacks slice *N* on slice *N-1*, in file order. `Blocked by:` is never consulted when
choosing the base. When the declared graph is a chain this looks correct by accident. When the
declared graph branches, the branches are wrong.

### Evidence

Run 1 (`greet-visitor`) declared a genuine diamond — issues 03 and 04 are **both** blocked by 02,
making them siblings:

```
$ grep -h "^Blocked by:" .sdlc2/features/greet-visitor/issues/*.md
Blocked by: none                    # 01
Blocked by: 01-get-greeted-by-name  # 02
Blocked by: 02-blank-name-alert     # 03
Blocked by: 02-blank-name-alert     # 04   <-- sibling of 03, not a successor
```

The branches came out linear. Verified against the merged SHAs
(`01=41c5bcd 02=368aed6 03=6a1efc4 04=a296fc8`):

```
$ git merge-base --is-ancestor 368aed6 a296fc8 && echo "02 is ancestor of 04"
02 is ancestor of 04                                  # required, and true

$ git merge-base --is-ancestor 6a1efc4 a296fc8 && echo "03 is ALSO ancestor of 04"
03 is ALSO ancestor of 04                             # NOT declared, and true
```

```
declared:  02 ─┬─ 03            actual:  02 ─ 03 ─ 04
               └─ 04
```

Slice 04 was cut from 03 despite declaring no dependency on it.

### Why it matters

The `Blocked by:` edge is the only machine-readable statement of what a slice needs. If the build
node ignores it, then:

- A slice carries code it never declared a dependency on, so reviewing or reverting it in
  isolation is impossible — 04 cannot be taken without 03.
- The declared graph becomes decoration. Nothing downstream reads it, so a `po` that gets the
  dependencies *right* is indistinguishable from one that gets them wrong.
- Independent slices are serialised for no reason, which is also the thing that makes the
  deferred "parallel slice lanes" item (`SPEC.md:276`) impossible to build on top of — there is
  no dependency information flowing into the builder to parallelise *by*.

### Why run 2 did not catch it

`greeting-log`'s `po` declared a pure chain (`01←none`, `02←01`, `03←02`), so there were no
sibling slices and no parallel edge to get wrong. A gate that checks only for the *presence* of
`Blocked by:` lines passes this run while learning nothing. **Presence is not the property that
matters; branching is.**

### Conformance-matrix over-claim

`SPEC.md:260` marks R-BUILD-04 as `✅` (machine-checked):

| rule | implementation | how it is verified | |
|---|---|---|---|
| R-BUILD-04 | `buildSlices()` | a plain `for` over slices; no `parallel()` over slices | ✅ |

`verify.mjs` checks the **sequential** half of the rule and never the **branch-base** half. The
`✅` therefore asserts more than is tested, against a clause that is false in every run so far.

### Suggested fix

1. Decide which rule survives. "Cut from the default branch" and `Blocked by:` are mutually
   exclusive; the useful one is *cut from the branch of the slice named in `Blocked by:`*, and
   from the default branch only when it says `none`.
2. Rewrite R-BUILD-04 to say that, splitting the branch-base clause into its own ID so the
   sequential half and the base half can be verified separately.
3. Add the assertion to the tester or to `verify.mjs`: for each slice, `merge-base --is-ancestor`
   its declared parent, **and not** any slice it did not declare. The second half is the one that
   fails today.
4. Note for whoever writes that check: `git merge-base --is-ancestor` exits non-zero on a
   **deleted or unknown ref**, which is indistinguishable from a true negative if the result is
   consumed with `||`. Verify the refs resolve first, or a check written this way reports PASS
   for branches that no longer exist. (This bit the first attempt at reproducing SD-01.)

---

## SD-02 — The run report is left untracked, dirtying the tree for the next run

**Version:** sdlc2 0.1.1
**Severity:** medium — blocks the next run's own pre-check
**Found in:** run `nf-20260822T0327Z` (`greeting-log`)

### What the spec says

`SPEC.md:212` —

> `[R-REP-02]` **MUST**: the report is written on **every** outcome, including an aborted graph.

The report *is* written, so R-REP-02 holds. **No requirement covers whether it is committed**,
which is the gap this finding is really about.

### What actually happens

The build node commits the graph's artifacts — in run 2 that was
`7d12e31 docs(greeting-log): the graph's artifacts for the greeting log`, covering `feature.md`,
`design.md`, `mockup.html`, the three issue files and four ADRs. The run report is written
*after* that commit and never committed, so a completed run leaves the tree dirty:

```
$ git status --porcelain
?? .sdlc2/features/greeting-log/runs/
```

### Why it matters

`modes/new-feature.md` pre-check 1 requires `git status --porcelain` to be **empty** and stops the
run otherwise. So a successful sdlc2 run leaves the repo in a state where **the next sdlc2 run
refuses to start**, until a human commits or deletes an artifact the graph itself produced. The
failure surfaces one run later than its cause, which is the expensive way to find it.

It also reads as success while leaving work behind: the run result carries
`report: ".sdlc2/features/greeting-log/runs/nf-20260822T0327Z.md"` with no indication the file is
untracked, and the report has no `## Paperwork not committed` section.

### Contrast with run 1

Run 1 (`nf-20260816T0246Z`) committed **none** of its artifacts — `feature.md`, `design.md`,
`mockup.html`, the four issue files, nine ADRs and `VERIFY-WITH-HUMAN.md` were all left in the
working tree, and were committed by hand afterwards. Run 2 commits all of those and misses only
the report. So this improved between runs; the remaining gap is the one file written last.

### Suggested fix

Either amend the artifact commit to include the report once it is written, or add a second commit
after it. If leaving it untracked is deliberate, the report should say so in a
`## Paperwork not committed` section naming the file, so the next run's pre-check failure is
predictable rather than a surprise.
