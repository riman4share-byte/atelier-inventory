#!/usr/bin/env python3
"""
ERP sync agent — runs on a machine that can reach BOTH the internet (Supabase)
and ERPNext (localhost or the tailnet). It polls Supabase for pending erp_jobs
and processes them by calling ERPNext locally, so ERPNext never needs a public
URL.

Why this exists: Supabase Edge Functions run in Supabase's cloud and cannot
reach a Tailscale-only ERPNext. This agent bridges the gap without exposing
ERPNext to the internet.

Usage:
    export SUPABASE_URL="https://ofnkpyzmzhxtpwwvrbci.supabase.co"
    export SUPABASE_SERVICE_ROLE_KEY="..."
    export ERP_BASE_URL="http://localhost:8080"   # or the tailnet URL
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

import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ERP_BASE = os.environ.get("ERP_BASE_URL", "http://localhost:8080").rstrip("/")
ERP_KEY = os.environ.get("ERP_API_KEY", "")
ERP_SECRET = os.environ.get("ERP_API_SECRET", "")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "10"))

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


def process_job(job):
    job_id = job["id"]
    log.info(f"Processing job {job_id} ({job['type']})")

    # Mark as processing
    sb_request("PATCH", f"/rest/v1/erp_jobs?id=eq.{job_id}&status=eq.pending",
               {"status": "processing", "attempts": job["attempts"] + 1})

    try:
        if job["type"] == "create_dress_item":
            payload = job["payload"]
            code = payload["code"]
            name = payload["name"]
            description = payload.get("description") or ""
            dress_id = payload.get("dressId")

            # Create the item in ERPNext
            status, data = erp_request("POST", "/api/resource/Item", {
                "item_code": code,
                "item_name": name,
                "description": description,
                "item_group": "Dresses",
                "stock_uom": "Nos",
                "is_stock_item": 1,
            })
            if status < 200 or status >= 300:
                raise RuntimeError(f"ERPNext returned {status}: {json.dumps(data)}")

            # Update the dress record in Supabase
            sb_request("PATCH", f"/rest/v1/dresses?code=eq.{code}", {
                "erp_item_code": code,
                "erp_sync_status": "synced",
                "erp_synced_at": datetime.now(timezone.utc).isoformat(),
            })

            # Log the success
            sb_request("POST", "/rest/v1/erp_sync_log", {
                "entity": "dress",
                "entity_id": dress_id,
                "action": "create",
                "http_status": status,
                "message": f"Created {code}",
            })

            # Mark job as done
            sb_request("PATCH", f"/rest/v1/erp_jobs?id=eq.{job_id}&status=eq.processing",
                       {"status": "done"})
            log.info(f"  Job {job_id} done: created {code} in ERPNext")
        else:
            raise RuntimeError(f"unknown job type: {job['type']}")

    except Exception as e:
        message = str(e)[:500]
        log.error(f"  Job {job_id} failed: {message}")
        run_after = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
        sb_request("PATCH", f"/rest/v1/erp_jobs?id=eq.{job_id}&status=eq.processing",
                   {"status": "pending", "last_error": message, "run_after": run_after})
        sb_request("POST", "/rest/v1/erp_sync_log", {
            "entity": "dress",
            "entity_id": None,
            "action": "error",
            "http_status": None,
            "message": message,
        })


def poll_once():
    now = datetime.now(timezone.utc).isoformat()
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
    # Validate config
    if not SUPABASE_URL or not SERVICE_KEY:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        sys.exit(1)
    if not ERP_KEY or not ERP_SECRET:
        log.error("ERP_API_KEY and ERP_API_SECRET are required")
        sys.exit(1)

    log.info(f"ERP sync agent starting")
    log.info(f"  Supabase: {SUPABASE_URL}")
    log.info(f"  ERPNext:  {ERP_BASE}")
    log.info(f"  Poll interval: {POLL_INTERVAL}s")

    # Test connectivity to both
    s, _ = sb_request("GET", "/rest/v1/erp_jobs?limit=1")
    if s != 200:
        log.error(f"Cannot reach Supabase: {s}")
        sys.exit(1)
    log.info("  Supabase: OK")

    s, _ = erp_request("GET", "/api/method/ping")
    if s != 200:
        log.warning(f"ERPNext ping returned {s} — will retry on next cycle")
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
