# AWS Lab Environment

CyberLab Studio Pro provides an isolated, stateful AWS-compatible training environment for Labs 03–18. Learners use familiar `aws` CLI command shapes while all state remains inside the authenticated CyberLab lab environment.

## Scope

Supported command families cover the curriculum needs for:

- STS caller identity;
- IAM users, groups, roles, access keys, and inline policies;
- VPCs, subnets, route tables, internet gateways, security groups, and network ACLs;
- EC2 instances, metadata hardening, volumes/snapshots, and patch/security state;
- S3 buckets, objects, permissions, public-access controls, encryption, and versioning;
- logs, audit evidence, flow/security findings, and posture verification.

The exact supported subset is documented in `COMPATIBILITY.md` and tested by the AWS engine suite.

## Stateful behavior

Read commands inspect the learner's persisted environment. Supported mutation commands update that same state, refresh derived resource inventory/findings, and are observable by later read commands. A successful response is therefore not a canned completion signal.

## IAM authorization

Commands are mapped to internal action keys. The permission engine evaluates allow and deny patterns and returns AWS-style access errors when the active lab principal is not authorized.

## Error behavior

Unsupported operations and invalid/missing resources return explicit AWS-style errors such as AccessDenied, InvalidParameter, ResourceNotFound, EntityAlreadyExists, DependencyViolation, or UnsupportedOperation. The terminal records success/failure and output summary in the learner's command history.

## Isolation and safety

- State is owned by one authenticated learner/environment.
- Cross-user environment access is rejected.
- Command text is parsed by the CyberLab AWS registry and never sent to a host shell.
- The default release does not send learner commands to a production AWS account.

The goal is workflow fidelity for the supported curriculum subset: persistent identity/network/compute/storage/security behavior, realistic authorization and error semantics, and server-side verification of the resulting evidence.