// =======================================================
// ⚙️ HOST_FLYO.jsx — Launch Flyover Electron Helper
// =======================================================

// V2 — Robust launcher: resolve extension root from this JSX file
function he_launchFlyover() {
    try {
        // From jsx/modules/host_FLYO.jsx → extension root
        var here = new File($.fileName);                 // .../jsx/modules/host_FLYO.jsx
        var extRoot = here.parent.parent.parent;         // .. / .. / .. → extension root

        var batFile = new File(extRoot.fsName + "/helpers/launch_flyover.bat");
        if (!batFile.exists) {
            $.writeln("[HOST_FLYO] BAT not found at: " + batFile.fsName);
            return "ERR_NO_BAT";
        }

        var cmd = 'cmd.exe /c "' + batFile.fsName + '"';
        var out = system.callSystem(cmd);
        $.writeln("[HOST_FLYO] Launch command run → " + cmd);
        $.writeln("[HOST_FLYO] system.callSystem output → " + out);

        return "OK";
    } catch (err) {
        $.writeln("[HOST_FLYO] Launch failed → " + err);
        return "ERR_EXCEPTION";
    }
}


try {
  logToPanel("✅ host_FLYO.jsx Loaded ⛓️");
  var NEW_log_event = new CSXSEvent();
  NEW_log_event.type = "com.holyexpressor.NEW_log_event";
  NEW_log_event.data = "✅ host_FLYO.jsx Loaded ⛓️";
  NEW_log_event.dispatch();
} catch (e) {}


