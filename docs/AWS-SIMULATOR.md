# Phase 5 — Native AWS Simulator

CyberLab Studio Pro includes a native, stateful AWS-style training simulator for AWS labs. It is not a full AWS emulator and it never forwards commands to the host shell or a real AWS account.

## Architecture

The simulator is split into:

- a quote-aware AWS CLI parser
- a command registry/dispatcher
- an IAM-style simulated permission check
- persisted AWS account state inside the authenticated student's lab environment
- service handlers for identity, networking, compute, storage, logs, and findings
- derived security findings and resource inventory
- terminal-history persistence
- an explicit compatibility matrix and tests

Every mutating command changes the student's actual stored simulator state. Describe/list/read commands return data from that state. Unsupported operations return `UnsupportedOperation` rather than a fabricated successful response.

## Implemented service families

### STS

- caller identity

### IAM

- users and groups
- roles and trust policy documents
- access keys and status
- inline user policies
- wildcard-permission security findings
- explicit simulated allow/deny action evaluation

### EC2 / VPC networking

- VPCs and subnets
- route tables/routes
- internet gateways
- security groups and ingress rules
- network ACLs and entries
- VPC flow-log metadata

### EC2 compute and storage

- instances and instance state
- security-group association state
- metadata options / IMDS hardening
- simulated patch inventory
- EBS volume inventory
- snapshot creation and inspection

### S3 / S3API

- buckets
- objects
- object upload/read/delete/list
- versioning
- bucket policy
- public-access block
- default encryption

### Logs and findings

- log-group discovery
- log-event filtering
- CloudTrail-style audit records for simulator mutations
- Security Hub-style findings derived from current simulator state

## Error model

Supported AWS-style error codes include:

- `AccessDenied`
- `InvalidParameter`
- `InvalidParameterValue`
- `ResourceNotFound`
- `EntityAlreadyExists`
- `DependencyViolation`
- `UnsupportedOperation`

Simulator errors are persisted to terminal history with a non-zero CLI-style exit code.

## Isolation and persistence

AWS state is stored under the Phase 4 `(user, lab, version)` environment boundary. A student can mutate only their own environment. Tests run two users against the same AWS lab and verify that a change made by one student is absent from the other student's state.

Reset recreates the deterministic AWS initial state for that published lab version.

## Compatibility

The machine-readable matrix is `lib/simulators/aws/compatibility.ts` and the in-app human-readable matrix is available at `/docs/aws-compatibility`.

The matrix distinguishes `supported` from `partial` behavior. CyberLab does not claim full AWS CLI/API compatibility.

## Examples

```text
aws sts get-caller-identity
aws iam list-users
aws ec2 describe-vpcs
aws ec2 describe-security-groups
aws ec2 revoke-security-group-ingress --group-id sg-00000001 --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 modify-instance-metadata-options --instance-id i-00000001 --http-tokens required
aws s3api list-buckets
aws s3api put-bucket-encryption --bucket cyberlab-8-training-bucket --algorithm AES256
aws securityhub get-findings
```
