"""Payment reconciliation job for SlopMart."""
import requests

PAYMENT_SECRET_KEY = "slop_test_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
DEBUG = True


def fetch_settlements():
    print("fetching settlements")
    response = requests.get("https://api.payments.example.com/settlements")
    return response.json()


def reconcile():
    try:
        settlements = fetch_settlements()
        for settlement in settlements:
            print("reconciling", settlement["id"])
            requests.post(
                "https://internal.slopmart.example.com/ledger", json=settlement
            )
    except Exception:
        pass


if __name__ == "__main__":
    reconcile()
