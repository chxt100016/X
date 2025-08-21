#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import yaml from 'js-yaml';

// --- Setup global context ---
const configPath = path.join(process.cwd(), 'x-config.yml');
const spinner = ora({ text: 'Processing...', stream: process.stdout });

// --- Main Function ---
async function main() {
  // 1. Initialize database file
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const configPath = path.join(__dirname, 'x-config.yml');
  
  await fs.ensureFile(configPath);
  const data = await fs.readFile(configPath, 'utf8');
  if (data === '') {
    await fs.writeFile(configPath, yaml.dump({ go: [], query: {} }));
  }

  // 2. Dynamically register subcommands
  const subcommandsDir = path.join(__dirname, 'sub');
  const commandFiles = await fs.readdir(subcommandsDir);

  // 3. Init program
  program
    .name('x')
    .description('X Go URLs CLI - Manage your URLs with tags')
    .version('1.0.0');

  for (const file of commandFiles) {
    if (file.endsWith('.js')) {
      const filePath = path.join(subcommandsDir, file);
      const fileURL = pathToFileURL(filePath).href;

      const commandModule = await import(fileURL);
      const cmd = commandModule.default;
      const commandName = cmd.name.split(' ')[0];

      const commandBuilder = program
        .command(cmd.name)
        .description(cmd.description);

      if (cmd.alias) {
        commandBuilder.alias(cmd.alias);
      }
      
      commandBuilder.action(async (...args) => {
          const command = args.pop();
          const options = args.pop();
          const cliArgs = args;
          const context = { ...options, spinner };
          spinner.start();

          // Consistently pass the config path or the full config object
          if (['add', 'go', 'list', 'timestamp', 'json'].includes(commandName)) {
            // These commands operate on the file or are simple utilities
            await cmd.action(configPath, ...cliArgs, context);
          } else {
            // Commands like 'query' might need the full config object
            const config = yaml.load(await fs.readFile(configPath, 'utf8'));
            await cmd.action(config, ...cliArgs, context);
          }
        });
    }
  }

  // 4. Parse arguments
  await program.parseAsync(process.argv);
}

main().catch(err => {
  if (spinner.isSpinning) {
    spinner.stop();
  }
  // Gracefully exit on user prompt cancellation
  if (err && err.message && err.message.includes('User force closed the prompt')) {
    console.log(chalk.yellow('\nBye!'));
    process.exit(0);
  }
  console.error(chalk.red('Failed to start the application:'), err);
  process.exit(1);
});
