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
          choices: urls.map(item => ({ name: `${item.tags.join(', ')} (${item.url})`, value: item.url })),
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
      // 创建显示选项，排除用户输入的关键词
      const createDisplayName = (item) => {
        // 将用户输入的关键词转换为小写用于比较
        const userKeywords = keywords.map(kw => kw.toLowerCase());
        
        // 过滤掉匹配用户关键词的标签
        const filteredTags = item.tags.filter(tag => 
          !userKeywords.some(kw => tag.toLowerCase().includes(kw))
        );
        
        // 如果过滤后还有标签，显示过滤后的标签；否则显示原始标签但用不同颜色
        const displayTags = filteredTags.length > 0 
          ? filteredTags.join(', ')
          : chalk.dim(item.tags.join(', '));
        
        return `${chalk.yellow(displayTags)}(${item.url})`;
      };

      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: 'Multiple matches found. Please choose one:',
          choices: matches.slice(0, 5).map(item => ({
            name: createDisplayName(item),
            value: item.url,
          })),
        },
      ]);
      await open(selectedUrl);
    }
  }
};