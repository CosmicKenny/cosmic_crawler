const puppeteer = require('puppeteer');

const url = 'https://www.cpf.gov.sg/Members/others/member-pages/terms-of-use';

(async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  let isBroken = false;
  const response = await page.goto(url).catch(err => {
    console.log('ERROR: ' + err);
    isBroken = true;
  });

  if (!isBroken) {
    console.log(response.status());
    isBroken = (!response.ok());
  }
  console.log(isBroken);

  await page.close();
  await browser.close();
  // } catch(err) {
  //   console.log(err);
  // }
})();
