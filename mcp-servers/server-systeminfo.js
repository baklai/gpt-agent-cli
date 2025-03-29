import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import os from 'os';

const server = new McpServer({
  name: 'system-info-server',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
});

server.tool(
  'get_system_info',
  'Get system information like CPU cores, total memory, and OS type',
  {},
  async () => {
    try {
      const systemInfo = {
        osType: os.type(),
        osPlatform: os.platform(),
        osArch: os.arch(),
        cpuCores: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime()
      };

      return {
        content: [
          {
            type: 'text',
            text: `System Information: ${JSON.stringify(systemInfo, null, 2)}`
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching system info:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'An error occurred while fetching the system information.'
          }
        ]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('OS Info MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
