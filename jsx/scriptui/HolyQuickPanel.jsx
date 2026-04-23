// ============================================================
// Holy Quick Panel — ScriptUI palette
// ------------------------------------------------------------
// Step 1 stub: reads banks.json, renders the 3 snippets of the
// active bank as buttons, applies the chosen snippet expression
// to the user's selected properties, auto-closes.
//
// Install: copy or symlink this file to
//   After Effects <version>/Support Files/Scripts/ScriptUI Panels/
// Then launch via Window > Holy Quick Panel (assign a keyboard
// shortcut in Edit > Keyboard Shortcuts if desired).
// ============================================================

(function (thisObj) {
    "use strict";

    // --------------------------------------------------------
    // Paths & I/O
    // --------------------------------------------------------

    function getBanksJsonFile() {
        // Matches what the CEP panel writes via
        // CSInterface.getSystemPath(SystemPath.USER_DATA).
        var path = Folder.userData.fsName + "/HolyExpressor/banks.json";
        return new File(path);
    }

    function readBanks() {
        var file = getBanksJsonFile();
        if (!file.exists) return { error: "banks.json not found at " + file.fsName };

        file.encoding = "UTF-8";
        if (!file.open("r")) return { error: "Could not open banks.json for reading" };

        var text;
        try {
            text = file.read();
        } finally {
            file.close();
        }

        if (!text) return { error: "banks.json is empty" };

        // ExtendScript has no JSON object. The file is written by our own
        // code and never contains user-controlled code paths, so eval of
        // the parenthesised literal is acceptable here.
        var data;
        try {
            data = eval("(" + text + ")");
        } catch (e) {
            return { error: "banks.json parse failed: " + e.toString() };
        }

        return { data: data };
    }

    function getActiveBank(data) {
        if (!data || !data.banks || data.banks.length === 0) return null;
        var activeId = data.activeBankId;
        for (var i = 0; i < data.banks.length; i++) {
            if (data.banks[i].id === activeId) return data.banks[i];
        }
        return data.banks[0];
    }

    // --------------------------------------------------------
    // Apply
    // --------------------------------------------------------

    function applyExpressionToSelection(exprString) {
        var comp = app.project ? app.project.activeItem : null;
        if (!(comp instanceof CompItem)) {
            return { ok: false, msg: "No active composition." };
        }

        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) {
            return { ok: false, msg: "No layer selected." };
        }

        var applied = 0;
        var skipped = 0;

        app.beginUndoGroup("Holy Quick Panel: Apply Snippet");
        try {
            for (var i = 0; i < layers.length; i++) {
                var selected = layers[i].selectedProperties || [];
                for (var j = 0; j < selected.length; j++) {
                    var p = selected[j];
                    if (p && p.canSetExpression) {
                        try {
                            p.expression = exprString || "";
                            applied++;
                        } catch (setErr) {
                            skipped++;
                        }
                    } else {
                        skipped++;
                    }
                }
            }
        } finally {
            app.endUndoGroup();
        }

        if (applied === 0) {
            return {
                ok: false,
                msg: "No properties accepted the expression" +
                    (skipped > 0 ? " (" + skipped + " skipped)." : ".")
            };
        }

        return {
            ok: true,
            msg: "Applied to " + applied + " propert" + (applied === 1 ? "y" : "ies") + "."
        };
    }

    // --------------------------------------------------------
    // UI
    // --------------------------------------------------------

    function buildUI() {
        // Always a floating palette, even when AE invokes us via
        // Window menu. This gives us click-outside dismiss and no
        // docking behaviour.
        var win = new Window("palette", "Holy Quick Panel", undefined, {
            resizeable: false,
            closeButton: true
        });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.margins = 8;
        win.spacing = 6;

        // Header: bank name + close button
        var header = win.add("group");
        header.orientation = "row";
        header.alignChildren = ["left", "center"];
        header.alignment = ["fill", "top"];
        header.spacing = 6;

        var bankLabel = header.add("statictext", undefined, "Loading...");
        bankLabel.alignment = ["fill", "center"];

        var statusLabel = win.add("statictext", undefined, "");
        statusLabel.alignment = ["fill", "top"];

        // Snippet row
        var row = win.add("group");
        row.orientation = "row";
        row.alignChildren = ["fill", "fill"];
        row.alignment = ["fill", "fill"];
        row.spacing = 4;

        var buttons = [];
        for (var i = 0; i < 3; i++) {
            var btn = row.add("button", undefined, "—");
            btn.preferredSize = [90, 32];
            buttons.push(btn);
        }

        var closeBtn = win.add("button", undefined, "Close");
        closeBtn.alignment = ["right", "bottom"];
        closeBtn.onClick = function () {
            win.close();
        };

        // --- Populate from banks.json -----------------------

        function setStatus(msg) {
            statusLabel.text = msg || "";
        }

        function wireButton(btn, snippet) {
            btn.onClick = function () {
                var result = applyExpressionToSelection(snippet.expr || "");
                if (result.ok) {
                    win.close();
                } else {
                    setStatus(result.msg);
                }
            };
        }

        function refresh() {
            var read = readBanks();
            if (read.error) {
                bankLabel.text = "(error)";
                setStatus(read.error);
                for (var k = 0; k < buttons.length; k++) {
                    buttons[k].text = "—";
                    buttons[k].enabled = false;
                }
                return;
            }

            var bank = getActiveBank(read.data);
            if (!bank) {
                bankLabel.text = "(no banks)";
                return;
            }

            bankLabel.text = bank.name || "Bank";
            var snippets = bank.snippets || [];

            for (var i = 0; i < buttons.length; i++) {
                var b = buttons[i];
                var s = snippets[i];
                if (s) {
                    b.text = s.name || ("Snippet " + (i + 1));
                    b.enabled = true;
                    wireButton(b, s);
                } else {
                    b.text = "—";
                    b.enabled = false;
                    b.onClick = null;
                }
            }
        }

        refresh();

        win.center();
        win.show();
        return win;
    }

    buildUI();

})(this);
