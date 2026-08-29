// Sandbox-execution die. An executor owns all access to a bounty's repo — preparing it,
// building context, applying a patch, running its tests — so that untrusted bounty code runs
// in an isolated sandbox, NEVER on the Leader's machine.
//
// The only admitted carrier runs in a remote GitHub Actions sandbox. There is deliberately
// no local executor, implicit carrier, or unsafe fallback.
export { githubActionsExecutor } from "./github-actions-executor.mjs";
