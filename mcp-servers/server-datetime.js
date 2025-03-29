import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'datetime-server',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
});

server.tool(
  'get_datetime_for_location',
  'Get the current date and time for time zone of the location',
  {
    location: z.string().describe('Location'),
    timezone: z.string().describe('Time zone of the location')
  },
  async ({ location, timezone }) => {
    try {
      const timezones = Intl.supportedValuesOf('timeZone');

      const response = timezones
        .filter((tz) => timezone.toLocaleLowerCase() === tz.toLocaleLowerCase())
        .map((tz) => {
          const now = new Date();

          const options = {
            timeZone: tz,
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          };

          return `${tz}: ${new Intl.DateTimeFormat('en-US', options).format(
            now
          )}`;
        });

      return {
        content: [
          {
            type: 'text',
            text: `Сurrent date and time for ${location}: ${JSON.stringify(
              response
            )}`
          }
        ]
      };
    } catch (error) {
      console.error('Error in datetime:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'An error occurred while processing the datetime request.'
          }
        ]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Datetime MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
