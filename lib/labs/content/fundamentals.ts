import type { LabContentSeed } from "@/lib/labs/content/types";

export const FUNDAMENTALS_CONTENT: readonly LabContentSeed[] = [
  {
    number: 1,
    focus: "cloud service models, the shared-responsibility boundary, and the way identity, network, compute, storage, and monitoring controls work together instead of operating as isolated checkboxes",
    scenario: "You have joined a small security team that inherited a cloud-hosted application with almost no architecture notes. Before changing anything, you must classify which controls belong to the provider, which belong to the customer, and which evidence would prove that the application is being operated securely.",
    investigate: "Map the persisted training resources to identity, networking, compute, storage, and monitoring, then identify one security responsibility in each area.",
    action: "Build a defensible shared-responsibility map and rank the controls that should be checked first when a new cloud workload is reviewed.",
    verify: "Confirm that every identified risk has an owner, a control, and an evidence source rather than a vague recommendation.",
    expected: "A complete baseline links each cloud layer to a responsibility owner and shows why identity, network exposure, data protection, workload hardening, and logging must be evaluated together.",
    consequence: "Misunderstanding the responsibility boundary leaves gaps that neither the cloud provider nor the customer is actively controlling, which can turn ordinary configuration mistakes into exploitable exposure.",
    mistakes: "Treating the provider as responsible for customer IAM, confusing availability with security, checking only perimeter controls, or naming controls without identifying the evidence that proves they are active.",
    troubleshooting: "If the model feels ambiguous, start from the resource owner: ask who creates the identity, who configures the network rule, who manages the data, and who can retrieve the audit evidence. Use that ownership question to place the responsibility.",
    prerequisites: ["Basic understanding of applications, accounts, networks, and data storage."],
    commands: [
      { command: "UI → Persisted simulator state", purpose: "Inventory the training environment.", explanation: "The state panel is the authoritative local record of resources created for this lab; use it to identify the security domains that need controls." },
      { command: "UI → Tasks → Record progress", purpose: "Document the responsibility mapping in order.", explanation: "Task progress records the learning workflow only; it does not bypass server-side completion validation." },
    ],
  },
  {
    number: 2,
    focus: "identity and access management concepts: principals, authentication, authorization, users, groups, roles, permission scope, explicit deny, and least privilege",
    scenario: "A growing engineering team has accumulated individual permissions that nobody can explain. You must redesign the access model conceptually so that identities receive only the permissions needed for a job function and access can be reviewed without tracing dozens of one-off grants.",
    investigate: "Separate authentication from authorization and classify the available identity concepts into human users, groups, workload roles, and permission policies.",
    action: "Design a least-privilege access path that prefers roles and groups over repeated direct grants and explains where an explicit deny should win over an allow.",
    verify: "Trace a sample request from authenticated principal through role/group membership to an allowed or denied action and confirm the effective permission is explainable.",
    expected: "The final model clearly distinguishes who the principal is, how identity is proven, what policy grants access, where scope applies, and why excessive wildcard permissions should be removed.",
    consequence: "Weak IAM design increases blast radius, makes credential compromise more damaging, and prevents reliable access reviews because effective permissions become difficult to reason about.",
    mistakes: "Assuming authentication automatically grants authorization, using long-lived user credentials for workloads, granting administrator access for convenience, or forgetting that an explicit deny overrides an allow.",
    troubleshooting: "When an access decision is confusing, evaluate it in layers: principal, group or role membership, policy statement, requested action, resource scope, and explicit denies. The first mismatch usually explains the decision.",
    prerequisites: ["Lab 01 concepts: cloud responsibility and resource ownership."],
    commands: [
      { command: "UI → Identity model", purpose: "Classify principals and permission paths.", explanation: "Use the lab scenario to distinguish durable human identities from assumable roles and reusable group-based permission assignments." },
      { command: "UI → Effective-access trace", purpose: "Reason about authorization.", explanation: "Follow a requested action through allow and deny rules to practice the same decision order used by the cloud simulators later in the course." },
    ],
  },
] as const;
