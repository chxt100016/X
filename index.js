#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Setup global context ---
const userHome = process.env.HOME || process.env.USERPROFILE;
const dbPath = path.join(userHome, '.x-go-urls.json');
const spinner = ora({ text: 'Processing...', stream: process.stdout });



// --- Main Function ---
async function main() {
  // 1. Initialize database file
  await fs.ensureFile(dbPath);
  const data = await fs.readFile(dbPath, 'utf8');
  if (data === '') {
    await fs.writeJson(dbPath, []);
  }

  // 2. Dynamically register subcommands
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const subcommandsDir = path.join(__dirname, 'sub');
  const commandFiles = await fs.readdir(subcommandsDir);

  // 3. init program
  program
    .name('x')
    .description('X Go URLs CLI - Manage your URLs with tags')
    .version('1.0.0')
  

  for (const file of commandFiles) {
    if (file.endsWith('.js')) {
      const commandModule = await import(path.join(subcommandsDir, file));
      const cmd = commandModule.default;

      program
        .command(cmd.name)
        .description(cmd.description)
        .action(async (...args) => {
          const command = args.pop();
          const options = args.pop();
          const context = { ...options, spinner };
          spinner.start();
          await cmd.action(dbPath, ...args, context);
        });
    }
  }

  // 3. Parse arguments
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