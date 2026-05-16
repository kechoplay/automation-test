"""
Writes generated code to a temp file, runs pytest, streams output line-by-line.
Parses final results and updates DB.
"""
import asyncio
import re
import sys
import traceback
import uuid
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
    match = re.search(
        r"(\d+) passed|(\d+) failed|(\d+) error",
        output, re.IGNORECASE
    )
    passed = len(re.findall(r"(\d+) passed", output))
    failed_m = re.findall(r"(\d+) failed", output)
    error_m  = re.findall(r"(\d+) error",  output)

    passed_n = int(re.search(r"(\d+) passed", output).group(1)) if re.search(r"(\d+) passed", output) else 0
    failed_n = int(re.search(r"(\d+) failed", output).group(1)) if re.search(r"(\d+) failed", output) else 0
    error_n  = int(re.search(r"(\d+) error",  output).group(1)) if re.search(r"(\d+) error",  output) else 0
    total = passed_n + failed_n + error_n
    return total, passed_n, failed_n + error_n


async def run_tests(run_id: str, test_case_id: str, generated_code: str):
    """
    Runs in background. Fills _buffers[run_id] with output lines.
    Updates DB when done.
    """
    from web.database import finish_run          # lazy import to avoid circular

    _buffers[run_id] = []
    _done[run_id]    = False

    # Write temp file
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

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(ROOT),
        )

        output_lines: list[str] = []

        while True:
            raw = await proc.stdout.readline()
            if not raw:
                break
            line = raw.decode("utf-8", errors="replace").rstrip()
            _buffers[run_id].append(line)
            output_lines.append(line)

        await proc.wait()
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
