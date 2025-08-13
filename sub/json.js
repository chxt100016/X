
import chalk from 'chalk';

const action = (dbPath, str, context) => {
  const { spinner } = context;
  spinner.stop(); // Stop the spinner to print the output

  if (!str) {
    console.error(chalk.red('Error: Please provide a JSON string to format.'));
    process.exit(1);
  }

  try {
    // Handle cases where the string is escaped.
    // e.g., '{"key":"value"}' -> '{"key":"value"}'
    let unescapedStr = str;
    if (str.startsWith('{') && str.endsWith('}')) {
      unescapedStr = str.replace(/\\"/g, '"');
    }

    let parsedJson = JSON.parse(unescapedStr);

    // Handle cases where the JSON string itself contains a JSON string.
    if (typeof parsedJson === 'string') {
      parsedJson = JSON.parse(parsedJson);
    }

    // Now, stringify it with beautiful formatting.
    const formattedJson = JSON.stringify(parsedJson, null, 2);
    console.log(formattedJson);
  } catch (error) {
    console.error(chalk.red('Error: Invalid JSON string provided.'));
    // console.error(error); // Uncomment for debugging
    process.exit(1);
  }
};

export default {
  name: 'json <str>',
  description: 'Formats a JSON string with 2-space indentation, handling escaped strings.',
  action,
};
