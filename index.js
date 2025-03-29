import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import OpenAI from 'openai';

import MCPHost from './mcp/index.js';

import { truncate } from './utils/index.js';

const SYSTEM_MESSAGE_PROMPT = {
  role: 'system',
  content: `You are a helpful assistant-agent who supports your user. You are well acquainted with your tools and resources and use them to solve the user's problems. When asked to complete a task, you perform as many actions autonomously as possible (e.g., logging into a system, opening a file, making a request, etc.). The only exception to this rule is tasks that could be potentially destructive. If you can achieve the goal directly, you return the result. If the task cannot be completed, you explain the reason. Today's date is: ${
    new Date().toISOString().split('T')[0]
  }`
};

const GPT_AGENT_MESSAGE = `
 █▀▀█  █▀▀█ ▀▀█▀▀ 　  █▀▀█  █▀▀█  █▀▀▀  █▄  █ ▀▀█▀▀ 　  █▀▀█  █    ▀█▀ 
▒█░▄▄ ▒█▄▄█ ░▒█░░ 　 ▒█▄▄█ ▒█░▄▄ ▒█▀▀▀ ▒█▒█▒█ ░▒█░░ 　 ▒█░░░ ▒█░░░ ▒█░ 
▒█▄▄█ ▒█░░░ ░▒█░░ 　 ▒█░▒█ ▒█▄▄█ ▒█▄▄▄ ▒█░░▀█ ░▒█░░ 　 ▒█▄▄█ ▒█▄▄█ ▄█▄
`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function prinAndAnimation(prefix, text, delay = 100) {
  process.stdout.write(prefix);
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text[i]);
    await sleep(delay);
  }
  console.log();
}

export default class GPTAgent {
  model;
  openai;
  mcphost = null;
  messages = [];

  constructor({ apiKey, apiModel = 'gpt-3.5-turbo' }) {
    this.model = apiModel;
    this.openai = new OpenAI({ apiKey: apiKey });
    this.mcphost = new MCPHost({ name: 'gpt-mcp-host', version: '1.0.0' });

    console.log('\x1b[32m' + GPT_AGENT_MESSAGE + '\x1b[0m');
  }

  async readConfig(configFilePath = 'agent-config.json') {
    try {
      await fs.access(configFilePath);
    } catch (err) {
      await fs.writeFile(configFilePath, JSON.stringify({ mcpServers: {} }, null, 2), 'utf8');
    }

    try {
      const data = await fs.readFile(configFilePath, 'utf8');
      const { mcpServers } = JSON.parse(data);

      for (const server in mcpServers) {
        await this.mcphost.connect(server, mcpServers[server].command, mcpServers[server].args);
      }
    } catch (err) {
      console.error('Failed init model context protocol:', err);
    }
  }

  async processQuery(query) {
    this.messages.push({ role: 'user', content: query });

    const listTools = await this.mcpTools();

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: this.messages,
      temperature: 0.2,
      tools: listTools
    });

    const finalText = [];
    const toolResults = [];

    for (const choice of response.choices) {
      if (choice.message.role === 'assistant' && choice.finish_reason === 'stop') {
        finalText.push(choice.message.content);
        this.messages.push({
          role: 'assistant',
          content: choice.message.content
        });
      } else if (
        choice.message.role === 'assistant' &&
        (choice.message?.tool_calls?.length || choice.finish_reason === 'tool_calls')
      ) {
        for (const tool of choice.message.tool_calls) {
          if (!tool?.function?.name) {
            continue;
          }

          const toolName = tool.function.name;
          const toolArgs = JSON.parse(tool.function.arguments);

          const toolResult = await this.mcphost.callTool(toolName, toolArgs);

          toolResults.push({ role: 'user', content: toolResult.content });

          finalText.push(
            `\n\x1b[90m • Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}\x1b[0m\n`
          );
        }

        this.messages.push(...toolResults);

        const response = await this.openai.chat.completions.create({
          model: this.model,
          temperature: 0.2,
          messages: this.messages
        });

        this.messages.push({
          role: 'assistant',
          content: response.choices[0].message.content
        });

        finalText.push(
          response.choices[0].message.role === 'assistant' &&
            response.choices[0].finish_reason === 'stop'
            ? response.choices[0].message.content
            : ''
        );
      }
    }

    return finalText.join('\n');
  }

  async mcpTools() {
    const listTools = await this.mcphost.listTools();

    return listTools.map(tool => {
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      };
    });
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.messages = [{ ...SYSTEM_MESSAGE_PROMPT }];

    try {
      console.log('\x1b[90m' + "Type your queries or 'quit/exit' to exit." + '\x1b[0m');

      while (true) {
        const message = await rl.question('\n' + '\x1b[32m' + 'Query: ' + '\x1b[0m');

        if (message.toLowerCase() === 'quit' || message.toLowerCase() === 'exit') {
          break;
        }

        const response = await this.processQuery(message);

        await prinAndAnimation('\n\x1b[34mAssistant:\x1b[0m ', response, 150);
      }
    } catch (err) {
      console.error(err);
    } finally {
      rl.close();
    }
  }

  async chatHistoryView() {
    return this.messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => {
        const role = msg.role === 'user' ? '\x1b[32mUser:\x1b[0m' : '\x1b[34mAssistant:\x1b[0m';
        return `${role} \x1b[90m${msg.content}\x1b[0m`;
      })
      .join('\n');
  }

  async chatHistorySave() {
    const datetime = new Date();

    const timestamp = datetime.toISOString().replace(/[T:.-]/g, '_');

    const filename = `chat_history_${timestamp}.md`;

    const markdownContent = this.messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => {
        const role = msg.role === 'user' ? '**User:**' : '**Assistant:**';
        return `${role} ${msg.content}`;
      })
      .join('\n\n---\n\n');

    await fs.writeFile(filename, markdownContent, 'utf-8');
  }

  async viewMCPTolls() {
    const listTools = await this.mcphost.listTools();

    return listTools.map(tool => {
      return {
        name: tool.name,
        description: truncate(tool.description, 80)
      };
    });
  }

  chatHistoryClear() {
    this.messages = [{ ...SYSTEM_MESSAGE_PROMPT }];
  }

  async cleanup() {
    await this.mcphost.close();
  }
}
