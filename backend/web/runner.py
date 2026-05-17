"""
Writes generated code to a temp file, runs pytest, streams output line-by-line.
Parses final results and updates DB.
"""
from __future__ import annotations

import asyncio
import re
import subprocess
import sys
import threading
import traceback
from pathlib import Path

ROOT = Path(__file__).parent.parent          # D:\Work\automation-test
TEMP_DIR = ROOT / "tests" / "_generated"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# In-memory buffer per run_id: list of output lines + done flag
_buffers: dict[str, list[str]] = {}
_done:    dict[str, bool]      = {}


def get_buffer(run_id: str) -> tuple[list[str], bool]:
    return _buffers.get(run_id, []), _done.get(run_id, False)


def _parse_results(output: str) -> tuple[int, int, int]:
    """Extract total/passed/failed from pytest summary line."""
    passed_n = int(re.search(r"(\d+) passed", output).group(1)) if re.search(r"(\d+) passed", output) else 0
    failed_n = int(re.search(r"(\d+) failed", output).group(1)) if re.search(r"(\d+) failed", output) else 0
    error_n  = int(re.search(r"(\d+) error",  output).group(1)) if re.search(r"(\d+) error",  output) else 0
    total = passed_n + failed_n + error_n
    return total, passed_n, failed_n + error_n


async def run_tests(run_id: str, test_case_id: str, generated_code: str):
    """
    Runs pytest in a background thread (avoids asyncio subprocess issues on Windows).
    Streams output via asyncio.Queue into _buffers[run_id].
    """
    from web.database import finish_run          # lazy import to avoid circular

    _buffers[run_id] = []
    _done[run_id]    = False

    file_name = f"test_gen_{run_id[:8]}.py"
    test_file = TEMP_DIR / file_name

    try:
        test_file.write_text(generated_code, encoding="utf-8")

        cmd = [
            sys.executable, "-m", "pytest",
            str(test_file),
            "-v", "--tb=short", "--no-header",
            "--color=no",
        ]

        queue: asyncio.Queue[str | None] = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def _reader():
            # Runs in a daemon thread — reads pytest stdout line by line
            try:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    cwd=str(ROOT),
                )
                for raw in proc.stdout:
                    line = raw.decode("utf-8", errors="replace").rstrip()
                    loop.call_soon_threadsafe(queue.put_nowait, line)
                proc.wait()
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, f"[ERROR] {e}")
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

        threading.Thread(target=_reader, daemon=True).start()

        output_lines: list[str] = []
        while True:
            line = await queue.get()
            if line is None:
                break
            _buffers[run_id].append(line)
            output_lines.append(line)

        full_output = "\n".join(output_lines)
        total, passed, failed = _parse_results(full_output)
        status = "passed" if failed == 0 and total > 0 else "failed"
        finish_run(run_id, status, total, passed, failed, full_output)

    except Exception as e:
        err_line = f"[ERROR] {e}\n{traceback.format_exc()}"
        _buffers[run_id].append(err_line)
        finish_run(run_id, "error", 0, 0, 0, err_line)

    finally:
        _done[run_id] = True
        if test_file.exists():
            test_file.unlink()
