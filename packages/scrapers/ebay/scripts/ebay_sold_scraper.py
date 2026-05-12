#!/usr/bin/env python3
"""
eBay sold-listings scraper using curl-cffi with iPhone Safari TLS fingerprint.

Invoked by the ebay-mcp Node server as a subprocess. Reads a JSON request from
stdin, prints a JSON response to stdout. Errors go to stderr.

Request:  {"query": "...", "days": 90, "grade": "PSA 10" | null, "limit": 60}
Response: {"sales": [{"title": "...", "sold_price": 2774.00, "sold_date": "2026-05-09",
                      "url": "...", "external_id": "..."}], "fetched_at": "..."}

Why curl-cffi + Safari iOS TLS:
  eBay's edge (Akamai Bot Manager) flags datacenter Chrome TLS handshakes.
  iPhone Safari TLS from a residential IP passes cleanly. Verified working
  May 11, 2026 with 53 Mbappé sold rows including the $2,774 May 9 sale.
"""
from __future__ import annotations
import json
import re
import sys
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

try:
    from curl_cffi import requests
except ImportError:
    print(json.dumps({
        "error": "curl-cffi not installed",
        "fix": "pip3 install --user curl-cffi",
    }), file=sys.stderr)
    sys.exit(2)


def fetch_sold_html(query: str, limit: int, retries: int = 2) -> tuple[str, int]:
    """Fetch the eBay sold-listings page HTML for a query."""
    url = (
        "https://www.ebay.com/sch/i.html"
        f"?_nkw={quote_plus(query)}&LH_Sold=1&LH_Complete=1&_ipg={min(limit, 240)}"
    )
    profiles = ["safari17_2_ios", "safari17_0", "safari15_5"]
    last_status = 0
    for attempt in range(retries + 1):
        profile = profiles[attempt % len(profiles)]
        try:
            r = requests.get(
                url,
                impersonate=profile,
                timeout=20,
                headers={
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            )
            last_status = r.status_code
            if r.status_code == 200 and "s-card__price" in r.text:
                return r.text, r.status_code
        except Exception as exc:
            print(f"fetch attempt {attempt + 1} failed: {exc}", file=sys.stderr)
        time.sleep(1 + attempt)
    return "", last_status


TITLE_RE = re.compile(r"class=s-card__title[^>]*>\s*<span[^>]*>([^<]+)</span>", re.I)
PRICE_RE = re.compile(r'class="[^"]*s-card__price[^"]*"[^>]*>\s*([^<]+?)\s*<', re.I)
DATE_RE = re.compile(
    r"Sold\s+Item[^<]*?"
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4})",
    re.I,
)
LINK_RE = re.compile(r'href="(https://www\.ebay\.com/itm/[^"?#]+)', re.I)


def parse_money(text: str) -> float | None:
    m = re.search(r"\$([\d,]+(?:\.\d+)?)", text)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except ValueError:
        return None


def parse_date(text: str) -> str | None:
    """'May 9, 2026' → '2026-05-09'"""
    try:
        dt = datetime.strptime(text.replace(",", "").strip(), "%b %d %Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def extract_external_id(url: str) -> str | None:
    m = re.search(r"/itm/(?:[^/]+/)?(\d+)", url)
    return m.group(1) if m else None


def parse_sold_items(html: str) -> list[dict[str, Any]]:
    """Pair-up titles, prices, and dates by document order."""
    titles = list(TITLE_RE.finditer(html))
    prices = list(PRICE_RE.finditer(html))
    dates = list(DATE_RE.finditer(html))
    links = list(LINK_RE.finditer(html))

    items: list[dict[str, Any]] = []
    for i in range(min(len(titles), len(prices))):
        title_text = titles[i].group(1).strip()
        if title_text.lower().startswith("shop on ebay"):
            continue

        price_text = prices[i].group(1).strip()
        sold_price = parse_money(price_text)
        if sold_price is None:
            continue

        # Date marker that comes after this card's price in document order
        date_iso: str | None = None
        for dm in dates:
            if dm.start() > prices[i].start():
                date_iso = parse_date(dm.group(1))
                break

        # URL marker that comes before this card's title in document order
        url = ""
        external_id = None
        for lm in reversed(links):
            if lm.start() < titles[i].start():
                url = lm.group(1)
                external_id = extract_external_id(url)
                break

        items.append({
            "source": "ebay",
            "external_id": external_id,
            "title": title_text,
            "url": url,
            "sold_price": sold_price,
            "sold_date": date_iso or "",
            "currency": "USD",
            "card": None,
        })
    return items


def filter_by_grade(items: list[dict[str, Any]], grade: str | None) -> list[dict[str, Any]]:
    if not grade:
        return items
    g = grade.upper().strip()
    out = []
    for it in items:
        t = it["title"].upper()
        if g in t:
            # Avoid 'PSA 10' matching 'PSA 9' but allow extra parens / chars
            # Also avoid matching half-grade as the whole grade by chance
            if g == "PSA 9" and ("PSA 9.5" in t or "PSA 10" in t):
                continue
            out.append(it)
    return out


def filter_by_days(items: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
    if not days:
        return items
    cutoff_epoch = time.time() - days * 86400
    out = []
    for it in items:
        ds = it.get("sold_date")
        if not ds:
            # Keep items where the date couldn't be parsed; better than dropping signal
            out.append(it)
            continue
        try:
            dt = datetime.strptime(ds, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if dt.timestamp() >= cutoff_epoch:
                out.append(it)
        except ValueError:
            out.append(it)
    return out


def main() -> int:
    try:
        req = json.load(sys.stdin)
    except Exception as exc:
        print(json.dumps({"error": f"bad JSON request: {exc}"}), file=sys.stdout)
        return 1

    query = req.get("query", "").strip()
    if not query:
        print(json.dumps({"error": "missing 'query'"}), file=sys.stdout)
        return 1

    days = int(req.get("days") or 90)
    grade = req.get("grade")
    limit = int(req.get("limit") or 60)

    html, status = fetch_sold_html(query, limit)
    if not html:
        print(json.dumps({
            "error": "eBay blocked the request",
            "http_status": status,
            "hint": "Try again in 60s; if persistent, rotate to residential proxy.",
        }), file=sys.stdout)
        return 1

    items = parse_sold_items(html)
    items = filter_by_grade(items, grade)
    items = filter_by_days(items, days)

    out = {
        "sales": items,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source": "ebay-sold-scrape",
        "ebay_http_status": status,
    }
    json.dump(out, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
