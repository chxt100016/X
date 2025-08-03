import open from 'open';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';

export default {
  name: 'go [keywords...]',
  description: 'Open a URL based on keywords.',
  action: async (dbPath, keywords, context) => {
    context.spinner.text = 'Searching...';
    const urls = await fs.readJson(dbPath);
    context.spinner.stop();

    if (urls.length === 0) {
      console.log(chalk.yellow('No URLs stored yet. Use "x add" to add one.'));
      return;
    }

    if (keywords.length === 0) {
      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: 'Which URL do you want to open?',
          choices: urls.map(item => ({ name: `${item.url} (${item.tags.join(', ')})`, value: item.url })),
        },
      ]);
      await open(selectedUrl);
      return;
    }

    const matches = urls.filter(item => 
      keywords.every(kw => 
        item.tags.some(tag => tag.toLowerCase().includes(kw.toLowerCase()))
      )
    );

    if (matches.length === 0) {
      console.log(chalk.red('No matches found.'));
    } else if (matches.length === 1) {
      console.log(chalk.green(`Opening: ${matches[0].url}`));
      await open(matches[0].url);
    } else {
      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: 'Multiple matches found. Please choose one:',
          choices: matches.slice(0, 5).map(item => ({
            name: `${item.url} (${chalk.yellow(item.tags.join(', '))})`,
            value: item.url,
          })),
        },
      ]);
      await open(selectedUrl);
    }
  }
};