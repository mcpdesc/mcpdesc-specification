# Origin and provenance

MCP Description v0.7.0 originated in the Cisco Open `mcptoolkit-contract` repository and remains the current stable release as of 2026-07-28; its canonical source stays there.

This repository is the development home for v0.8.0 and later community work.
The transition changes future development and governance only — it is **not** a
copyright assignment or donation, and it does not transfer Cisco's copyright in
existing contributions.

## Source import

| Field | Value |
|---|---|
| Upstream repository | `https://github.com/cisco-open/mcptoolkit-contract` |
| Upstream commit | `874ffba8dd2772a6df4df2d76f402ba731a74617` |
| Import date | `2026-07-28` |
| Method | History-preserving filtered import (`git-filter-repo`); commit hashes rewritten by path filtering |
| Imported paths | `spec/**`, `schemas/mcp-description/**`, `schemas/latest.json`, `LICENSE`, `NOTICE` |

The imported v0.7.0 JSON Schemas are preserved byte-for-byte. The v0.7.0 specification text is not stored in this repository; its canonical source is the upstream repository above, and [`spec/0.7.0/`](spec/0.7.0/) points to it. Changes to imported material are recorded in [`MODIFICATIONS.md`](MODIFICATIONS.md) and Git history.
