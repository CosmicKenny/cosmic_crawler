const puppeteer = require('puppeteer');

const url = 'https://www.cpf.gov.sg/eSvc/Web/Schemes/CpfHousingWithdrawalLimits/CpfHousingWithdrawalLimits';

(async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.goto(url);

  const title = await page.title();
  console.log(`Titie: ${title}`);

  const description = await page.$eval('meta[name="description"]', node => node.attributes.content.value)
    .catch(err => {
      console.log(`ERROR: ${err}`);
    });

  await page.close();
  await browser.close();
})();
