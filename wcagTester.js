const chalk = require('chalk');
const pa11y = require('pa11y');
const htmlReporter = require('pa11y-reporter-html');
const fs = require('fs');


const wcagTester = async (url, storage, reportName, screenshotName) => {
  const results = await pa11y(url, {
    wait: 1000,
    screenCapture: `${storage}/${screenshotName}`
  });
  const htmlResults = await htmlReporter.results(results);

  fs.writeFile(`${storage}/${reportName}`, htmlResults, (err, data) => {
    if (err) console.log(err);

    console.log(`${chalk.underline.blueBright(`${storage}/${reportName}`)} is saved.`);
  });
};

module.exports.wcagTester = wcagTester;
