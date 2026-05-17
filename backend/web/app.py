from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# uvicorn reload=True spawns a worker subprocess that doesn't inherit the
# event loop policy set in run_web.py — must set it here so subprocess picks it up
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from web.database import (
    save_test_case, get_test_case, delete_test_case, move_test_case,
    create_run, get_run, delete_run, get_history,
    create_folder, rename_folder, delete_folder, get_folders_with_cases,
)
from web.generator import generate
from web import runner as test_runner

app = FastAPI(title="AutoTest API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    name: str
    url: str
    method: str = "GET"
    headers: dict = {}
    params: dict = {}
    body: dict | list | str | None = None
    folder_id: str | None = None


class FolderRequest(BaseModel):
    name: str


class MoveRequest(BaseModel):
    folder_id: str | None = None


# ── Folders ───────────────────────────────────────────────────────────────────

@app.get("/api/folders")
async def api_get_folders():
    return get_folders_with_cases()


@app.post("/api/folders")
async def api_create_folder(req: FolderRequest):
    return create_folder(req.name.strip())


@app.put("/api/folders/{fid}")
async def api_rename_folder(fid: str, req: FolderRequest):
    rename_folder(fid, req.name.strip())
    return {"ok": True}


@app.delete("/api/folders/{fid}")
async def api_delete_folder(fid: str):
    delete_folder(fid)
    return {"ok": True}


# ── Test Cases ────────────────────────────────────────────────────────────────

@app.post("/api/generate")
async def api_generate(req: GenerateRequest):
    code, err = generate(req.url, req.method, req.headers, req.params, req.body)
    if err:
        raise HTTPException(status_code=400, detail=err)

    tc_id, created = save_test_case(
        name=req.name,
        url=req.url,
        method=req.method,
        headers=req.headers,
        params=req.params,
        body=req.body,
        generated_code=code,
        folder_id=req.folder_id,
    )
    return {"test_case_id": tc_id, "code": code, "created": created}


@app.get("/api/test-cases/{tc_id}")
async def api_get_test_case(tc_id: str):
    tc = get_test_case(tc_id)
    if not tc:
        raise HTTPException(status_code=404)
    return tc


@app.delete("/api/test-cases/{tc_id}")
async def api_delete_test_case(tc_id: str):
    delete_test_case(tc_id)
    return {"ok": True}


@app.put("/api/test-cases/{tc_id}/move")
async def api_move_test_case(tc_id: str, req: MoveRequest):
    move_test_case(tc_id, req.folder_id)
    return {"ok": True}


# ── Test Runs ─────────────────────────────────────────────────────────────────

@app.post("/api/run/{test_case_id}")
async def api_run(test_case_id: str):
    tc = get_test_case(test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    run_id = create_run(test_case_id)
    asyncio.create_task(
        test_runner.run_tests(run_id, test_case_id, tc["generated_code"])
    )
    return {"run_id": run_id}


@app.get("/api/stream/{run_id}")
async def api_stream(run_id: str):
    async def event_gen():
        sent = 0
        while True:
            lines, done = test_runner.get_buffer(run_id)
            while sent < len(lines):
                yield f"data: {json.dumps(lines[sent])}\n\n"
                sent += 1
            if done:
                run = get_run(run_id)
                payload = json.dumps({
                    "status": run["status"] if run else "error",
                    "total":  run["total"]  if run else 0,
                    "passed": run["passed"] if run else 0,
                    "failed": run["failed"] if run else 0,
                })
                yield f"event: done\ndata: {payload}\n\n"
                break
            await asyncio.sleep(0.2)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})


@app.get("/api/history")
async def api_history():
    return get_history()


@app.get("/api/history/{run_id}/output")
async def api_run_output(run_id: str):
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404)
    return {"output": run["output"]}


@app.delete("/api/history/{run_id}")
async def api_delete_run(run_id: str):
    delete_run(run_id)
    return {"ok": True}


@app.post("/api/history/{run_id}/rerun")
async def api_rerun(run_id: str):
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    tc = get_test_case(run["test_case_id"])
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    new_run_id = create_run(tc["id"])
    asyncio.create_task(
        test_runner.run_tests(new_run_id, tc["id"], tc["generated_code"])
    )
    return {"run_id": new_run_id}
