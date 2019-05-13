const puppeteer = require('puppeteer');
const chalk = require('chalk');

let browser;
let page;
let allLinks = []
let globalIndex = 0;

(async () => {

  browser = await puppeteer.launch();

  page = await browser.newPage();
  page.setViewport({
    width: 1366,
    height: 768
  });

  await page.goto('https://www.population.sg/articles');

  await page.waitForSelector('#wsContentListTable a');

  let links = await page.$$eval('#wsContentListTable a', as => as.map(a => a.href));

  allLinks = allLinks.concat(links);

  console.log(allLinks);

  await navigateNext();

  await page.close();
  await browser.close();
})();

const navigateNext = async () => {
  // if (globalIndex > 10) return;

  await page.screenshot({
    path: 'reports/beforeclick.jpg'
  });

  let nextButton = await page.waitForSelector('#wsContentListTable_next a');
  await nextButton.click();

  await page.waitForSelector('#wsContentListTable_processing', {
    visible: true
  });
  console.log('loading screen shown');

  await page.screenshot({
    path: 'reports/waiting.jpg'
  });

  let links = await page.$$eval('#wsContentListTable a', as => as.map(a => a.href));
  console.log(links);

  await page.waitForSelector('#wsContentListTable_processing', {
    hidden: true
  });
  console.log('loading screen hidden');

  await page.screenshot({
    path: 'reports/waiting-complete.jpg'
  });

  links = await page.$$eval('#wsContentListTable a', as => as.map(a => a.href));
  console.log(links);
}

const getLastUpdatedDate = async (page) => {
  const lastUpdatedText = await page.$eval('#lastUpdatedText', node => node.innerHTML)
    .catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${err}`);
      return null;
    });

  return lastUpdatedText;
};
