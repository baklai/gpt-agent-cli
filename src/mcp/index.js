import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export default class MCPHost {
  name;
  version;
  mcpclients = [];
  mcpservers = {};

  constructor({ name, version }) {
    this.name = name;
    this.version = version;
  }

  async connect(name, command, args) {
    try {
      const mcpClient = new Client(
        { name: `mcp-client-for-${name}`, version: '1.0.0' },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {}
          }
        }
      );
      const transport = new StdioClientTransport({
        command: command,
        args: args
      });
      mcpClient.connect(transport);
      const listTools = await mcpClient.listTools();
      this.mcpclients.push(mcpClient);
      console.log(
        '\x1b[90m' +
          `Connected to MCP Server: ${name}` +
          ' ' +
          `(${listTools.tools.length} tools)` +
          '\x1b[0m'
      );
    } catch (err) {
      console.error('\x1b[31m' + 'Failed to connect to MCP Server:' + '\x1b[0m', name);
    }
  }

  async callTool(name, args) {
    for (let i = 0; i < this.mcpclients.length; i++) {
      const listTools = await this.mcpclients[i].listTools();

      const tool = listTools.tools.find(tool => tool.name === name);

      if (tool) {
        return await this.mcpclients[i].callTool({
          name: name,
          arguments: args
        });
      }
    }

    return '';
  }

  async listTools() {
    const toolPromises = this.mcpclients.map(mcpclient => mcpclient.listTools());

    const listTools = await Promise.all(toolPromises);

    return listTools.flatMap(obj => obj.tools);
  }

  async close() {
    for (const mcpclient of this.mcpclients) {
      await mcpclient.close();
    }

    this.mcpclients = [];
  }
}
