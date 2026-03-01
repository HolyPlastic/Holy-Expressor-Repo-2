## 📘 EXPRESSION FRIENDLY PATH BANK — AGENT REFERENCE GUIDE

This document explains **how to read, interpret, and extend** the Expression Friendly Path Bank (EFPB).

It is written for future agents interacting with this table.

---

# 🎯 PURPOSE

The Expression Friendly Path Bank exists to:

* Standardise **self-relative expression paths**
* Prevent incorrect path assumptions
* Eliminate repeated trial-and-error pickwhipping
* Define **structural grammar patterns** for After Effects expressions

It is **not** a property list.
It is a **path pattern registry**.

---

# 🧩 CORE CONCEPT: “Self-Relative FEP”

All entries assume:

* No `thisLayer`
* No `thisComp`
* No `layer()`
* No comp references

Paths begin at the property’s **immediate expression root**.

Example:

```
transform.scale
```

NOT:

```
thisLayer.transform.scale
```

---

# 📊 HOW TO READ THE TABLE

Each row defines a **structural namespace**, not a single property.

### 🏷 Column Breakdown

| Column                                     | Meaning                                             |
| ------------------------------------------ | --------------------------------------------------- |
| **Category ID**                            | Stable internal identifier. Do not repurpose.       |
| **Category (Immediate Parent Group Path)** | The structural location that defines the namespace. |
| **Applies To / Siblings**                  | Properties sharing the same grammar pattern.        |
| **FEP Format**                             | The reusable path template.                         |
| **Concrete Example**                       | Verified working expression path.                   |

---

# 🧠 STRUCTURAL LOGIC RULES

These rules govern additions and interpretations.

---

## 1️⃣ Categories Are Defined by Immediate Parent

Categories are not conceptual.
They are structural.

Example:

* `Stroke`
* `Stroke > Dashes`
* `Stroke > Taper`
* `Stroke > Wave`

These are separate because their **FEP grammar diverges**.

---

## 2️⃣ Siblings Share Grammar

If multiple properties resolve identically in structure, they belong in one row.

Example:

```
transform.anchorPoint
transform.position
transform.scale
```

All belong to:

```
transform.<property>
```

Do not create redundant rows for each property.

---

## 3️⃣ Generic Domains Stay Generic

Some systems are infinite in surface area.

Examples:

### 🎛 Effects

```
effect("<Effect Name>")("<Property Name>")
```

Never enumerate individual effects.

---

### 🎨 Shape Modifiers

```
content("<Group>").content("<Modifier>").<property>
```

Do not list Wiggle Paths, Zig Zag, etc. individually unless grammar diverges.

---

### 🎭 Layer Styles

```
layerStyle.<style>.<property>
```

Drop Shadow, Bevel & Emboss, Gradient Overlay all share structure.

---

## 4️⃣ Only Add Rows When Grammar Changes

Add a new row **only if**:

* A different namespace root is introduced
* A sub-group creates a new dot-chain segment
* A new access pattern appears (`.dash`, `.taper`, etc.)

Do **not** add rows for:

* Additional properties under the same structure
* Cosmetic UI differences
* Redundant naming variations

---

# 🛠 HOW TO USE THE BANK

### Step 1 — Identify Namespace Root

Determine which domain you are in:

* `text`
* `effect`
* `transform`
* `content`
* `layerStyle`

---

### Step 2 — Identify Structural Parent

Find the immediate parent group in the AE UI.

Example:

```
Shape > Contents > Stroke > Taper
```

---

### Step 3 — Apply the Template

From the table:

```
content("<Group>").content("Stroke <n>").taper.<property>
```

Substitute the property name.

---

### Step 4 — Do Not Add Redundant Rows

If the grammar matches an existing row,
the bank already covers it.

---

# 🧱 ARCHITECTURAL MODEL

The EFPB maps AE into five primary structural systems:

* 🅣 Text System (`text.*`)
* 🅔 Effects System (`effect()`)
* 🅛 Layer Core (`transform.*`)
* 🅢 Shape Contents (`content()`)
* 🅛🅢 Layer Styles (`layerStyle.*`)

Each system has its own root grammar.
They do not mix.

---

# 🚫 WHAT THIS DOCUMENT IS NOT

* Not a tutorial
* Not a full property enumeration
* Not a scripting guide
* Not a comp-relative reference map

It is strictly a **grammar registry for self-relative expression paths**.

---

# 🔐 INTEGRITY RULES FOR FUTURE AGENTS

When extending the table:

1. Verify expression output directly from AE.
2. Do not infer.
3. Do not assume symmetry.
4. Do not generalise without evidence.
5. Only introduce a new row if grammar changes.

If uncertain, do not modify structure.

---

# 📌 SUMMARY

The Expression Friendly Path Bank is a:

* Structural taxonomy
* Grammar template registry
* Self-relative path authority
* Redundancy prevention system

It exists to ensure expression paths are:

* Correct
* Minimal
* Predictable
* Scalable

That is its entire function.
