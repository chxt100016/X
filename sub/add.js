import chalk from 'chalk';
import fs from 'fs-extra';

export default {
  name: 'add <url> [tags...]',
  description: 'Add a new URL with tags.',
  action: async (dbPath, url, tags, context) => {
    context.spinner.text = 'Adding URL...';
    const urls = await fs.readJson(dbPath);

    if (urls.some(item => item.url === url)) {
      context.spinner.fail(chalk.yellow(`URL "${url}" already exists.`));
      return;
    }

    urls.push({ url, tags });
    await fs.writeJson(dbPath, urls, { spaces: 2 });
    context.spinner.succeed(chalk.green(`Successfully added: ${url} (${tags.join(', ')})`));
  }
};