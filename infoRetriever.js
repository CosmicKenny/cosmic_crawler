const chalk = require('chalk');

const getInformation = async (page, url, opts) => {
  let { lastUpdatedTextSelector} = opts;
  const title = await page.title().catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${chalk.red(`${err}`)}`);
  });

  console.log(chalk.green('Page title retrieved.'));

  const description = await page.$eval('meta[name="description"]', node => node.attributes.content.value).catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${chalk.red(err)}`);
    return null;
  });

  console.log(chalk.green('Page description retrieved.'));

  const lastUpdatedText = await getLastUpdatedDate(page, lastUpdatedTextSelector).catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${chalk.red(err)}`);
  });

  console.log(chalk.green('Last updated date retrieved.'));


  let obj = {
    url: url,
    title: title,
    description: description,
    lastUpdatedText: lastUpdatedText
  }

  return obj;
}

const getLastUpdatedDate = async (page, selector) => {
  const lastUpdatedText = await page.$eval(selector, node => node.innerHTML)
    .catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${chalk.red(err)}`);
      return null;
    });

  return lastUpdatedText;
};

module.exports = getInformation;
