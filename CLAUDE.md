# Holy Expressor

A CEP panel for Adobe After Effects that provides a full expression editing, applying, and management workflow — including a CodeMirror editor, multi-layer apply systems, snippet banks, search-and-replace, and a quick-access panel.

**Stack:** CEP Panel / HTML + JS + ExtendScript (JSX) via CSInterface bridge
**Host:** Adobe After Effects CC 2022+ (CEP runtime 9.0+)

---

## Document Map

| File | Read when... |
|---|---|
| `Docs/ARCHITECTURE.md` | Touching any cross-cutting system — storage, the host bridge, shared utilities, holyAPI_*, or anything that spans multiple features. |
| `Docs/CODE_STYLE.md` | Creating or editing any HTML, CSS, or JS file. |
| `Docs/PLUGIN_SPEC.md` | You need to understand what a system is supposed to do and how it behaves. |
| `Docs/ROADMAP.md` | Creating a new feature — check it isn't already planned with a specific approach. |
| `Docs/ENVIRONMENT.md` | Setting up the development environment or debugging panel loading issues. |
| `Docs/features/` | Working on a specific feature. Each feature has its own file. Read the relevant one. |

---

## Feature Index

*Feature files are named with a two-digit prefix for sort order.*

| File | Feature |
|---|---|
| `Docs/features/01-expression-editor.md` | CodeMirror expression editor — capture, editing, syntax |
| `Docs/features/02-apply-system.md` | Apply expressions to layers — Blue Apply (standard) and Orange Apply (with Custom Search / Target List) |
| `Docs/features/03-search-replace.md` | Search & Replace in expressions |
| `Docs/features/04-snippets.md` | Snippet management — save, recall, organize expression snippets |
| `Docs/features/05-pickclick.md` | PickClick — interactive property picker. ACTIVE as of 2026-04-13 (previously quarantined). |
| `Docs/features/06-color-theming.md` | Color theming system — accent colors, CSS variable architecture |
| `Docs/features/07-quick-panel.md` | Quick Panel — lightweight snippet access panel |
| `Docs/features/08-load-path.md` | Expression load paths — path resolution, path bank |
| `Docs/features/09-delete-expressions.md` | Delete expressions from layers |
| `Docs/features/10-persistence-state.md` | Persistent storage and cross-panel state management |
| `Docs/features/11-apply-history.md` | Apply history / operation log |
| `Docs/features/00-settings.md` | Settings panel — flyout menu entry, modeless dialog |

---

## Entry Points

- `index.html` → Main panel (`com.holy.expressor.panel`)
- `quickpanel.html` → Quick snippets panel (`com.holy.expressor.quickpanel`)
- `colorpicker.html` → Color picker (`com.holy.expressor.colorpicker`)
- `settings.html` → Settings panel (`com.holy.expressor.settings`)
- Extension IDs + constraints in `CSXS/manifest.xml`
- Main bootstrap: `js/main_DEV_INIT.js` (loadJSX(), startup wiring, CodeMirror init)

---

## Rules for Agents

1. **Read before writing.** Before touching a feature, read its feature doc. Before touching a cross-cutting system, read `ARCHITECTURE.md`.
2. **Dev Logs are append-only.** Never edit or remove existing Dev Log entries. Add a new numbered entry at the bottom of the relevant feature doc. Cross-cutting changes go in the `ARCHITECTURE.md` Global Dev Log.
3. **One entry per meaningful change.** If a single session changes two separate things, write two entries. Write enough to tell the next agent what changed and why — not just what.
4. **Traps are non-negotiable.** Any `⚠️ TRAP:` callout in any document describes a silent failure mode. Do not work around it or ignore it.
5. **Cross-reference, don't repeat.** If something is documented in `ARCHITECTURE.md`, link to it from the feature doc. Don't copy the content.
6. **Dev Log is history. Open Bugs is current state.** Dev Log records what changed and why. Open Bugs reflects what is broken right now. Keep them separate — a bug fix gets a Dev Log entry and a strikethrough on the bug, not just one or the other.
7. **Bugs live in feature docs.** Always log a bug in the feature doc where it surfaces, even if the root cause is cross-cutting. Note the suspected root cause inline.
8. **Resolved bugs and limitations get struck through, not deleted.** Apply `~~strikethrough~~` and add a Dev Log entry noting the fix. History must be preserved.
9. **Roadmap is not a backlog.** Items in `ROADMAP.md` are planned with specific design intent. Don't implement them differently without flagging the deviation.
10. **PickClick is active.** As of 2026-04-13 the feature is stable and working; the previous quarantine has been lifted. See `Docs/features/05-pickclick.md` for current status and the historical context that led to the quarantine.
11. **No bundler/import system.** Panel modules attach to global `Holy` namespace. Respect load order in `index.html`.
12. **Blue/Orange Apply shorthand.** Blue Apply = standard apply without Custom Search. Orange Apply = apply with Custom Search or Target List. Internal shorthand only, not user-facing.
13. **Trace before modifying.** Before modifying any feature, trace its complete execution path: HTML trigger → JS routing → `evalScript` → ExtendScript backend. Never edit a node without checking both front-end and back-end.
14. **Blast radius check.** Before modifying any existing function or shared utility (especially anything on the `Holy` namespace), grep for its name across the workspace.
