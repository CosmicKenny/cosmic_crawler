const puppeteer = require('puppeteer');
const chalk = require('chalk');

const url = 'https://www.cpf.gov.sg/eSvc/Web/Schemes/CpfHousingWithdrawalLimits/CpfHousingWithdrawalLimits';

(async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.goto(url);

  const lastUpdatedText = await getLastUpdatedDate(page);

  console.log(lastUpdatedText);

  await page.close();
  await browser.close();
})();

const getLastUpdatedDate = async (page) => {
  const lastUpdatedText = await page.$eval('#lastUpdatedText', node => node.innerHTML)
    .catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${err}`);
      return null;
    });

  return lastUpdatedText;
};
