import chalk from 'chalk';
import fs from 'fs-extra';

export default {
  name: 'list',
  description: 'List all stored URLs.',
  action: async (dbPath, context) => {
    context.spinner.text = 'Loading URLs...';
    const urls = await fs.readJson(dbPath);
    context.spinner.stop();

    if (urls.length === 0) {
      console.log(chalk.yellow('No URLs stored yet.'));
      return;
    }

    console.log(chalk.bold.cyan('--- Stored URLs ---'));
    urls.forEach(item => {
      console.log(`${chalk.bold(item.url)} - Tags: ${chalk.yellow(item.tags.join(', '))}`);
    });
  }
};