# Main Branch Protection

The `main` branch is the release branch and should be protected with a GitHub branch ruleset.

The current ChatGPT GitHub integration does not have repository-administration permission, so it cannot enable this account setting directly. Apply the following rules in **Repository → Settings → Rules → Rulesets**.

## Recommended ruleset

Create a branch ruleset named **Protect main** and target the branch `main`.

Enable:

- Require a pull request before merging.
- Require at least one approving review for collaborative development.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require status checks to pass.
- Require the Linux validation job and Windows smoke job from `.github/workflows/ci.yml`.
- Block force pushes.
- Block branch deletion.
- Require linear history if your team does not need merge commits.
- Optionally require signed commits when every contributor can sign them.

Do not bypass the ruleset for ordinary development. Keep emergency bypass access limited to repository administrators.

## CI contexts

The release workflow contains:

- `validate` — locked install, dependency audit, Prisma schema/seed, lint, TypeScript, unit/integration tests, two-user E2E, repository release check, and production build.
- `windows-smoke` — Windows dependency install, Prisma/SQLite setup, TypeScript, release E2E, and production build.

Use the actual check names shown by GitHub after the workflow has run once.

## Merge policy

1. Work on a feature/fix branch.
2. Run CI.
3. Open a pull request to `main`.
4. Review changed files and CI output.
5. Merge only when required checks are green.
6. Create releases/tags only from a green `main` commit.

## Why this remains an account setting

Branch protection is enforced by GitHub, not by application source code. Documentation and CI can define the desired policy, but the repository ruleset must be enabled by an owner/admin in GitHub settings.