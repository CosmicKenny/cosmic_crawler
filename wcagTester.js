const chalk = require('chalk');
const pa11y = require('pa11y');
const htmlReporter = require('pa11y/reporter/html');
const fs = require('fs');


const wcagTester = (url, reportName) => {
  pa11y(url, {

  }).then((error, results) => {
    if (error) {
      console.log(`${chalk.red(`ERROR: ${error}`)}`);
    }

    fs.writeFile(reportName, htmlReporter.results(results), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${reportName}`)}`);
    });
  });
};

module.exports.wcagTester = wcagTester;
