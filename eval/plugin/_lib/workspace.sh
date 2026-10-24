#!/bin/sh
# Shared scaffold: local CLI, project context, and optionally a spec fixture.
# Usage (from a case scaffold): . "$(dirname "$0")/../_lib/workspace.sh"; gw_spec spec-short.md
set -e
. "$(dirname "$0")/../_lib/install-cli.sh"
GW_FIXTURES="$(dirname "$0")/../_fixtures"
mkdir -p .groundwork docs
cp "$GW_FIXTURES/context.md" .groundwork/context.md
gw_spec() { cp "$GW_FIXTURES/$1" docs/spec.md; }
gw() { node node_modules/.bin/groundwork "$@"; }
