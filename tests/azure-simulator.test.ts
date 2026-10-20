import { describe, expect, it } from "vitest";
import { AZURE_SUPPORTED_COMMANDS, AzureSimulatorError, createInitialAzureState, executeAzureCommand, parseAzureCommand } from "@/lib/simulators/azure/engine";

describe("Azure CLI parser", () => {
  it("parses nested command groups and quoted options", () => {
    const parsed = parseAzureCommand('az role assignment create --assignee student@cyberlab.local --role "Reader" --scope /subscriptions/demo');
    expect(parsed.group).toBe("role assignment");
    expect(parsed.operation).toBe("create");
    expect(parsed.options.role).toBe("Reader");
  });

  it("rejects non-az commands", () => {
    expect(() => parseAzureCommand("bash -c whoami")).toThrow(AzureSimulatorError);
  });
});

describe("Azure simulator state", () => {
  it("creates deterministic vulnerable training resources and derived findings", () => {
    const state = createInitialAzureState(21);
    expect(state.kind).toBe("azure");
    expect(state.resources.groups[0].name).toBe("cyberlab-rg");
    expect(state.resources.vnets[0].subnets[0].nsgId).toContain("web-nsg");
    expect(state.findings.some((finding) => finding.id.startsWith("AZ-NSG-"))).toBe(true);
    expect(state.findings.some((finding) => finding.id.startsWith("AZ-STG-PUBLIC-"))).toBe(true);
  });

  it("supports account and resource discovery", () => {
    const state = createInitialAzureState(19);
    const account = executeAzureCommand(state, "az account show");
    expect(account.mutated).toBe(false);
    expect(account.output).toMatchObject({ name: "CyberLab Training" });
    const resources = executeAzureCommand(state, "az resource list --resource-group cyberlab-rg");
    expect(Array.isArray(resources.output)).toBe(true);
  });

  it("persists Entra and RBAC mutations in state", () => {
    const state = createInitialAzureState(20);
    const created = executeAzureCommand(state, "az ad user create --user-principal-name analyst@cyberlab.local --display-name Analyst");
    expect(created.mutated).toBe(true);
    const user = state.identities.users.find((entry) => entry.userPrincipalName === "analyst@cyberlab.local");
    expect(user).toBeTruthy();
    executeAzureCommand(state, "az role assignment create --assignee analyst@cyberlab.local --role Reader");
    expect(state.rbac.assignments.some((assignment) => assignment.principalId === user?.id && assignment.role === "Reader")).toBe(true);
  });

  it("creates network resources and recalculates exposure findings", () => {
    const state = createInitialAzureState(21);
    executeAzureCommand(state, "az network nsg create --resource-group cyberlab-rg --name private-nsg");
    executeAzureCommand(state, "az network nsg rule create --resource-group cyberlab-rg --nsg-name private-nsg --name DenyInternet --priority 100 --access Deny --source-address-prefix 0.0.0.0/0 --destination-port-range 22");
    const nsg = state.resources.nsgs.find((entry) => entry.name === "private-nsg");
    expect(nsg?.rules[0].access).toBe("Deny");
    expect(state.resourceInventory.some((entry) => entry.id.includes("private-nsg"))).toBe(true);
  });

  it("hardens storage and removes its initial public/TLS/HTTPS findings", () => {
    const state = createInitialAzureState(21);
    executeAzureCommand(state, "az storage container set-permission --account-name cyberlabstore --name evidence --public-access off");
    executeAzureCommand(state, "az storage account update --name cyberlabstore --allow-blob-public-access false --https-only true --min-tls-version TLS1_2");
    expect(state.findings.some((finding) => finding.id.includes("cyberlabstore"))).toBe(false);
  });

  it("updates VM monitoring and patch posture", () => {
    const state = createInitialAzureState(22);
    executeAzureCommand(state, "az vm update --resource-group cyberlab-rg --name web-vm --monitoring-enabled true --missing-critical 0 --missing-security 0");
    const vm = state.resources.vms[0];
    expect(vm.monitoringEnabled).toBe(true);
    expect(vm.patchStatus.missingCritical).toBe(0);
    expect(state.findings.some((finding) => finding.resourceId === vm.id)).toBe(false);
  });

  it("enforces denied actions before mutations", () => {
    const state = createInitialAzureState(20);
    state.principal.deniedActions.push("Microsoft.Authorization/roleAssignments/write");
    try {
      executeAzureCommand(state, "az role assignment create --assignee student@cyberlab.local --role Reader");
      throw new Error("Expected AuthorizationFailed");
    } catch (error) {
      expect(error).toBeInstanceOf(AzureSimulatorError);
      expect((error as AzureSimulatorError).code).toBe("AuthorizationFailed");
    }
    expect(state.rbac.assignments).toHaveLength(1);
  });

  it("returns explicit unsupported-operation errors", () => {
    const state = createInitialAzureState(21);
    try {
      executeAzureCommand(state, "az network watcher list");
      throw new Error("Expected UnsupportedOperation");
    } catch (error) {
      expect(error).toBeInstanceOf(AzureSimulatorError);
      expect((error as AzureSimulatorError).code).toBe("UnsupportedOperation");
    }
  });

  it("publishes a broad command compatibility registry", () => {
    expect(AZURE_SUPPORTED_COMMANDS).toContain("ad user.list");
    expect(AZURE_SUPPORTED_COMMANDS).toContain("role assignment.create");
    expect(AZURE_SUPPORTED_COMMANDS).toContain("network nsg rule.create");
    expect(AZURE_SUPPORTED_COMMANDS).toContain("storage account.update");
    expect(AZURE_SUPPORTED_COMMANDS).toContain("vm.get-instance-view");
    expect(AZURE_SUPPORTED_COMMANDS.length).toBeGreaterThan(25);
  });
});
