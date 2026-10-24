#!/bin/sh
. "$(dirname "$0")/../_lib/workspace.sh"
mkdir -p src
printf 'export function listEscalations(db) {\n  return db.query("select * from escalations where status = $1", ["open"]);\n}\n' > src/escalations.js
