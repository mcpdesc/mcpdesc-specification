# Draft 1 validator test snapshot

The `fixtures/` tree is a byte-for-byte copy of the fixture corpus associated with the immutable `v0.8.0-draft.1` specification snapshot. Validator package tests use this copy so later work in `spec/draft/fixtures/` cannot change Draft 1 coverage or expectations.

Do not update this directory for later draft iterations. Add a sibling test snapshot for each newly supported exact specification selector. Test snapshots are development assets and must not ship in the npm package.