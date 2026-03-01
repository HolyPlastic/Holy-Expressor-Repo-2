#!/usr/bin/env bash
set -euo pipefail

# Setup helper for Holy Expressor CEP development.
# Creates a symlink from the repo to the Adobe CEP extensions folder
# and installs the .debug file so remote debugging ports match the manifest.

usage() {
  cat <<'USAGE'
Usage: setup-cep-environment.sh [extension-folder-name]

Arguments:
  extension-folder-name  Optional folder name inside the Adobe CEP extensions
                         directory (defaults to Holy-Expressor-Repo-2).

Environment variables:
  APPDATA  Used on Windows to locate the Adobe CEP extensions directory.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
extension_dir_name="${1:-Holy-Expressor-Repo-2}"

platform="$(uname -s)"
case "$platform" in
  Darwin)
    target_root="$HOME/Library/Application Support/Adobe/CEP/extensions"
    ;;
  Linux)
    target_root="$HOME/.config/Adobe/CEP/extensions"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    if [[ -z "${APPDATA:-}" ]]; then
      echo "APPDATA is not set; unable to locate Adobe CEP extensions directory on Windows." >&2
      exit 1
    fi
    target_root="$(cygpath "${APPDATA}\\Adobe\\CEP\\extensions")"
    ;;
  *)
    echo "Unsupported platform: $platform" >&2
    exit 1
    ;;
esac

mkdir -p "$target_root"

ln -sfn "$repo_root" "$target_root/$extension_dir_name"

debug_file_source="$repo_root/.debug"
debug_file_target="$target_root/.debug"
cp "$debug_file_source" "$debug_file_target"

echo "Linked extension to: $target_root/$extension_dir_name"
echo "Installed debug config: $debug_file_target"

echo "Done. Launch After Effects with PlayerDebugMode enabled to use the panel."