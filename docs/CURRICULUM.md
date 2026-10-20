# Curriculum

CyberLab Studio Pro ships a versioned curriculum for all 30 labs. Each published learner lab contains a concept explanation, scenario, prerequisites, four ordered tasks, three progressive hints, a complete solution, supported commands or UI actions, expected evidence, verification guidance, common mistakes, troubleshooting, and a summary.

## Curriculum groups

| Labs | Area |
| --- | --- |
| 01–02 | Cloud security and IAM fundamentals |
| 03–18 | AWS identity, network, compute, storage, exposure, and data protection |
| 19–22 | Microsoft Entra ID, Azure RBAC, networking, storage, compute, and monitoring |
| 23–24 | Microsoft Sentinel and SIEM investigation workflows |
| 25–26 | KQL fundamentals and security log investigation |
| 27–30 | Defender XDR threat detection and multi-stage incident investigation |

## Learning modes

### Guided
Concepts, tasks, progressive hints, and complete educational solution are available, subject to administrator policy.

### Practice
Learners perform the workflow themselves while retaining access to curriculum guidance and the solution, subject to administrator policy.

### Challenge
Concepts, hints, and the complete solution are hidden. Server validation is still required for verified completion.

## Task model

Every current curriculum version uses four educational tasks:

1. **Establish the baseline** — inspect evidence before changing anything.
2. **Explain the security risk** — connect the observed state to the security objective.
3. **Perform the supported action** — make the documented change or investigation decision.
4. **Verify and summarize** — prove the final state independently and explain residual risk.

Task progress records learning workflow only. It is capped below verified completion; pressing task buttons cannot issue a completion flag.

## Hints

Each lab contains exactly three progressive hint levels:

- Level 1: evidence orientation.
- Level 2: direction toward the relevant identity/resource/event/setting.
- Level 3: the verification path.

Hints do not contain flags or hidden validator conditions.

## Solutions

Solutions contain:

- problem/scenario;
- central security concept;
- workspace navigation;
- command/query-by-command explanation;
- expected evidence;
- why the action works;
- security consequence;
- independent verification;
- common mistakes;
- troubleshooting;
- final summary.

Opening a solution never marks a lab complete.

## Environment behavior

AWS, Azure, Sentinel, KQL, and Defender XDR lab workflows use isolated learner-owned persisted state and stored training data. Supported operations behave consistently across reads, mutations, findings, history, and validation. Unsupported operations return explicit errors instead of fake success.

The default release does not forward learner commands to a host shell or production cloud account.

## Source of truth

Curriculum seed content lives under `lib/labs/content/` and is materialized into versioned Prisma records by `prisma/seed.ts`. Existing completed environments stay associated with their original version while new workspaces resolve the latest published version.