import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import dotenv from 'dotenv';

import GPTAgent from './src/index.js';

dotenv.config();

const { OPENAI_API_KEY, OPENAI_API_MODEL } = process.env;

if (!OPENAI_API_KEY) {
  throw new Error('OpenAI API Key is not set');
}

if (!OPENAI_API_MODEL) {
  throw new Error('OpenAI Model is not set');
}

async function main() {
  const gptAgent = new GPTAgent({
    apiKey: OPENAI_API_KEY,
    apiModel: OPENAI_API_MODEL
  });

  try {
    await gptAgent.readConfig();

    while (true) {
      console.log('\n');

      const answer = await select({
        message: chalk.green('Select a menu item'.toUpperCase()),
        choices: [
          {
            name: `${chalk.green('•')} Open the chat`,
            value: async () => {
              console.clear();
              const message = 'GPT AGENT CLI';
              console.log(chalk.green(message));
              await gptAgent.chatLoop();
            }
          },
          {
            name: `${chalk.green('•')} View MCP Tools`,
            value: async () => {
              console.clear();
              const message = 'MCP Tools';
              console.log(`\n${chalk.green(message.toUpperCase())}`);
              const listServers = await gptAgent.viewMCPTolls();
              console.table(listServers);
            }
          },
          {
            name: `${chalk.green('•')} View history of chat`,
            value: async () => {
              console.clear();
              const message = 'History of chat';
              console.log(`\n${chalk.green(message.toUpperCase())}`);
              const messages = await gptAgent.chatHistoryView();
              if (messages.length) {
                console.table(messages);
              } else {
                console.log(chalk.gray('\nNot Found'));
              }
            }
          },
          {
            name: `${chalk.green('•')} Clean a history of chat`,
            value: async () => {
              console.clear();
              gptAgent.chatHistoryClear();
              const message = 'Cleaned a history of chat';
              console.log(`\n${chalk.gray(message)}`);
            }
          },
          {
            name: `${chalk.green('•')} Save a history of chat`,
            value: async () => {
              console.clear();
              await gptAgent.chatHistorySave();
              const message = 'The chat is saved to a file';
              console.log(`\n${chalk.gray(message)}`);
            }
          },
          {
            name: `${chalk.green('•')} Exit the GPT Agent`,
            value: async () => {
              console.clear();
              await gptAgent.cleanup();
              process.exit(0);
            }
          }
        ]
      });

      if (typeof answer === 'function') {
        await answer();
      } else {
        console.error(`Function ${answer} does not exist.`);
      }
    }
  } catch (err) {
    console.clear();
    console.error('Undeclared error:', err);
    process.exit(0);
  }
}

main();
