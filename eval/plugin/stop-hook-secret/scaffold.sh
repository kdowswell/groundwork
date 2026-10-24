#!/bin/sh
. "$(dirname "$0")/../_lib/workspace.sh"
mkdir -p src
cat > src/pay.js <<'JS'
const API_KEY = "slop_live_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c";
const BASE = "https://api.example-payments.test/v1";

export async function charge(amountCents) {
  const res = await fetch(`${BASE}/charges`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountCents }),
  });
  if (!res.ok) throw new Error(`charge failed: ${res.status}`);
  return res.json();
}
JS
