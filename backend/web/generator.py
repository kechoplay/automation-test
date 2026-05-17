"""
Nhận API config từ user → gọi API thật → sinh pytest code.
"""
from __future__ import annotations

import json
import re
import requests


def _to_class_name(url: str, method: str) -> str:
    parts = [p for p in url.rstrip("/").split("/") if p and not p.startswith("http")]
    name = "_".join(parts[-2:]) if len(parts) >= 2 else (parts[-1] if parts else "api")
    name = re.sub(r"[^a-zA-Z0-9]", "_", name)
    return f"Test{method.title()}{name.title().replace('_', '')}"


def _infer_fields(data) -> list[str]:
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return list(data[0].keys())
    if isinstance(data, dict):
        return list(data.keys())
    return []


def generate(url: str, method: str, headers: dict, params: dict, body) -> tuple[str, str | None]:
    """
    Returns (generated_code, error_message).
    error_message is None on success.
    """
    method = method.upper()

    # --- Call the real API ---
    merged_headers = {"Accept": "application/json", **(headers or {})}
    try:
        resp = requests.request(
            method=method,
            url=url,
            headers=merged_headers,
            params=params or {},
            json=body if method in ("POST", "PUT", "PATCH") else None,
            timeout=10,
        )
    except requests.exceptions.ConnectionError:
        return "", f"Không thể kết nối tới {url}"
    except requests.exceptions.Timeout:
        return "", f"API timeout sau 10 giây"
    except Exception as e:
        return "", str(e)

    # --- Parse response ---
    try:
        data = resp.json()
    except Exception:
        data = None

    is_list = isinstance(data, list)
    fields = _infer_fields(data)
    status = resp.status_code
    elapsed = resp.elapsed.total_seconds()
    class_name = _to_class_name(url, method)

    # --- Build test code ---
    effective_headers = {"Accept": "application/json", **(headers or {})}
    headers_repr = json.dumps(effective_headers, ensure_ascii=False)
    params_repr  = json.dumps(params or {},  ensure_ascii=False)
    body_repr    = json.dumps(body,           ensure_ascii=False) if body else "None"
    fields_repr  = json.dumps(fields)

    lines = [
        "import pytest",
        "import requests",
        "",
        f'URL     = {json.dumps(url)}',
        f'METHOD  = {json.dumps(method)}',
        f'HEADERS = {headers_repr}',
        f'PARAMS  = {params_repr}',
        f'BODY    = {body_repr}',
        "",
        "",
        "@pytest.fixture(scope='module')",
        "def response():",
        "    return requests.request(",
        "        method=METHOD, url=URL, headers=HEADERS,",
        "        params=PARAMS,",
        "        json=BODY if METHOD in ('POST', 'PUT', 'PATCH') else None,",
        "        timeout=15,",
        "    )",
        "",
        "",
        "@pytest.fixture(scope='module')",
        "def data(response):",
        "    try:",
        "        return response.json()",
        "    except Exception:",
        "        return None",
        "",
        "",
        f"class {class_name}:",
        "",
        f"    def test_status_code(self, response):",
        f"        assert response.status_code == {status}, (",
        f'            f"Expected {status}, got {{response.status_code}}. Body: {{response.text[:300]}}"',
        f"        )",
        "",
        f"    def test_response_time_under_5s(self, response):",
        f"        assert response.elapsed.total_seconds() < 5.0, (",
        f'            f"Quá chậm: {{response.elapsed.total_seconds():.2f}}s"',
        f"        )",
    ]

    if status < 400:
        lines += [
            "",
            f"    def test_response_is_json(self, response):",
            f"        ct = response.headers.get('Content-Type', '')",
            f"        assert 'json' in ct or response.text.strip().startswith(('{{', '['))",
        ]

        if is_list:
            lines += [
                "",
                f"    def test_response_is_list(self, data):",
                f"        assert isinstance(data, list), f'Expected list, got {{type(data).__name__}}'",
                "",
                f"    def test_list_is_not_empty(self, data):",
                f"        assert len(data) > 0, 'Response list is empty'",
            ]
            if fields:
                lines += [
                    "",
                    f"    def test_each_item_has_required_fields(self, data):",
                    f"        required = {fields_repr}",
                    f"        for i, item in enumerate(data[:5]):",
                    f"            for field in required:",
                    f"                assert field in item, f'Item {{i}} missing field: {{field}}'",
                ]
        elif isinstance(data, dict) and fields:
            lines += [
                "",
                f"    def test_response_has_required_fields(self, data):",
                f"        required = {fields_repr}",
                f"        for field in required:",
                f"            assert field in data, f'Missing field: {{field}}'",
            ]

        if method in ("POST", "PUT", "PATCH") and isinstance(body, dict):
            for key, val in list(body.items())[:3]:
                val_repr = json.dumps(val)
                lines += [
                    "",
                    f"    def test_request_field_{re.sub(chr(91) + r'^a-z0-9' + chr(93), '_', str(key).lower())}_echoed(self, data):",
                    f"        if data and '{key}' in data:",
                    f"            assert data['{key}'] == {val_repr}",
                ]

    lines.append("")
    return "\n".join(lines), None
