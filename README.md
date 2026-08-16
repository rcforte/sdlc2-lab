# sdlc2-lab

Test bed for the [sdlc2](https://github.com/rcforte/sdlc2) feature graph.

    npm install
    npm test -- --run

A separate repo from the plugin on purpose: sdlc2 is **repo-scoped** — its clean-tree
pre-check, default branch and `slice/*` branches all belong to whichever repo it runs in.
Keeping the lab independent means an uncommitted harness change can be tested immediately,
instead of having to be committed first.
