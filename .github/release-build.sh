#!/usr/bin/env bash
# Build the npm package for one version into pack/ (ignored by git):
#   pack/mcurcio-patchbay-<version>.tgz
#   bash .github/release-build.sh <version>
# The version lives only in the git tag, the GitHub Release and CHANGELOG.md; package.json keeps "version": "0.0.0".
# So the package is built from the tree as committed (pnpm build), then the files `npm pack` would ship are copied to
# a temporary folder, the version is stamped into that copy of package.json, and the copy is packed. The tree's own
# package.json is never written. Then the tarball is checked: its name and version, and every file package.json's
# "exports" names is in it.
# Run by semantic-release's prepare step (.releaserc.json) in the release job of .github/workflows/ci.yml, and on every
# push and pull request by its release-dry-run job.
# Needs: Node 24 (npm), pnpm through corepack, the library's dependencies installed (pnpm install), tar.
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:?usage: .github/release-build.sh <version>}"
out=pack

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

rm -rf "$out"
mkdir -p "$out"

pnpm build

# The files npm would pack from the tree (package.json's "files", plus README, LICENSE and package.json itself).
npm pack --dry-run --json --ignore-scripts |
  node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      for (const f of JSON.parse(s)[0].files) console.log(f.path);
    });
  ' |
  while IFS= read -r file; do
    mkdir -p "$stage/$(dirname "$file")"
    cp -- "$file" "$stage/$file"
  done

npm pkg set --prefix "$stage" version="$version"
npm pack "$stage" --pack-destination "$out" --ignore-scripts

tarball="$out/mcurcio-patchbay-$version.tgz"
[ -s "$tarball" ] || { echo "release-build.sh: npm pack did not write $tarball" >&2; exit 1; }

# The packed package.json says the right name and version, and every path "exports" names is in the tarball.
tar -tzf "$tarball" | node -e '
  const { execFileSync } = require("child_process");
  const [tarball, version] = process.argv.slice(1);
  let listing = "";
  process.stdin.on("data", (d) => (listing += d)).on("end", () => {
    const files = new Set(listing.split("\n").filter(Boolean));
    const pkg = JSON.parse(execFileSync("tar", ["-xzOf", tarball, "package/package.json"], { encoding: "utf8" }));
    const errors = [];
    if (pkg.name !== "@mcurcio/patchbay") errors.push(`name is ${pkg.name}, expected @mcurcio/patchbay`);
    if (pkg.version !== version) errors.push(`version is ${pkg.version}, expected ${version}`);
    const targets = [];
    const walk = (v) => (typeof v === "string" ? targets.push(v) : Object.values(v ?? {}).forEach(walk));
    walk(pkg.exports);
    for (const t of targets) {
      const path = "package/" + t.replace(/^\.\//, "");
      if (!t.includes("*") && !files.has(path)) errors.push(`exports names ${t}, which is not in the tarball`);
    }
    if (errors.length) {
      for (const e of errors) console.error(`release-build.sh: ${e}`);
      process.exit(1);
    }
    console.log(`release-build.sh: ${tarball}: ${pkg.name}@${pkg.version}, ${files.size} files, ${targets.length} export targets present`);
  });
' "$tarball" "$version"
