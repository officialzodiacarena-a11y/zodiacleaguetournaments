<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:andy-workflow-rules -->
# PR & State Verification (No Assumptions)

ALWAYS verify the exact state of Git and GitHub (using gh pr status, git log, etc.) before telling the user to interact with a PR or assuming a PR's state. NEVER assume a PR is still open just because you created it recently; the user may have already merged it.
<!-- END:andy-workflow-rules -->

