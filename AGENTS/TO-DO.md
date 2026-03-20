# 🧾 HOLY EXPRESSOR — TODO

---

## 🧩 Snippets

- 🎨 **Snippet controls button UI**

- 🎨 **Snippet bank title/label readability**

    - The title of the snippet bank needs to be easier to read

- 🎨🧠 **Snippet controls interface expansion**

    - When editing a snippet, display whether controls are saved

    - Show what controls are currently saved

    - Expand on the interface/method for saving and editing controls

- 🎨 **Right-click snippet menu colors**

    - Adapt colors for the right-click dropdown menu on snippet buttons

- 🎨🧠 **Duplicate bank function**

    - Add ability to duplicate a snippet bank

    - Implement via right-click on banks dropdown menu item or dedicated icon

    - Exact interaction method to be determined


---

## 🍞 Toast

- 🎨 **Toast positioning**
    
    - Toast messages should appear centered on screen instead of bottom-left
        
    - Exact behavior/details to be revisited
        

---

## ✍️ Rewrite

- 🎨 **Rewrite UI (general)**
    
- 🎨 **Mode switch arrow button UI**
    
    - Replace current button with correct SVGs

        

---

## 🔄 Search / Replace

- 🧠 **Search & Replace multi-line limitation**
    
    - Current implementation effectively searches only single-line patterns
        
    - Expressions commonly span multiple lines
        
    - Requires redesign or multi-line-safe workaround
        

---

## 🎨 Apply Buttons

- 🎨 **Apply button UI update**
    
- 🎨 **Rewrite Apply button UI update**
    

---


---

## 🧠 Load Path / Pick-Click

- 🧠 **(new system)**
    
    - Cleaner implementation identified
        
    - Needs finishing
        
    - Requires adding remaining entries into internal tables
        
- 🧠🎯 **Pick-click UX (pickwhip-inspired)**
    
    - Click the button, then click a property in the AE timeline
        
    - Aims to match pickwhip ergonomics as closely as possible
        
- 🎨 **Load Path button UI update**
    
    - Button likely changes to a pseudo pickwhip-style icon
        
- 🧠🎯 **Pick-click parity for Load Expression**
    
    - If pick-click is used for Load Path, Load Expression should adopt the same interaction model
        

---

## 🧹 Delete

- 🧹 **Delete expressions for selected groups (optional)**
    
    - If a group inside a shape layer is selected, delete should be scoped to that group
        
    - Mirrors existing layer-level delete behavior
        

---

## ⚡ Quick Panel

- 🎨 **Quick Panel UI**
    
- 🧠 **Quick Panel state management**
    
    - Shares state with snippet buttons
        
    - When both are open, states can overlap and desync
        
    - Needs a single, reliable state solution
        
- 🧠🎨 **Responsive collapse behavior (concept)**
    
    - If panel height is reduced below a threshold, switch to _Snippets-only_ view
        
    - Alternative to maintaining a separate Quick Panel UI
        
    - Requires further thought / decision
        

---

## 📜 Log

- 🐞 **Log shows zero values in some cases**
    
    - Seen with Custom Search applies
        
    - Appears correlated with Toast issues reporting zero / nothing found
        
    - Indicates shared source of truth or timing bug between Log + Toast
        

---

## (MAYBE FIXED) 
Items below have been hopefully fixed, more testing may be required to make sure:







## 🔁 Undo / Action History 

- Mass actions (e.g., bulk delete expressions) currently require multiple individual undo steps.
    
- Requirement: If triggered by a single user action (one button click), it must register as **one undo event**.
    
- Applies broadly to all batch operations, not just expression deletion.


## 🔎 CustomSearch (POTENTIALLLY FIXED)

- 🔍 **Scope traversal to selected groups (when applicable)**
    
    - If groups inside a layer are selected, traversal should be limited to those groups
        
    - Otherwise, traverse the full layer
        
- 🎨🛠 **Auto-disable Custom Search after Apply**
    
    - After a successful Apply, Custom Search should automatically turn off
        
- 🐞 **Custom Search runs even when unticked**
    
    - Search logic still executes despite Custom Search being disabled
        
    - Must strictly gate execution behind toggle state
        