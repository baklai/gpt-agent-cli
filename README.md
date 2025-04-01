# About the Project

This is a simple example of how to use the Model Context Protocol (MCP) with the OpenAI API to create a basic client that operates within a chat context.

# Disclaimer

_**Chat messages are appended and currently the entire conversation is always sent to the server. This can rack up a lot of tokens and cost a lot of money, depending on the length of the conversation, the model you are using, and the size of the context**_

# Limitations

This implementation currently supports only text-type tool responses.

## Project Variables

| Key                | Description    |
| ------------------ | -------------- |
| `OPENAI_API_KEY`   | OpenAI API Key |
| `OPENAI_API_MODEL` | Model name (default: gpt-3.5-turbo)     |

## Example Configuration File for Connecting MCP Servers `agent-config.json`

```json
{
  "mcpServers": {
    "datetime": {
      "command": "node",
      "args": [".\\mcp-servers\\server-datetime.js"]
    },
    "systeminfo": {
      "command": "node",
      "args": [".\\mcp-servers\\server-systeminfo.js"]
    },
    "weather": {
      "command": "node",
      "args": [".\\mcp-servers\\server-weather.js"]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/User/Desktop"
      ]
    }
  }
}
```
