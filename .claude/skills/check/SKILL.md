---
name: check
description: Run lint, typecheck, tests and build for both parts of the repo and report pass or fail for each step.
disable-model-invocation: true
---

Run `scripts/check.sh` from the repo root.

Report one line per step: the step name and PASS or FAIL. On the first failure, show the error output and stop. Do not fix anything unless asked.
