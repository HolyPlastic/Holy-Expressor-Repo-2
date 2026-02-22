# DOCS_STATUS_MAP — Which Docs to Trust (and How Much)

Goal: prevent token burn by reading only what is authoritative for the question.

## Authority ladder

1. **Current code files** (`index.html`, `/js`, `/jsx`, `CSXS/manifest.xml`) → highest authority.
2. **This roadmap set** (`AGENT_INDEX`, `ROADMAP_*`) → navigation aid, not substitute for code.
3. **Historical/legacy docs** (`KNOWLEDGE_BASE`, `DEV ARCHIVE`) → context only.

---

## AGENTS directory docs, classified

- `AGENTS/AGENT_INDEX.md`
  - Start here. Global rules + routing pointers.
- `AGENTS/ROADMAP_TASK_ROUTER.md`
  - Fast task-to-file paths.
- `AGENTS/ROADMAP_CODE_MAP.md`
  - Verified architecture snapshot.
- `AGENTS/DOCS_STATUS_MAP.md`
  - This reliability map.

- `AGENTS/AGENTS.md`
  - Operational guardrails and conventions for agents.
  - Useful rules, but still verify claims against current code.

- `AGENTS/README.md`
  - Developer-facing architecture narrative.
  - Good orientation, but can drift from implementation details.

- `AGENTS/ENVIRONMENT.md`
  - Setup/install guidance. Useful for local CEP environment tasks.

- `AGENTS/KNOWLEDGE_BASE.md`
  - Explicitly non-canonical historical memory.

- `AGENTS/DEV ARCHIVE.md`
  - Chronological history log. Valuable for intent/timeline; not ground truth.
  - Do not rewrite historical content.

- `AGENTS/EXAMPLES.md`
  - Style/structure patterns (especially SVG/UI conventions).
  - Apply with judgment; verify against current CSS/HTML.

- `AGENTS/PICK CLICK SPECIFIC/*`
  - PickClick investigation area.
  - **Quarantined for non-PickClick tasks.**

---

## Read strategy by confidence need

- Need exact behavior now → open code directly first.
- Need likely rationale behind strange code → check `DEV ARCHIVE.md` after code read.
- Need formatting/consistency pattern → check `EXAMPLES.md` and current nearby files.
