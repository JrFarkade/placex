# PlaceX — GitHub MCP Setup Specification

**Document ID**: `directives/shared/mcp_setup.md`  
**Status**: Active  
**Scope**: Workspace Tool Integration & Remote MCP Configuration  

---

## 1. Overview

This directive outlines the standard configuration for integrating the GitHub MCP server into the Antigravity orchestration environment for PlaceX.

Due to known Docker daemon and Store installer issues in local environments, PlaceX uses a **manual configuration pattern** via `mcp_config.json`.

---

## 2. Configuration Schema & Key Standard

Antigravity expects the **`serverUrl`** key (not `url`) for HTTP/SSE-based remote MCP servers.

### `mcp_config.json` (Workspace Root)

```json
{
  "mcpServers": {
    "github": {
      "serverUrl": "https://api.githubcopilot.com/mcp"
    }
  }
}
```

---

## 3. Protocol & Permissions

* **Permission Policy (`mcp(*)`)**: Connecting to external MCP tools and issuing queries/actions against remote repositories requires explicit user confirmation prior to initial connection/execution.
* **Tool Discovery**:
  * `search_code`, `search_issues`, `search_pull_requests`
  * `list_issues`, `list_pull_requests`, `list_branches`
  * `create_or_update_file`, `create_pull_request`, `issue_write`
* **Best Practices**:
  * Always invoke `get_me` upon connecting to verify current identity and scopes.
  * Use pagination (5–10 items per batch) and `minimal_output: true` for low-token footprint.
