import Docker from "dockerode";

export class NetworkManager {
  private docker: Docker;

  constructor(socketPath?: string) {
    this.docker = new Docker(socketPath ? { socketPath } : undefined);
  }

  async createNetwork(name: string): Promise<string> {
    const existing = await this.findNetwork(name);
    if (existing) return existing;

    const network = await this.docker.createNetwork({
      Name: name,
      Driver: "bridge",
      Labels: { "forge.managed": "true" },
    });
    return network.id;
  }

  async removeNetwork(name: string): Promise<void> {
    const networkId = await this.findNetwork(name);
    if (!networkId) return;
    const network = this.docker.getNetwork(networkId);
    await network.remove();
  }

  async connectContainer(networkName: string, containerId: string): Promise<void> {
    const networkId = await this.findNetwork(networkName);
    if (!networkId) throw new Error(`Network ${networkName} not found`);
    const network = this.docker.getNetwork(networkId);
    await network.connect({ Container: containerId });
  }

  async disconnectContainer(networkName: string, containerId: string): Promise<void> {
    const networkId = await this.findNetwork(networkName);
    if (!networkId) return;
    const network = this.docker.getNetwork(networkId);
    await network.disconnect({ Container: containerId });
  }

  private async findNetwork(name: string): Promise<string | null> {
    const networks = await this.docker.listNetworks({
      filters: { name: [name] },
    });
    const match = networks.find((n) => n.Name === name);
    return match?.Id || null;
  }
}
