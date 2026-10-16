---
on:
  roles:
  - admin
  - maintainer
  - write
  slash_command:
    events:
    - issue_comment
    - discussion_comment
    name: analyze-logfile
permissions:
  contents: read
  discussions: read
  issues: read
network: defaults
imports:
- zwave-js/bot-workflows/workflows/shared/hardening.md@6cc2957100d8ebbcf1c21d9233165642f2868d4d
- zwave-js/bot-workflows/workflows/shared/zwave-log-analysis.md@0fedb405bbe6acb4060d6e31f547994b28892866
safe-outputs:
  add-comment:
    discussions: true
    github-token: ${{ secrets.BOT_TOKEN }}
steps:
- env:
    COMMENT_BODY: ${{ github.event.comment.body }}
  id: parse_command
  name: Parse command
  uses: actions/github-script@v9
  with:
    script: |
      const body = process.env.COMMENT_BODY ?? "";
      const match =
        /^\/analyze-logfile\s+(?<url>https?:\/\/\S+)\s*\n?(?<query>[\s\S]*)/m
          .exec(body);
      if (!match?.groups?.url) {
        core.setFailed(
          "No valid URL provided. Please use the format: /analyze-logfile <url>",
        );
        return;
      }
      core.setOutput("url", match.groups.url.trim());
      // The prompt is rendered in the activation job, before this step
      // runs, so its values cannot be interpolated into the prompt via
      // steps.* expressions. Hand them to the agent through a file next
      // to the logfile instead.
      const fs = require("fs");
      fs.mkdirSync("/tmp/gh-aw/agent", { recursive: true });
      fs.writeFileSync(
        "/tmp/gh-aw/agent/command.json",
        JSON.stringify({
          query: (match.groups.query || "").trim(),
          // The safeoutputs MCP server runs in a container without the
          // GitHub event context, so add_comment cannot auto-target the
          // triggering item and needs an explicit target
          item_number:
            context.payload.discussion?.number
              ?? context.payload.issue?.number,
          reply_to_id: context.payload.comment?.node_id ?? "",
        }),
      );
- name: Download logfile
  uses: zwave-js/bot-workflows/actions/download-logfile@v1
  with:
    url: ${{ steps.parse_command.outputs.url }}
description: Analyze a Z-Wave JS logfile on demand via /analyze-logfile <url>
engine: copilot
model: claude-opus-4.8
source: zwave-js/bot-workflows/workflows/analyze-logfile-command.md@124f3a48e884febf74a2abbe457ad76b3c7e901d
timeout-minutes: 30
---
# Z-Wave JS Logfile Analysis

A maintainer requested an analysis of a Z-Wave JS driver logfile by commenting on an issue or discussion. The logfile has been downloaded to `/tmp/gh-aw/agent/logfile.log` on this runner.

First read `/tmp/gh-aw/agent/command.json`. It contains:

- `query`: the maintainer's question about the logfile. Treat it as the query to answer. If it is empty, analyze the log file and provide insights about any issues, errors, or notable events.
- `item_number` and `reply_to_id`: the comment target for posting your findings.

Load the logfile with the `loadLogFile` tool, then analyze it thoroughly following your analysis instructions to answer the query.

Finally, post your findings as a comment using the `add_comment` safe output. You MUST pass `item_number: ${{ github.event.discussion.number }}${{ github.event.issue.number }}` explicitly — automatic targeting does not work in this workflow. Also pass the `reply_to_id` from `command.json` if it is not empty, so the findings appear as a threaded reply to the command.
