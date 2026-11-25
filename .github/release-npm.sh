#!/usr/bin/env bash
# Publish pack/mcurcio-patchbay-<version>.tgz (built by .github/release-build.sh) to the public npm registry.
#   bash .github/release-npm.sh <version> [--dry-run]
# Authentication, in the release job of .github/workflows/ci.yml (permissions: id-token: write):
#   - Trusted publishing (OIDC): npm trades the job's OIDC token for a short-lived publish token, once npmjs.com lists
#     this repository and workflow (ci.yml) as the package's trusted publisher. Needs npm 11.5.1 or newer.
#   - NPM_TOKEN: if that secret is set, it is written to a temporary .npmrc as well. npm tries OIDC first and falls
#     back to the token, so the token is only needed for the first publish (npmjs.com can only name a trusted publisher
#     for a package that exists) and can be deleted afterwards.
# Either way npm signs a provenance statement (publishConfig.provenance in package.json).
# Run by semantic-release's publish step (.releaserc.json). CI's release-dry-run job runs it with --dry-run on every
# push and pull request (npm publish --dry-run: checks the package, sends nothing, needs no token).
# Needs: Node 24 (npm).
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:?usage: .github/release-npm.sh <version> [--dry-run]}"
dry="${2:-}"
registry=https://registry.npmjs.org/
tarball="./pack/mcurcio-patchbay-$version.tgz" # ./ : npm reads pack/x.tgz as a GitHub repository
[ -s "$tarball" ] || { echo "release-npm.sh: no $tarball (run .github/release-build.sh $version first)" >&2; exit 1; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
npmrc="$work/.npmrc"
echo "registry=$registry" > "$npmrc"

if [ "$dry" = --dry-run ]; then
  # Provenance needs a CI provider's OIDC token, which a dry run outside the release job does not have; the dry run
  # checks everything else.
  npm publish "$tarball" --dry-run --userconfig "$npmrc" --provenance=false
  exit 0
fi

npm_version=$(npm --version)
node -e '
  const [a, b] = [process.argv[1], "11.5.1"].map((v) => v.split(".").map(Number));
  const older = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  if (older < 0) { console.error(`release-npm.sh: npm ${process.argv[1]} is older than 11.5.1, which trusted publishing needs`); process.exit(1); }
' "$npm_version"

if [ -n "${NPM_TOKEN:-}" ]; then
  echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" >> "$npmrc"
  echo "release-npm.sh: npm $npm_version, trusted publishing with NPM_TOKEN as the fallback"
else
  echo "release-npm.sh: npm $npm_version, trusted publishing (no NPM_TOKEN set)"
fi
npm publish "$tarball" --userconfig "$npmrc"
