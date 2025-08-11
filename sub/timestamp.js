import chalk from 'chalk';

// Helper function to format date to YYYY-MM-DD HH:mm:ss
function formatDate(date) {
  const pad = (num) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default {
  name: 'timestamp <str>',
  description: 'Convert a timestamp string or number to a different format.',
  action: async (dbPath, str, context) => {
    context.spinner.text = 'Converting timestamp...';
    let finalOutput = '';

    // Check if the input string is purely numeric
    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      // If length is <= 11, assume seconds. Otherwise, milliseconds.
      const date = str.length <= 11 ? new Date(num * 1000) : new Date(num);
      
      if (isNaN(date.getTime())) {
        context.spinner.stop();
        console.error(chalk.red(`Invalid numeric timestamp: ${str}`));
        return;
      }
      finalOutput = formatDate(date);
    } else {
      // If not numeric, try parsing as a date string
      const timestamp = Date.parse(str);

      if (isNaN(timestamp)) {
        context.spinner.stop();
        console.error(chalk.red(`Could not parse date string: "${str}"`));
        return;
      }
      finalOutput = timestamp.toString();
    }
    
    context.spinner.stop();
    console.log(finalOutput);
  }
};