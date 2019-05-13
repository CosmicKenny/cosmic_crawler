const chalk = require('chalk');
const pa11y = require('pa11y');
const htmlReporter = require('pa11y-reporter-html');
const fs = require('fs');

const test = async (url, storage, reportName, screenshotName) => {
  /*
  - use Pa11y to load the {url} to scan for WCAG,
  - save the WCAG report in {storage}/{reportName}
  - screenshot the page in {storage}/{screenshotName}
  */
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

module.exports.wcagTester = test;
