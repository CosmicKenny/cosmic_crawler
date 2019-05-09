const htmlValidator = require('html-validator');
const fs = require('fs');
const chalk = require('chalk');

const validate = async (html, storage, reportName) => {
  const results = await htmlValidator({
    data: html
  });

  fs.writeFile(`${storage}/${reportName}`, results, (err, data) => {
    if (err) console.log(err);

    console.log(`${chalk.underline.blueBright(`${storage}/${reportName}`)} is saved.`);
  })
};

module.exports.htmlValidate = validate;
