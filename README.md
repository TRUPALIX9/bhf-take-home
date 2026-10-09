# BHF take-home: Trupal Patel

| Part | Folder | Status |
|---|---|---|
| Next.js assessment (required) | [`nextjs-app/`](nextjs-app/README.md) | Done |
| Python assessment (optional) | [`python-po-parser/`](python-po-parser/README.md) | Done |

![PO Review dashboard](docs/screenshots/list.png)

Both parts use purchase orders as their subject. The Next.js app reviews POs; the Python script turns a vendor PO into a spreadsheet. The folders are independent and each has its own README.

Design notes and dependency graphs: [`docs/DESIGN.md`](docs/DESIGN.md).

Run every check for both parts:

```bash
scripts/check.sh
```

## AI use

Built with Claude Code. The instruction files it used are committed unchanged: [`CLAUDE.md`](CLAUDE.md), [`nextjs-app/CLAUDE.md`](nextjs-app/CLAUDE.md), [`python-po-parser/CLAUDE.md`](python-po-parser/CLAUDE.md), plus one review subagent ([`.claude/agents/brief-reviewer.md`](.claude/agents/brief-reviewer.md)) and one skill that runs the checks ([`.claude/skills/check/SKILL.md`](.claude/skills/check/SKILL.md)).

## Time spent

Next.js: _TBD_. Python: _TBD_.
