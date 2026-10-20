export type AchievementDefinition = {
  key: string;
  name: string;
  description: string;
  criteria: { type: string; value?: number; labs?: number[]; mode?: string };
};

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  { key: "FIRST_VALIDATED_LAB", name: "Verified Start", description: "Complete your first lab through server-side validation.", criteria: { type: "completion-count", value: 1 } },
  { key: "CLOUD_FOUNDATIONS", name: "Cloud Foundations", description: "Complete both cloud-security foundation labs.", criteria: { type: "lab-set", labs: [1, 2] } },
  { key: "AWS_SECURITY_PATH", name: "AWS Security Path", description: "Complete all AWS labs from IAM through storage security.", criteria: { type: "lab-set", labs: Array.from({ length: 16 }, (_, index) => index + 3) } },
  { key: "AZURE_SECURITY_PATH", name: "Azure Security Path", description: "Complete all Microsoft Entra and Azure security labs.", criteria: { type: "lab-set", labs: [19, 20, 21, 22] } },
  { key: "SOC_INVESTIGATOR", name: "SOC Investigator", description: "Complete all Sentinel, KQL, and Defender XDR investigation labs.", criteria: { type: "lab-set", labs: [23, 24, 25, 26, 27, 28, 29, 30] } },
  { key: "CHALLENGE_VERIFIED", name: "Challenge Verified", description: "Complete at least one lab in Challenge mode through server-side validation.", criteria: { type: "passed-mode", mode: "CHALLENGE" } },
  { key: "CYBERLAB_MASTER", name: "CyberLab Master", description: "Complete and validate all 30 CyberLab Studio Pro labs.", criteria: { type: "completion-count", value: 30 } },
] as const;
