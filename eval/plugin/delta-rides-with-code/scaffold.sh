#!/bin/sh
. "$(dirname "$0")/../_lib/workspace.sh"
gw_spec spec-long.md
cp "$GW_FIXTURES/plan-team-calendars.md" docs/plan-team-calendars.md
gw approve docs/spec.md --checkpoint=greenfield-spec-from-idea/accept >/dev/null
gw approve docs/plan-team-calendars.md --checkpoint=brownfield-safe-change-plan/accept >/dev/null
