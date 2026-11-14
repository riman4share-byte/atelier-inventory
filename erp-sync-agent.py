#!/usr/bin/env python3
"""
ERP sync agent - runs on a machine that can reach BOTH the internet (Supabase)
and ERPNext (localhost or the tailnet). It polls Supabase for pending erp_jobs
and processes them by calling ERPNext locally, so ERPNext never needs a public
URL.

Why this exists: Supabase Edge Functions run in Supabase's cloud and cannot
reach a Tailscale-only ERPNext. This agent bridges the gap without exposing
ERPNext to the internet.

Usage:
    export SUPABASE_URL="https://ofnkpyzmzhxtpwwvrbci.supabase.co"
    export SUPABASE_SERVICE_ROLE_KEY="..."
    export ERP_BASE_URL="http://localhost:8080"
    export ERP_API_KEY="..."
    export ERP_API_SECRET="..."
    python3 erp-sync-agent.py

Run as a systemd service (see erp-sync-agent.service) so it starts on boot.
"""
import os
import sys
import time
import json
import logging
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ERP_BASE = os.environ.get("ERP_BASE_URL", "http://localhost:8080").rstrip("/")
ERP_KEY = os.environ.get("ERP_API_KEY", "")
ERP_SECRET = os.environ.get("ERP_API_SECRET", "")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "10"))

# ---------------------------------------------------------------------------
# The atelier's own ERPNext item groups, one per app category.
#
# These are the groups that already exist in the real ERPNext catalogue
# ("Wedding (Bridal)", "Party (Evening)", "Milka (Engagement)",
# "Veil (Tarha)"). They are read from the environment so the owner can point
# a category somewhere else without touching the code.
# ---------------------------------------------------------------------------
ITEM_GROUP_WEDDING = os.environ.get("ERP_GROUP_WEDDING", "Wedding (Bridal)")
ITEM_GROUP_PARTY = os.environ.get("ERP_GROUP_PARTY", "Party (Evening)")
ITEM_GROUP_ENGAGEMENT = os.environ.get("ERP_GROUP_ENGAGEMENT", "Milka (Engagement)")
ITEM_GROUP_VEIL = os.environ.get("ERP_GROUP_VEIL", "Veil (Tarha)")
ITEM_GROUP_JUMPSUIT = os.environ.get("ERP_GROUP_JUMPSUIT", "Dresses")

CATEGORY_GROUPS = {
    "wedding": ITEM_GROUP_WEDDING,
    "party": ITEM_GROUP_PARTY,
    "engagement": ITEM_GROUP_ENGAGEMENT,
    "veil": ITEM_GROUP_VEIL,
    "jumpsuit": ITEM_GROUP_JUMPSUIT,
}
DEFAULT_ITEM_GROUP = os.environ.get("ERP_GROUP_DEFAULT", "Dresses")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("erp-sync-agent")


def sb_headers():
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def sb_request(method, path, body=None):
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=sb_headers())
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"message": raw.decode(errors="replace")}
    except Exception as e:
        return 0, {"message": str(e)}


def erp_request(method, path, body=None):
    url = f"{ERP_BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Authorization": f"token {ERP_KEY}:{ERP_SECRET}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"message": raw.decode(errors="replace")}
    except Exception as e:
        return 0, {"message": str(e)}


def item_group_for(category):
    """The ERPNext item group for an app category."""
    if not category:
        return DEFAULT_ITEM_GROUP
    return CATEGORY_GROUPS.get(str(category).strip().lower(), DEFAULT_ITEM_GROUP)


def find_item_by_code_prefix(code):
    """
    Find an item the app has already created, by the app's code prefix.

    Frappe's filter syntax wants a DOUBLE-nested array
    ( [["field","=","value"]] ). A single-level one is silently wrong: the
    request 404s and the agent creates a duplicate every time it syncs.

    The match is on the code prefix rather than the whole name, so an item
    whose name was edited by hand in ERPNext is still found.
    """
    if not code:
        return None
    filters = json.dumps([["item_name", "like", f"{code}%"]])
    quoted = quote(filters, safe="")
    status, data = erp_request(
        "GET",
        f"/api/resource/Item?filters={quoted}&limit_page_length=1"
        f"&fields=%5B%22item_code%22%2C%22item_name%22%5D",
    )
    if status == 200 and isinstance(data, dict):
        items = data.get("data") or []
        return items[0] if items else None
    return None


def process_job(job):
    job_id = job["id"]
    payload = job.get("payload") or {}
    code = payload.get("code")
    name = payload.get("name")
    description = payload.get("description") or ""
    dress_id = payload.get("dressId")
    category = payload.get("category")
    group = item_group_for(category)

    log.info(f"Processing job {job_id} ({job.get('type')}) - {code} -> group '{group}'")

    # Claim the job. The status filter means a job is only ever worked on
    # by one process, even if the cloud function and this agent overlap.
    status, _ = sb_request(
        "PATCH",
        f"/rest/v1/erp_jobs?id=eq.{job_id}&status=eq.pending",
        {"status": "processing", "attempts": (job.get("attempts") or 0) + 1},
    )
    if status not in (200, 204):
        log.info(f"  Job {job_id} was claimed by someone else; skipping.")
        return

    try:
        if job.get("type") != "create_dress_item":
            raise RuntimeError(f"unknown job type: {job.get('type')}")

        # ERPNext gives every item its own code from its naming series
        # ("RAW-2026-00081"). The code the app wants cannot be forced, so the
        # app's code goes into the item NAME - which is how the atelier's
        # own catalogue is written ("WD-", "PD-" prefixes) and what staff
        # search by.
        item_name = f"{code} {name}".strip() if code else name

        existing = find_item_by_code_prefix(code)
        if existing:
            # Already there: update it rather than fail.
            item_code = existing["item_code"]
            status, data = erp_request(
                "PUT",
                f"/api/resource/Item/{quote(item_code)}",
                {
                    "description": description,
                    "item_group": group,
                    "stock_uom": "Nos",
                    "is_stock_item": 1,
                },
            )
            if status < 200 or status >= 300:
                raise RuntimeError(f"ERPNext returned {status}: {json.dumps(data)}")
            action = "update"
            log.info(f"  Updated existing item {item_code} ({item_name})")
        else:
            status, data = erp_request("POST", "/api/resource/Item", {
                "item_name": item_name,
                "description": description,
                "item_group": group,
                "stock_uom": "Nos",
                "is_stock_item": 1,
            })
            if status < 200 or status >= 300:
                raise RuntimeError(f"ERPNext returned {status}: {json.dumps(data)}")
            item_code = (data or {}).get("data", {}).get("item_code")
            if not item_code:
                raise RuntimeError(f"ERPNext did not return an item code: {json.dumps(data)}")
            action = "create"
            log.info(f"  Created item {item_code} ({item_name}) in '{group}'")

        # Store the code ERPNext really gave, not the one we asked for.
        sb_request("PATCH", f"/rest/v1/dresses?code=eq.{code}", {
            "erp_item_code": item_code,
            "erp_sync_status": "synced",
            "erp_synced_at": datetime.now(timezone.utc).isoformat(),
        })

        sb_request("POST", "/rest/v1/erp_sync_log", {
            "entity": "dress",
            "entity_id": dress_id,
            "action": action,
            "http_status": status,
            "message": f"{action.capitalize()} {item_code} ({item_name}) in {group}",
        })

        sb_request(
            "PATCH",
            f"/rest/v1/erp_jobs?id=eq.{job_id}&status=eq.processing",
            {"status": "done", "last_error": None},
        )
        log.info(f"  Job {job_id} done.")

    except Exception as e:
        message = str(e)[:500]
        log.error(f"  Job {job_id} failed: {message}")
        run_after = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
        sb_request(
            "PATCH",
            f"/rest/v1/erp_jobs?id=eq.{job_id}&status=eq.processing",
            {"status": "pending", "last_error": message, "run_after": run_after},
        )
        sb_request("POST", "/rest/v1/erp_sync_log", {
            "entity": "dress",
            "entity_id": dress_id,
            "action": "error",
            "http_status": None,
            "message": message,
        })


def utc_now_iso():
    """
    The current time as an RFC 3339 UTC timestamp ending in Z.

    The Z matters. `datetime.isoformat()` on a UTC-aware datetime writes the
    offset as "+00:00", and the "+" in a URL query string is decoded as a
    space. PostgREST then reads "2026-11-14T06:58:54 00:00" and rejects it
    with 400 "invalid input syntax for type timestamp with time zone". The
    agent looked like it was running and silently fetched nothing at all.
    """
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def poll_once():
    # quote() as well as the Z: belt and braces for any future format.
    now = quote(utc_now_iso())
    status, jobs = sb_request(
        "GET",
        f"/rest/v1/erp_jobs?status=eq.pending&run_after=lte.{now}&order=created_at&limit={BATCH_SIZE}",
    )
    if status != 200:
        log.error(f"Failed to fetch jobs: {status} {jobs}")
        return
    if not jobs:
        return
    log.info(f"Found {len(jobs)} pending job(s)")
    for job in jobs:
        process_job(job)


def main():
    if not SUPABASE_URL or not SERVICE_KEY:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        sys.exit(1)
    if not ERP_KEY or not ERP_SECRET:
        log.error("ERP_API_KEY and ERP_API_SECRET are required")
        sys.exit(1)

    log.info("ERP sync agent starting")
    log.info(f"  Supabase: {SUPABASE_URL}")
    log.info(f"  ERPNext:  {ERP_BASE}")
    log.info(f"  Poll interval: {POLL_INTERVAL}s")
    log.info(f"  Item groups: {json.dumps(CATEGORY_GROUPS)}")

    s, _ = sb_request("GET", "/rest/v1/erp_jobs?limit=1")
    if s != 200:
        log.error(f"Cannot reach Supabase: {s}")
        sys.exit(1)
    log.info("  Supabase: OK")

    s, _ = erp_request("GET", "/api/method/ping")
    if s != 200:
        log.warning(f"ERPNext ping returned {s} - will retry on next cycle")
    else:
        log.info("  ERPNext: OK")

    while True:
        try:
            poll_once()
        except Exception as e:
            log.error(f"Poll cycle failed: {e}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
