import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const NWS_API_BASE = 'https://api.open-meteo.com/v1/forecast';

const server = new McpServer({
  name: 'weather-server',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
});

async function makeNWSRequest(url) {
  const headers = {
    Accept: 'application/json'
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error making request:', error);
    return null;
  }
}

server.tool(
  'get-forecast',
  'Get weather forecast for a location',
  {
    latitude: z.number().min(-90).max(90).describe('Latitude of the location'),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe('Longitude of the location')
  },
  async ({ latitude, longitude }) => {
    try {
      const queryParams = new URLSearchParams({
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        current: 'temperature_2m,wind_speed_10m'
      }).toString();

      const pointsUrl = `${NWS_API_BASE}?${queryParams}`;

      const pointsData = await makeNWSRequest(pointsUrl);

      if (!pointsData) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}.`
            }
          ]
        };
      }

      const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${JSON.stringify(
        pointsData
      )}`;

      return {
        content: [
          {
            type: 'text',
            text: forecastText
          }
        ]
      };
    } catch (error) {
      console.error('Error in get-forecast:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'An error occurred while processing the forecast request.'
          }
        ]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info('Weather MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
