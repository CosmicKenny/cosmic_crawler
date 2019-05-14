const chalk = require('chalk');
const pa11y = require('pa11y');
const htmlReporter = require('pa11y-reporter-html');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);

const test = async (url, storage, reportName) => {
  /*
  - use Pa11y to load the {url} to scan for WCAG,
  - save the WCAG report in {storage}/{reportName}.html
  - save the WCAG screenshot in {storage}/{reportName}.jpg
  */
  const results = await pa11y(url, {
    wait: 1000,
    screenCapture: `${storage}/${reportName}.jpg`
  });
  const htmlResults = await htmlReporter.results(results);

  const scanResult = await writeFile(`${storage}/${reportName}.html`, htmlResults).catch(err => {
    console.log(err);

    return err;
  });

  console.log(`${chalk.underline.blueBright(`${storage}/${reportName}.html`)} is saved.`);

  return scanResult;
};

module.exports.wcagTester = test;
