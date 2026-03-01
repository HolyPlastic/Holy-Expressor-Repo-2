# Holy Expressor – Environment Setup

This guide explains how to install the CEP extension into Adobe After Effects, enable debugging, and mirror the repository directly into the CEP extensions directory for rapid iteration.

## Prerequisites
- Adobe After Effects with CEP runtime 9.0+ enabled (manifest targets AE versions 17.0 and newer).【F:CSXS/manifest.xml†L4-L14】
- Debug mode allowed for unsigned extensions (`PlayerDebugMode` set to `1`).
- Shell access to create folders or symlinks in the Adobe CEP extensions directory.

## 1) Allow unsigned CEP extensions
Enable debug mode so After Effects will load the panel during development:
- **macOS**: `defaults write com.adobe.CSXS.9 PlayerDebugMode 1`
- **Windows**: add `PlayerDebugMode` (string) with value `1` under `HKEY_CURRENT_USER/Software/Adobe/CSXS.9`.

Restart After Effects after changing the debug flag.

## 2) Link the repository into the CEP extensions directory
Run the helper script to mirror this repo into the OS-specific CEP extensions folder and install the `.debug` file used by the extension’s devtools ports:

```bash
./scripts/setup-cep-environment.sh [optional-extension-folder-name]
The script:

Detects macOS, Windows (Git Bash), or Linux paths for the CEP extensions folder.

Creates a symlink from the repo to that folder (default name: Holy-Expressor-Repo-2).【F:scripts/setup-cep-environment.sh†L25-L50】【F:scripts/setup-cep-environment.sh†L52-L62】

Copies .debug so the remote debugging ports (6904–6908) match the manifest entries.【F:.debug†L3-L27】【F:CSXS/manifest.xml†L19-L62】

You can rerun the script anytime to refresh the symlink or .debug file; it is idempotent.

3) Verify the panel loads
Launch After Effects after enabling PlayerDebugMode.

Open Window → Extensions and choose Holy Expressor, Holy Quick Panel, Holy Expressor Color Picker, or Holy Expressor Full Editor as needed (IDs are defined in CSXS/manifest.xml).【F:CSXS/manifest.xml†L1-L62】

If the panel does not appear, confirm the CEP extensions directory contains the symlinked folder and .debug, then restart After Effects.

4) Optional local HTTP preview
The manifest includes a commented HTTP MainPath you can enable for live preview (e.g., with python -m http.server 8000).【F:CSXS/manifest.xml†L19-L26】 Uncomment the HTTP MainPath entry and restart the panel to load assets over localhost while editing.

5) Remote debugging
Each extension declares a unique remote debugging port (6904–6908). With .debug in place, open the matching port in a Chromium browser to inspect the CEP webview:

http://localhost:6904 for the main panel

http://localhost:6905 for Quick Panel

http://localhost:6906 for Color Picker

http://localhost:6907 for Full Editor

http://localhost:6908 for Log view

These ports come from the .debug file and manifest.xml CEF parameters.【F:.debug†L3-L27】【F:CSXS/manifest.xml†L19-L62】

Codex Development Notes
Agent rules for this project are defined in /AGENTS/AGENTS.md. Reference this file whenever invoking agent logic, decision rules, or documentation-based actions.