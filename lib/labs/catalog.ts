export type LabPlatform =
  | "FUNDAMENTALS"
  | "AWS"
  | "AZURE"
  | "SENTINEL"
  | "KQL"
  | "DEFENDER_XDR";

export type LabDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type LabDefinition = {
  number: number;
  slug: string;
  title: string;
  objective: string;
  platform: LabPlatform;
  difficulty: LabDifficulty;
  estimatedMinutes: number;
};

export const LABS: readonly LabDefinition[] = [
  { number: 1, slug: "cloud-security-fundamentals", title: "Cloud Security Fundamentals", objective: "Understand cloud service models, shared responsibility, identity, networking, compute, storage, and monitoring.", platform: "FUNDAMENTALS", difficulty: "BEGINNER", estimatedMinutes: 35 },
  { number: 2, slug: "cloud-iam-fundamentals", title: "Cloud IAM Fundamentals", objective: "Learn users, groups, roles, authentication, authorization, permissions, and least privilege.", platform: "FUNDAMENTALS", difficulty: "BEGINNER", estimatedMinutes: 40 },
  { number: 3, slug: "aws-iam-users-roles", title: "AWS IAM Users and Roles", objective: "Create and inspect simulated IAM users, groups, roles, trust policies, and attached policies.", platform: "AWS", difficulty: "BEGINNER", estimatedMinutes: 45 },
  { number: 4, slug: "aws-iam-policies-least-privilege", title: "AWS IAM Policies and Least Privilege", objective: "Evaluate JSON policies, allow and deny behavior, resources, actions, and least-privilege findings.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 55 },
  { number: 5, slug: "aws-access-keys-misconfigurations", title: "AWS Access Keys and IAM Misconfigurations", objective: "Investigate simulated access keys, last-used data, credential findings, and excessive permissions.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 50 },
  { number: 6, slug: "aws-vpc-fundamentals", title: "AWS VPC Fundamentals", objective: "Understand VPCs, CIDR ranges, subnets, route tables, internet gateways, and resource relationships.", platform: "AWS", difficulty: "BEGINNER", estimatedMinutes: 50 },
  { number: 7, slug: "aws-subnets-routing", title: "AWS Subnets and Routing", objective: "Create subnets and routes and validate public/private network classifications.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 55 },
  { number: 8, slug: "aws-security-groups", title: "AWS Security Groups", objective: "Analyze inbound/outbound rules, ports, protocols, CIDRs, associations, and exposure.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 55 },
  { number: 9, slug: "aws-network-acls", title: "AWS Network ACLs", objective: "Configure NACL rules, ordering, associations, and ingress/egress evaluation.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 55 },
  { number: 10, slug: "aws-network-exposure-monitoring", title: "AWS Network Exposure and Monitoring", objective: "Use synthetic traffic, flow logs, findings, rejected traffic, and audit events to investigate exposure.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 60 },
  { number: 11, slug: "ec2-instance-security", title: "EC2 Instance Security", objective: "Inspect instance state, security groups, roles, metadata, tags, and hardening posture.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 55 },
  { number: 12, slug: "open-ports-service-exposure", title: "Open Ports and Service Exposure", objective: "Identify exposed services, listening ports, connectivity paths, and security findings.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 50 },
  { number: 13, slug: "patch-management", title: "Patch Management", objective: "Review patch inventory, update status, simulated CVEs, and security findings.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 50 },
  { number: 14, slug: "instance-metadata-compute-hardening", title: "Instance Metadata and Compute Hardening", objective: "Harden metadata access, IMDS configuration, instance roles, and container metadata.", platform: "AWS", difficulty: "ADVANCED", estimatedMinutes: 60 },
  { number: 15, slug: "amazon-s3-security", title: "Amazon S3 Security", objective: "Work with simulated buckets, objects, regions, metadata, versioning, upload, download, and delete operations.", platform: "AWS", difficulty: "BEGINNER", estimatedMinutes: 50 },
  { number: 16, slug: "s3-public-access-permissions", title: "S3 Public Access and Bucket Permissions", objective: "Investigate bucket policies, public access block, object access, IAM interaction, and access-denied behavior.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 60 },
  { number: 17, slug: "encryption-data-protection", title: "Encryption and Data Protection", objective: "Configure encryption, simulated KMS references, versioning, and secure storage settings.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 55 },
  { number: 18, slug: "snapshots-storage-security", title: "Snapshots and Storage Security", objective: "Manage simulated EBS volumes, snapshots, restore operations, lifecycle, retention, and access settings.", platform: "AWS", difficulty: "INTERMEDIATE", estimatedMinutes: 55 },
  { number: 19, slug: "entra-id-identity-security", title: "Microsoft Entra ID and Identity Security", objective: "Investigate users, groups, service identities, group membership, role assignments, and identity findings.", platform: "AZURE", difficulty: "BEGINNER", estimatedMinutes: 50 },
  { number: 20, slug: "azure-iam-permissions", title: "Azure IAM and Permissions", objective: "Use Azure RBAC concepts, role definitions, assignments, scopes, permission evaluation, and audit events.", platform: "AZURE", difficulty: "INTERMEDIATE", estimatedMinutes: 60 },
  { number: 21, slug: "azure-networking-storage-security", title: "Azure Networking and Storage Security", objective: "Secure VNets, subnets, NSGs, storage accounts, containers, public access, and encryption.", platform: "AZURE", difficulty: "INTERMEDIATE", estimatedMinutes: 65 },
  { number: 22, slug: "azure-compute-security-monitoring", title: "Azure Compute Security and Monitoring", objective: "Inspect virtual machines, patch status, network settings, monitoring, and security findings.", platform: "AZURE", difficulty: "INTERMEDIATE", estimatedMinutes: 60 },
  { number: 23, slug: "sentinel-siem-fundamentals", title: "Microsoft Sentinel and SIEM Fundamentals", objective: "Explore workspaces, tables, connectors, alerts, incidents, entities, and investigation timelines.", platform: "SENTINEL", difficulty: "BEGINNER", estimatedMinutes: 55 },
  { number: 24, slug: "sentinel-detection-incident-investigation", title: "Log Ingestion, Detection Rules, and Incident Investigation", objective: "Ingest synthetic events, run analytics rules, generate detections, group alerts, and investigate incidents.", platform: "SENTINEL", difficulty: "ADVANCED", estimatedMinutes: 75 },
  { number: 25, slug: "kql-fundamentals", title: "KQL Fundamentals", objective: "Write and execute KQL subset queries using filtering, projection, ordering, aggregation, and history.", platform: "KQL", difficulty: "BEGINNER", estimatedMinutes: 60 },
  { number: 26, slug: "security-log-investigation-kql", title: "Security Log Investigation with KQL", objective: "Investigate synthetic login, endpoint, network, identity, process, and device events with KQL.", platform: "KQL", difficulty: "ADVANCED", estimatedMinutes: 75 },
  { number: 27, slug: "defender-xdr-threat-detection", title: "Defender XDR and Threat Detection", objective: "Correlate alerts, incidents, devices, users, identities, and threat indicators.", platform: "DEFENDER_XDR", difficulty: "INTERMEDIATE", estimatedMinutes: 60 },
  { number: 28, slug: "execution-defense-evasion", title: "Execution and Defense Evasion", objective: "Analyze synthetic process trees, command execution, endpoint alerts, and timeline correlation.", platform: "DEFENDER_XDR", difficulty: "ADVANCED", estimatedMinutes: 70 },
  { number: 29, slug: "credential-access-privilege-escalation", title: "Credential Access and Privilege Escalation", objective: "Investigate suspicious sign-ins, role changes, endpoint events, identity events, and privilege alerts.", platform: "DEFENDER_XDR", difficulty: "ADVANCED", estimatedMinutes: 75 },
  { number: 30, slug: "lateral-movement-incident-investigation", title: "Lateral Movement and Incident Investigation", objective: "Investigate a multi-stage incident spanning identity, endpoints, network movement, privilege changes, and multiple devices.", platform: "DEFENDER_XDR", difficulty: "ADVANCED", estimatedMinutes: 90 }
] as const;

export function getLabBySlug(slug: string) {
  return LABS.find((lab) => lab.slug === slug);
}
