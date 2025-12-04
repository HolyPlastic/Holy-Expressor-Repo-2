## SVG elements

### Rules

* All SVGs provided are exported directly from **Adobe Illustrator**.  
  These should be treated as the source of truth for structure and attribute data such as  
  `stroke-linecap`, `stroke-linejoin`, and `stroke-miterlimit`.  
  Codex should preserve these attributes exactly as given, with the exception of `fill`, `stroke`, and `stroke-width`, clarified in the rules below.

* `btn-icon` goes in the SVG class.  

* Lines do not require fills.  
  Elements that do should use `currentColor`.  
  If the user specifies that the element should have a transparent background,  
  then `fill` should be set to `none` where appropriate.  

* `stroke-width` and `stroke` should never be used in the HTML.  
  The color and width of the stroke will be handled exclusively in CSS.

* Code structure and formatting should match the layout shown in the examples exactly.  
  Maintain the same indentation, line breaks, and element spacing so that each attribute, tag, and nested element appears on its own line where demonstrated.  
  Do not condense multiple tags or attributes onto a single line — readability and visual hierarchy take priority over file size.

* Coordinate attributes (such as `x`, `y`, `width`, `height`, or `d`) should remain compact:
  - Keep all coordinate data for a single shape on **one line**.
  - Only split into multiple lines when defining **two or more distinct coordinate sets** (e.g., multiple `<line>` or `<path>` elements).
  - Do not separate a single coordinate sequence across several lines.
  - This maintains both readability and Illustrator's intended vector structure.

* `btn-clearSVG` is the main class used for SVG buttons.  
  CSS rules for this class should not be edited directly.  
  If further rules are required, add another class and create an appendage for it  
  in the CSS **below** the existing `btn-clearSVG` block.  

Example CSS Appendage:

```css
.btn-clearSVG .new-class-example {
  example contents;
}
````

---

### EXAMPLES

#### EXAMPLE 1 (Button)

```html
<button 
id="[insert appropriate content]" 
class="btn-clearSVG" 
type="button"
title="[brief summary of what the button does, to display on tooltip]"
aria-label="[insert appropriate content]" 
>
  <svg 
  class="btn-icon"
  viewBox="[insert appropriate content]"
  >
    
    <path 
      d="[insert path coordinates here on one line]"
      fill="currentColor"
      stroke-miterlimit="[insert relevant]">
    </path>

    <line class="inner-contents" 
      [insert line coordinates here on one line] 
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <line class="inner-contents" 
      [insert line coordinates here on one line] 
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <line class="inner-contents" 
      [insert line coordinates here on one line]  
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>
```

#### EXAMPLE 2 (Button)

```html
<button 
id="[insert appropriate content]" 
class="btn-clearSVG" 
type="button"
title="[brief summary of what the button does, to display on tooltip]"
aria-label="[insert appropriate content]" 
>
  <svg 
  class="btn-icon"
  viewBox="[insert appropriate content]"
  >
    <path
      d="[insert path coordinates here on one line]"
      fill="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    
    <line class="inner-contents"
      [insert line coordinates here on one line]
      stroke-linecap="round"
      stroke-linejoin="round" 
    />

    <circle class="inner-contents"
      [insert circle coordinates here on one line]
      fill="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>
```

#### EXAMPLE 3 (Checkbox)

```html
<label class="[appropriate class]">
  <input 
  id="[insert appropriate id]"
  type="checkbox" 
  >
  <svg 
  class="btn-icon" 
  viewBox="[insert appropriate content]"
  >
    <rect 
    d="[insert shape data]" 
    fill="currentColor" 
    stroke-miterlimit="[insert relevant]" 
    />
  </svg>
</label>
```

---

### Three-Part SVG Elements

Three-part SVG elements are used for UI components that require a fixed-width left cap, a fixed-width right cap, and a flexible middle section that expands horizontally. This pattern is used for scalable frames such as the custom search box, and reflects the current architectural model of the extension (Codex diff, 2025-11, replacing the earlier single-SVG JS-scaling system).

The three sections must be defined as **three separate SVG elements**, not `<g>` groups inside a single SVG. Using independent SVGs ensures clean flex-based expansion, prevents transform conflicts, and avoids the need for JavaScript to recalculate widths.

The structure consists of:

* **Left cap SVG**  
  A fixed-size SVG element (e.g., 16.82px width), preserving original Illustrator geometry.  
  This element must never scale horizontally.

* **Mid section SVG**  
  An SVG whose width is controlled by CSS flex expansion.  
  The mid section supplies only the horizontal strokes (typically two `<line>` elements).  
  These lines must use `vector-effect="non-scaling-stroke"` to maintain consistent stroke width.  
  No fill rectangle is required unless explicitly defined by the user.

* **Right cap SVG**  
  A fixed-size SVG element (e.g., 7.71px width), also preserving Illustrator geometry.  
  This element must never scale horizontally.

---

### Structural Rules

* **1. Exported Illustrator geometry is the source of truth.**  
  Preserve all coordinate data, path commands (`d`), and structural attributes exactly.  
  Only `fill`, `stroke`, and `stroke-width` are adjusted per global SVG rules in this document.

* **2. No JS-driven resizing must be used.**  
  The earlier single-SVG scaling block has been removed (Codex diff).  
  All resizing is now CSS-driven via flex on the container.

* **3. Each SVG must be assigned a clear class name.**  
  Example classes:  
  - `.cap-left`  
  - `.cap-mid`  
  - `.cap-right`  

  If generating a more general component, these names use the pattern:  
  `[identifier]-left`, `[identifier]-mid`, `[identifier]-right`.

* **4. Containers use flex layout.**  
  The wrapper (e.g., `.customSearch-frame-row`) must be a flex container with:  
  - `display: flex;`  
  - fixed caps using `flex: 0 0 auto;`  
  - mid section using `flex: 1 1 auto;` and `min-width: 0;`  
  This allows the mid SVG to expand horizontally while keeping the caps fixed.

* **5. Middle section stroke rules.**  
  The mid SVG supplies one or more horizontal `<line>` elements.  
  These must use:  
  - `vector-effect="non-scaling-stroke"`  
  - `shape-rendering="geometricPrecision"`  
  to keep the stroke width visually consistent.

  If top/bottom border strokes are required, they must be separate `<line>` elements, not a stroked rectangle.  
  This avoids stroke overlap between the mid section and the caps.

* **6. Attribute preservation.**  
  Illustrator’s native attributes (`stroke-linecap`, `stroke-linejoin`, `stroke-miterlimit`) must be preserved.  
  Only `stroke`, `stroke-width`, and `fill` are overridden by CSS using `currentColor`.

* **7. Do not merge the SVGs.**  
  The three-part structure must remain as three separate `<svg>` tags.  
  This avoids transform override issues, layout conflicts, and the “snapping” behavior seen with nested transforms.

---

### Example Structure (Three Independent SVGs)

```html
<div class="[identifier]-frame-row" aria-hidden="true">

  <!-- Left fixed-width SVG -->
  <svg
    class="[identifier]-left"
    xmlns="http://www.w3.org/2000/svg"
    width="[left-width]"
    height="[height]"
    viewBox="[insert Illustrator viewBox]"
    focusable="false"
  >
    <path 
      d="[insert Illustrator path]"
      fill="none"
      stroke="currentColor"
      vector-effect="non-scaling-stroke"
      stroke-miterlimit="[insert]"
    />
  </svg>

  <!-- Mid flexible SVG -->
  <svg
    class="[identifier]-mid"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="[mid viewBox]"
    preserveAspectRatio="none"
    focusable="false"
  >
    <line
      x1="[insert]"
      y1="[insert]"
      x2="[insert]"
      y2="[insert]"
      stroke="currentColor"
      vector-effect="non-scaling-stroke"
    />
    <line
      x1="[insert]"
      y1="[insert]"
      x2="[insert]"
      y2="[insert]"
      stroke="currentColor"
      vector-effect="non-scaling-stroke"
    />
  </svg>

  <!-- Right fixed-width SVG -->
  <svg
    class="[identifier]-right"
    xmlns="http://www.w3.org/2000/svg"
    width="[right-width]"
    height="[height]"
    viewBox="[insert Illustrator viewBox]"
    focusable="false"
  >
    <path 
      d="[insert Illustrator path]"
      fill="none"
      stroke="currentColor"
      vector-effect="non-scaling-stroke"
      stroke-miterlimit="[insert]"
    />
  </svg>

</div>
```

CSS Requirements (Summary)
```css

.[identifier]-frame-row {
  display: flex;
  align-items: center;
  justify-content: stretch;
  width: 100%;
  height: [height];
  pointer-events: none;
}

.[identifier]-frame-row svg {
  display: block;
  height: 100%;
  shape-rendering: geometricPrecision;
}

.[identifier]-left,
.[identifier]-right {
  flex: 0 0 auto;
}

.[identifier]-mid {
  flex: 1 1 auto;
  min-width: 0;
}
```
This structure replaces earlier single-SVG implementations and is now the canonical method for all three-part scalable UI elements in the project.
