"""触发 DesignAgent 下属 web search 并发调用。"""

from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request


DEFAULT_BASE_URL = "http://127.0.0.1:5050"
DEFAULT_AGENT_ID = "design_agent"


def test_design_agent_stream_smoke() -> None:
    """只触发 DesignAgent 流式接口，返回内容通过其他方式观察。"""

    parser = argparse.ArgumentParser(description="触发 DesignAgent 流式接口。")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--agent-id", default=DEFAULT_AGENT_ID)
    parser.add_argument("--token")
    parser.add_argument("--username")
    parser.add_argument("--password")
    parser.add_argument(
        "--query",
        default="找下黑泽明剧本的特点",
    )
    args, _ = parser.parse_known_args()

    base_url = args.base_url.rstrip("/")
    agent_id = args.agent_id
    token = args.token
    username = args.username
    password = args.password
    query = args.query

    if not token:
        if not username or not password:
            raise AssertionError("请传入 --token，或同时传入 --username 和 --password。")

        login_request = urllib.request.Request(
            f"{base_url}/api/auth/login",
            data=json.dumps(
                {"username": username, "password": password},
            ).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(login_request, timeout=30) as response:
                login_payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise AssertionError(f"登录请求失败：HTTP {exc.code}\n{detail}") from exc
        except urllib.error.URLError as exc:
            raise AssertionError(f"登录请求失败：{exc.reason}") from exc

        token = login_payload.get("access_token")
        if not isinstance(token, str) or not token:
            raise AssertionError("登录响应里没有 access_token。")

    stream_request = urllib.request.Request(
        f"{base_url}/api/chat/agent/{agent_id}/run/stream",
        data=json.dumps(
            {
                "input": query,
                "attachments": [],
                "config": {},
            },
        ).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(stream_request, timeout=None) as response:
            for _ in response:
                pass
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(f"DesignAgent 请求失败：HTTP {exc.code}\n{detail}") from exc
    except urllib.error.URLError as exc:
        raise AssertionError(f"DesignAgent 请求失败：{exc.reason}") from exc


if __name__ == "__main__":
    test_design_agent_stream_smoke()
