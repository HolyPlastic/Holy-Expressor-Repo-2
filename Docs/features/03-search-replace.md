# Search & Replace

**Files:** `js/main_SEARCH_REPLACE.js` (CEP logic, match options, UI wiring), `js/main_EXPRESS.js` (expression state), `js/main_BUTTON_LOGIC_1.js` (button routing) → `jsx/Modules/host_APPLY.jsx` (host-side apply with search context), `jsx/Modules/host_GET.jsx` (property resolution)
**UI Section:** Main Panel — Rewrite mode, `#modeViewRewrite` / `#rewriteOverlay`

Search & Replace allows the user to find and replace text within expressions across selected After Effects layers. The search field and replace field are CodeMirror instances housed inside `#modeViewRewrite`, with the search field expanding downward and the replace field anchored to the bottom via `margin-top: auto` in a flex column layout. Match behavior is controlled by the `#matchCase` checkbox (diamond-style). When invoked, the system collects matching expressions through the same scoping logic used by the Apply system (Blue Apply for direct selection, Orange Apply when Custom Search is active), then performs string substitution on matched content.

*For the Apply system (which shares scoping logic), see `Docs/features/02-apply-system.md`. For cross-cutting systems, see `Docs/ARCHITECTURE.md`.*

---

## 3.1 Search Behavior

Search operates on expression text within the selected layers. The scope of what gets searched follows the same selection-precedence rules as Apply: if properties/groups are explicitly selected, only those are searched; if only layers are selected, all expressioned properties within those layers are candidates.

**Match Case (`#matchCase` checkbox):**
The `#matchCase` checkbox was missing from the DOM — `main_SEARCH_REPLACE.js` called `getCheckboxState("#matchCase", true)` but the element did not exist, so match-case was silently hardcoded to ON with no user control. The checkbox has now been added to `#rewriteOverlay` using the standard `.checkbox-Diamond` pattern, giving users explicit control over case sensitivity.

When Custom Search is active (Orange Apply path), the search scope is further constrained by the Search Captain's signature-based group scoping. See `Docs/features/02-apply-system.md` for details on how `he_U_SC_buildAllowedGroupSignatures` controls traversal scope.

---

## 3.2 Replace Behavior

Replacement substitutes matched search text with the contents of the replace field. The replace operation follows the "collect first, apply later" pattern established for Orange Apply — matching expressions are gathered across all in-scope properties before any mutations occur. This prevents branch early-exit issues where only the first match in a group would be replaced.

Undo behavior relies on After Effects' native undo stack — each batch of replacements is wrapped as a single undoable operation on the host side.

The JS-side button routing lives in `main_BUTTON_LOGIC_1.js`, which dispatches to `host_APPLY.jsx` for the actual ExtendScript mutation. Both sides must be checked when modifying replace behavior (see ROADMAP_TASK_ROUTER §2: "JS path and JSX path are split; confirm both sides").

---

## 3.3 UI / CodeMirror Integration

The search and replace fields are CodeMirror editor instances inside `#modeViewRewrite`. Several CSS specificity and layout issues have been resolved:

### CodeMirror Min-Height Specificity Trap

> **WARNING:** CodeMirror min-height requires an ID-level CSS selector to override the default 50px. Class-level selectors lose the specificity battle silently.

Global `!important` rules in `codemirror_styles.css` force 50px min-height on all CodeMirror instances:

```css
html.theme-default .cm-editor { min-height: 50px !important; }
/* plus matching .cm-content and .cm-gutter rules */
```

The `html` element selector gives this rule one extra specificity point over any class-only selector, even when both use `!important`. The override **requires** an ID selector to win:

```css
#modeViewRewrite .cm-editor { min-height: 22px !important; }
#modeViewRewrite .cm-content { min-height: 22px !important; }
#modeViewRewrite .cm-gutter  { min-height: 22px !important; }
```

Class-level overrides will appear correct in DevTools but will be silently defeated at render time. This is a persistent trap — do not attempt to fix it with additional classes or nesting.

### Rewrite Panel Layout

- `#modeViewRewrite` height changed from fixed `height: 97px` to `min-height: 97px` to prevent content clipping.
- `#rewriteOverlay` had `scale(0.7)` applied via transform, which was shrinking the `#matchCase` checkbox and clear button. The scale has been removed.
- `#rewriteReplaceWrapper` is bottom-anchored with `margin-top: auto` in a flex column. The search field expands downward; the replace field expands upward.

### Gradient Decorations

- `.rewrite-gradient-down` was removed from `#rewriteReplaceWrapper` — it overlapped the replace field and caused a visible stripe artifact.
- `.rewrite-gradient-up` was moved to after `#replaceField` in the DOM for correct paint order, with `z-index: 2`.
- Both gradient containers were ultimately relocated to `#modeViewRewrite` root as direct children for clean layering.

### Scrollbar Styling

Custom scrollbar for `.rewrite-codemirror .cm-scroller`: 4px wide, transparent track, accent-color thumb at 35% opacity. This keeps the scrollbar visually minimal within the compact rewrite fields.

---

## Open Bugs

*When a bug is resolved: apply `~~strikethrough~~` and add a Dev Log entry noting the fix. Do not delete.*

- ~~Missing `#matchCase` checkbox — `getCheckboxState("#matchCase", true)` silently hardcoded match-case ON. Fixed: checkbox added to `#rewriteOverlay` with `.checkbox-Diamond` pattern.~~
- ~~CodeMirror 50px min-height override failing with class-level selectors. Fixed: ID-level selector `#modeViewRewrite .cm-editor` applied.~~
- ~~`#rewriteOverlay` scale(0.7) shrinking interactive elements. Fixed: scale removed.~~
- ~~`.rewrite-gradient-down` overlapping replace field. Fixed: element removed from `#rewriteReplaceWrapper`.~~

No known open bugs.

---

## Dev Log

- 1: Initial feature documentation created from AGENTS/ migration. Content sourced from `DEV ARCHIVE.md` extraction (lines 2426-2430, 2520-2580, 2582-2665) and `ROADMAP_TASK_ROUTER.md` §2. Covers: `#matchCase` checkbox addition, CodeMirror min-height specificity trap (ID selector fix), gradient decoration repositioning, scrollbar styling, rewrite panel layout fixes.

- 2: Bidirectional expansion for search/replace CodeMirror editors. Previously `#modeViewRewrite .cm-editor` was `position: absolute`, which caused the editor to overflow its parent div without affecting parent height — it could only grow downward. Changed to `position: relative; width: 100%` so the editor's height contributes to `.rewrite-codemirror` parent. `.rewrite-codemirror` changed from fixed `height: 24px` to `height: auto` so it grows with CM content. Added `transform: translateY(-50%)` to `#rewriteSearchWrapper` and `#rewriteReplaceWrapper` so each wrapper centers on its `top: 25%` / `top: 75%` anchor — as the editor grows, the wrapper expands equally up and down. Removed `maxHeight: "64px"` cap from both editors' JS theme in `main_SEARCH_REPLACE.js` (previously capped at ~3 lines). The existing `attachRewriteExpandListeners` JS and `--cm-label-scale` shrinking behavior are unchanged.
