#!/usr/bin/env python3
"""
PlaceX Safety Gate - PreToolUse Lifecycle Hook
Enforces strict execution and file governance policies:
  1. 'deny' on direct writes, edits, deletions, or shell redirections targeting sensitive files (.env, credentials.json, token.json).
  2. 'deny' on destructive shell and git commands (rm -rf, git push --force).
  3. 'deny' on reads of sensitive files (via view_file or command line reference).
  4. 'deny' on live interview, avatar rendering, and watchdog reproduction scripts.
  5. 'allow' on routine development, inspection, and non-live testing.
  6. Fail-safe 'deny' on any unhandled exception or parsing failure.
"""

import datetime
import json
import os
import re
import sys

DENIED_FILE_TARGETS = {".env", "credentials.json", "token.json"}

# High-risk patterns in CommandLine that require explicit user sign-off
LIVE_RUN_KEYWORD_MATCHES = [
    "run_live_brain",
    "render_avatar_clip",
    "reproduce_",
    "reproduce",
    "bot.py",
    "--live",
    "watchdog",
]

# Destructive shell patterns that are unconditionally denied
DESTRUCTIVE_COMMAND_PATTERNS = [
    r"\brm\s+-rf\b",
    r"\bgit\s+push\s+.*--force\b",
    r"\bgit\s+push\s+.*origin\s+main\b",
]

# Explicit shell write / delete verbs targeting sensitive files
EXPLICIT_WRITE_DELETE_VERBS = (
    r"(?:>|>>|\brm\b|\bdel\b|\bremove-item\b|\bset-content\b|\bout-file\b|\btruncate\b)"
)

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hook_invocations.log")


def log_debug(msg: str) -> None:
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as _dbg:
            _dbg.write(f"{datetime.datetime.now().isoformat()} | {msg}\n")
    except Exception:
        pass


def emit_decision(decision: str, reason: str = "") -> None:
    log_debug(f"DECISION EMITTED: decision='{decision}', reason='{reason}'")
    output = {"decision": decision}
    if reason:
        output["reason"] = reason
    print(json.dumps(output))
    sys.exit(0)


def is_sensitive_filename(path_str: str) -> bool:
    normalized = path_str.replace("\\", "/").strip().strip("'\"")
    base_name = os.path.basename(normalized).lower()
    return base_name in DENIED_FILE_TARGETS


def evaluate_pre_tool_use(payload: dict) -> None:
    tool_call = payload.get("toolCall", {})
    tool_name = tool_call.get("name", "")
    args = tool_call.get("args", {})

    # -------------------------------------------------------------------------
    # 1. File Inspection Tool (view_file)
    # -------------------------------------------------------------------------
    if tool_name == "view_file":
        abs_path = str(args.get("AbsolutePath", ""))
        if is_sensitive_filename(abs_path):
            emit_decision(
                "deny",
                f"Inspecting sensitive configuration file '{os.path.basename(abs_path)}' is blocked by safety policy.",
            )
        emit_decision("allow")

    # -------------------------------------------------------------------------
    # 2. File Modification Tools (write_to_file, replace_file_content, etc.)
    # -------------------------------------------------------------------------
    elif tool_name in {"write_to_file", "replace_file_content", "multi_replace_file_content"}:
        target_file = str(args.get("TargetFile", ""))
        if is_sensitive_filename(target_file):
            emit_decision(
                "deny",
                f"Modifying sensitive configuration file '{os.path.basename(target_file)}' is strictly prohibited by safety policy.",
            )
        emit_decision("allow")

    # -------------------------------------------------------------------------
    # 3. Command Execution Tool (run_command)
    # -------------------------------------------------------------------------
    elif tool_name == "run_command":
        cmd = str(args.get("CommandLine", ""))
        cmd_normalized = cmd.replace("\\", "/").lower()

        # A. Unconditional Deny: Destructive Git & Filesystem commands
        for pattern in DESTRUCTIVE_COMMAND_PATTERNS:
            if re.search(pattern, cmd_normalized):
                emit_decision(
                    "deny",
                    f"Destructive shell pattern '{pattern}' is blocked by safety policy.",
                )

        # B. Unconditional Deny: Explicit write/delete verbs or shell redirection targeting sensitive files
        for sensitive_file in DENIED_FILE_TARGETS:
            if re.search(rf"{EXPLICIT_WRITE_DELETE_VERBS}\s*.*{re.escape(sensitive_file)}", cmd_normalized):
                emit_decision(
                    "deny",
                    f"Shell command attempting to overwrite or delete sensitive file '{sensitive_file}' was blocked.",
                )

        # C. Deny: Sensitive filename present anywhere in command line (cat, python -c, open(), etc.)
        for sensitive_file in DENIED_FILE_TARGETS:
            if sensitive_file in cmd_normalized:
                emit_decision(
                    "deny",
                    f"Command references sensitive file '{sensitive_file}'. Blocked by safety policy.",
                )

        # D. Deny: Live Brain runtime, hardware, or reproduction scripts
        is_execution_dir = "execution/" in cmd_normalized or "execution\\" in cmd.lower()
        has_live_keyword = any(kw in cmd_normalized for kw in LIVE_RUN_KEYWORD_MATCHES)

        if (is_execution_dir and has_live_keyword) or "--live" in cmd_normalized or "placex_files/bot.py" in cmd_normalized:
            emit_decision(
                "deny",
                f"Live interview runtime / hardware execution script detected: '{cmd[:80]}...'. Blocked by safety policy.",
            )

        # E. Default Allow: Standard development, linting, and local unit tests
        emit_decision("allow")

    # -------------------------------------------------------------------------
    # 4. Default Fallback for all other tool types
    # -------------------------------------------------------------------------
    emit_decision("allow")


def main() -> None:
    log_debug("HOOK INVOKED")
    try:
        raw_input = sys.stdin.read()
        log_debug(f"RAW STDIN: {raw_input.strip()}")
        if not raw_input.strip():
            emit_decision("allow", "empty input")

        payload = json.loads(raw_input)
        evaluate_pre_tool_use(payload)

    except Exception as e:
        log_debug(f"EXCEPTION IN MAIN: {type(e).__name__}: {str(e)}")
        # Fail-safe: Any hook failure or unhandled exception must require hard deny
        emit_decision(
            "deny",
            f"PlaceX Safety Gate encountered an internal error ({type(e).__name__}: {str(e)}). Failing safe with hard block.",
        )


if __name__ == "__main__":
    main()

