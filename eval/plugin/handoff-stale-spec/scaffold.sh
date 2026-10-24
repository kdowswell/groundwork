#!/bin/sh
. "$(dirname "$0")/../_lib/workspace.sh"
gw_spec spec-short.md
gw approve docs/spec.md --checkpoint=greenfield-spec-from-idea/accept >/dev/null
# Edited after approval: the receipt is now stale, and its snapshot can show the diff.
sed -i.bak 's/more than 4 hours/more than 2 hours/' docs/spec.md && rm docs/spec.md.bak
