#!/bin/sh
# Make `npx @kdowswell/groundwork` resolve to this checkout inside an eval workspace.
# The eval sandbox blocks the npm registry, so the CLI must be installed locally.
# Usage (from a case scaffold): . "$(dirname "$0")/../_lib/install-cli.sh"
GW_ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
mkdir -p node_modules/@kdowswell node_modules/.bin
ln -sfn "$GW_ROOT" node_modules/@kdowswell/groundwork
ln -sfn ../@kdowswell/groundwork/cli/bin/groundwork.mjs node_modules/.bin/groundwork
printf '{"name":"eval-workspace","private":true,"devDependencies":{"@kdowswell/groundwork":"file:%s"}}\n' "$GW_ROOT" > package.json
