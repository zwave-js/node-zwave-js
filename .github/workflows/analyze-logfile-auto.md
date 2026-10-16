---
on:
  discussion:
    types:
    - created
    - edited
  permissions:
    contents: read
    discussions: write
  reaction: none
  roles: all
  steps:
  - name: Checkout repository
    uses: actions/checkout@v6
    with:
      persist-credentials: false
  - name: Setup bot scripts
    uses: zwave-js/bot-workflows/actions/setup-bot@v1
  - id: extract
    name: Extract log file from discussion body
    uses: actions/github-script@v9
    with:
      github-token: ${{ secrets.BOT_TOKEN }}
      result-encoding: string
      script: |
        const bot = require(`${process.env.BOT_SCRIPTS_DIR}/index.cjs`);
        const extractResult = await bot.extractLogfileInDiscussion({github, context});
        
        if (!extractResult) {
          // No log file required
          core.setOutput("shouldContinue", "false");
          return;
        }
        
        if (extractResult === "ERROR_FETCH" || extractResult === "ERROR_CODE_BLOCK_TOO_LONG" || extractResult === "MISSING_LOGFILE") {
          core.setOutput("shouldContinue", "false");
          await bot.ensureLogfileFeedbackInDiscussion({github, context}, extractResult);
          return;
        }
        
        core.setOutput("shouldContinue", "true");
        return extractResult;
  - env:
      LOGFILE: ${{ steps.extract.outputs.result }}
      SHOULD_CONTINUE: ${{ steps.extract.outputs.shouldContinue }}
    id: feedback
    name: Classify logfile and give feedback
    uses: actions/github-script@v9
    with:
      github-token: ${{ secrets.BOT_TOKEN }}
      result-encoding: string
      script: |
        if (process.env.SHOULD_CONTINUE !== "true") return "SKIP";
        
        const bot = require(`${process.env.BOT_SCRIPTS_DIR}/index.cjs`);
        const classification = bot.classifyLogfile(process.env.LOGFILE);
        console.log('Classification:', classification);
        
        const feedback = bot.classificationToFeedback(classification);
        await bot.ensureLogfileFeedbackInDiscussion({github, context}, feedback);
        
        return feedback;
  - id: changed
    if: steps.feedback.outputs.result == 'OK'
    name: Check whether the logfile changed
    uses: actions/github-script@v9
    with:
      result-encoding: string
      script: |
        const bot = require(`${process.env.BOT_SCRIPTS_DIR}/index.cjs`);
        const changed = bot.logfileChangedByEdit({context});
        if (!changed) console.log("Skipping analysis: the edit did not change the logfile");
        return changed ? "true" : "false";
  - id: gate
    if: steps.feedback.outputs.result == 'OK' && steps.changed.outputs.result == 'true'
    name: Gate agentic analysis
    run: "true"
permissions:
  contents: read
  discussions: read
if: needs.pre_activation.outputs.gate_result == 'success'
network: defaults
imports:
- zwave-js/bot-workflows/workflows/shared/hardening.md@6cc2957100d8ebbcf1c21d9233165642f2868d4d
- zwave-js/bot-workflows/workflows/shared/zwave-log-analysis.md@0fedb405bbe6acb4060d6e31f547994b28892866
safe-outputs:
  add-comment:
    discussions: true
    github-token: ${{ secrets.BOT_TOKEN }}
steps:
- name: Setup bot scripts
  uses: zwave-js/bot-workflows/actions/setup-bot@v1
- id: get_logfile_url
  name: Get logfile URL from discussion
  uses: actions/github-script@v9
  with:
    github-token: ${{ secrets.BOT_TOKEN }}
    result-encoding: string
    script: |
      const bot = require(`${process.env.BOT_SCRIPTS_DIR}/index.cjs`);
      return bot.extractLogfileUrlFromDiscussion({github, context});
- name: Download logfile
  uses: zwave-js/bot-workflows/actions/download-logfile@v1
  with:
    url: ${{ steps.get_logfile_url.outputs.result }}
description: Automatically analyze Z-Wave JS logfiles posted in new discussions
engine: copilot
model: claude-opus-4.8
runs-on-slim: ubuntu-latest
source: zwave-js/bot-workflows/workflows/analyze-logfile-auto.md@124f3a48e884febf74a2abbe457ad76b3c7e901d
timeout-minutes: 30
---
# Z-Wave JS Logfile Analysis

A user opened a GitHub discussion asking for help and attached a Z-Wave JS driver logfile. The logfile has been downloaded to `/tmp/gh-aw/agent/logfile.log` on this runner.

This is the discussion content (sanitized):

"${{ steps.sanitized.outputs.text }}"

Determine what the user wants to know. The discussion follows a support template, so the problem is described in prose spread over sections like "Describe the issue", "Steps to reproduce the behavior" and "Device information". Read all of them. The description of what happens and what the user expected instead is the question to answer, even when the body contains no question mark and nothing phrased as a question. When a node ID is given, the problem is about that node. Screenshots are not available to you, so rely on the surrounding text.

Only when the discussion describes no concrete symptom at all, report the most severe problems you find in the log instead.

Load the logfile with the `loadLogFile` tool, then analyze it thoroughly following your analysis instructions to answer the user's question.

Finally, post your findings as a comment on the discussion using the `add_comment` safe output. You MUST pass `item_number: ${{ github.event.discussion.number }}` explicitly — automatic targeting does not work in this workflow.
