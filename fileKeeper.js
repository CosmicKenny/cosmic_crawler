const chalk = require('chalk');
const fs = require('fs');

const saveJson = (fileName, data, outputPath) => {
  fs.writeFile(`${outputPath}/${fileName}.json`, JSON.stringify(data), (err, errData) => {
    if (err) console.log(`${chalk.bgRed('ERROR:')} ${chalk.red(err)}`);

    console.log(`${chalk.green(`${chalk.underline(fileName)} is saved as`)} ${chalk.blue.underline(`${outputPath}/${fileName}.json`)}`);
  });
}

module.exports = { saveJson };
