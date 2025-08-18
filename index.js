#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// --- Setup global context ---
const userHome = process.env.HOME || process.env.USERPROFILE;
const configPath = path.join(userHome, '.x-config.json');
const spinner = ora({ text: 'Processing...', stream: process.stdout });

// --- Main Function ---
async function main() {
  // 1. Initialize database file
  await fs.ensureFile(configPath);
  const data = await fs.readFile(configPath, 'utf8');
  if (data === '') {
    await fs.writeJson(configPath, {});
  }

  // 2. Dynamically register subcommands
  const __dirname = path.dirname(fileURLToPath(import.meta.url));  // This is the current file path
  const subcommandsDir = path.join(__dirname, 'sub');  // Path joining
  const commandFiles = await fs.readdir(subcommandsDir);

  // 3. Init program
  program
    .name('x')
    .description('X Go URLs CLI - Manage your URLs with tags')
    .version('1.0.0');

  for (const file of commandFiles) {
    if (file.endsWith('.js')) {
      const filePath = path.join(subcommandsDir, file);
      const fileURL = pathToFileURL(filePath).href;  // Convert to file:// URL format

      const commandModule = await import(fileURL);  // Use file:// URL
      const cmd = commandModule.default;
      const commandName = cmd.name.split(' ')[0];

      program
        .command(cmd.name)
        .description(cmd.description)
        .action(async (...args) => {
          const command = args.pop();
          const options = args.pop();
          const context = { ...options, spinner };
          spinner.start();
          const config = await fs.readJson(configPath);
          const commandConfig = config[commandName] || {};
          await cmd.action(commandConfig, ...args, context);
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
