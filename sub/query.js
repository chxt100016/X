import mysql from 'mysql2/promise';
import chalk from 'chalk';

async function queryDatabase(connectionConfig, sql, params) {
  const connection = await mysql.createConnection(connectionConfig);
  const [rows] = await connection.execute(sql, params);
  await connection.end();
  return rows;
}

function getTableName(config, tableOrAlias) {
  const tables = config.query.tables;
  if (tables[tableOrAlias]) {
    return tableOrAlias;
  }
  for (const tableName in tables) {
    if (tables[tableName].alias === tableOrAlias) {
      return tableName;
    }
  }
  throw new Error(`Table or alias not found: ${tableOrAlias}`);
}

function getDataSource(config, table, productId) {
  const tableName = getTableName(config, table);
  const tableConfig = config.query.tables[tableName];
  if (!tableConfig || !tableConfig.sharding) {
    throw new Error(`Missing sharding configuration for table: ${table}`);
  }

  const { algorithm, column } = tableConfig.sharding;

  if (algorithm !== 'product_mod') {
    throw new Error(`Unsupported sharding algorithm: ${algorithm}`);
  }

  const mod = parseInt(productId.toString().slice(-4)) % 16 + 1;
  const dataSourceName = `ds${mod}`;
  
  const dataSource = config.query.dataSources[dataSourceName];
  if (!dataSource) {
    throw new Error(`DataSource not found for key: ${dataSourceName}`);
  }
  return { dataSource, shardingKey: mod };
}

function formatCard(data, shardingKey) {
    const cardWidth = 80;
    const keyColumnWidth = 25;
    const valueColumnWidth = cardWidth - keyColumnWidth - 5;

    const getDisplayLength = (str) => {
        if (!str) return 0;
        let len = 0;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if ((code >= 0x4E00 && code <= 0x9FFF) || // CJK Unified Ideographs
                (code >= 0x3000 && code <= 0x303F) || // CJK Symbols and Punctuation
                (code >= 0xFF00 && code <= 0xFFEF) // Halfwidth and Fullwidth Forms
            ) {
                len += 2;
            } else {
                len += 1;
            }
        }
        return len;
    };

    const wrap = (str, maxWidth) => {
        const lines = [];
        const rawLines = str.split(/\r\n|\n/);

        for (const rawLine of rawLines) {
            let currentLine = '';
            let currentLen = 0;
            for (let i = 0; i < rawLine.length; i++) {
                const char = rawLine[i];
                const charLen = getDisplayLength(char);
                if (currentLen + charLen > maxWidth) {
                    lines.push(currentLine);
                    currentLine = '';
                    currentLen = 0;
                }
                currentLine += char;
                currentLen += charLen;
            }
            lines.push(currentLine);
        }
        return lines;
    };

    const printRow = (key, value) => {
        const valStr = value !== null && value !== undefined ? value.toString() : 'NULL';
        const valueLines = wrap(valStr, valueColumnWidth);

        const keyStr = key.toString().slice(0, keyColumnWidth - 2);
        const keyDisplay = chalk.green(keyStr);
        const keyPadding = ' '.repeat(Math.max(0, keyColumnWidth - getDisplayLength(keyStr)));
        
        const firstValueLine = valueLines.shift() || '';
        console.log(`${keyDisplay}${keyPadding}: ${firstValueLine}`);

        let linesToPrint = valueLines;
        if (linesToPrint.length > 1) {
            const lastLine = linesToPrint.pop();
            linesToPrint = linesToPrint.slice(0, 1); // Keep only the second line
            linesToPrint.push(lastLine.slice(0, valueColumnWidth - 3) + '...');
        }

        for (const line of linesToPrint) {
            const keyPadding = ' '.repeat(keyColumnWidth);
            console.log(`${keyPadding}  ${line}`);
        }
    };

    const shardingText = ` Sharding Key: ${shardingKey} `;
    const line = '─'.repeat(cardWidth);
    const centeredShardingText = line.slice(0, (cardWidth - shardingText.length) / 2) + shardingText + line.slice(((cardWidth - shardingText.length) / 2) + shardingText.length);

    console.log(centeredShardingText);

    for (const [key, value] of Object.entries(data)) {
        printRow(key, value);
    }

    console.log(centeredShardingText);
}


export default {
  alias: 'q',
  name: 'query [table] [id] [columns...]',
  description: 'Query data from database.',
  action: async (config, table, id, columns, context) => {
    try {
      context.spinner.text = 'Executing query...';
      
      const tableName = getTableName(config, table);
      const { dataSource, shardingKey } = getDataSource(config, tableName, id);

      let sql;
      const shardingColumn = config.query.tables[tableName].sharding.column;
      if (columns && columns.length > 0) {
        sql = `SELECT ${columns.join(', ')} FROM ${tableName} WHERE ${shardingColumn} = ?`;
      } else {
        sql = `SELECT * FROM ${tableName} WHERE ${shardingColumn} = ?`;
      }

      const results = await queryDatabase(dataSource, sql, [id]);
      context.spinner.stop();

      if (results.length === 0) {
        console.log(chalk.yellow('No results found.'));
        return;
      }

      if (columns && columns.length > 0) {
        const result = results[0];
        if (columns.length === 1) {
            console.log(result[columns[0]]);
        } else {
            for (const key of columns) {
                console.log(`${chalk.green(key)}: ${result[key]}`);
            }
        }
      } else {
        formatCard(results[0], shardingKey);
      }

    } catch (error) {
      context.spinner.stop();
      console.error(chalk.red('Error:'), error.message);
    }
  }
};
