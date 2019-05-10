const puppeteer = require('puppeteer');

const url = 'https://null/common/Lists/CPFPages/DispForm.aspx?ID=239';

(async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  // let response;
  // try {
  const response = await page.goto(url).catch(err => {
    console.log('ERROR: ' + err);
  });

  await page.close();
  await browser.close();
  // } catch(err) {
  //   console.log(err);
  // }
})();
