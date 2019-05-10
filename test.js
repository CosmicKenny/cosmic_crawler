const puppeteer = require('puppeteer');

const url = 'https://www.cpf.gov.sg/Members/Careers/careers/cpfb-careers';

(async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  let isBroken = false;
  let responseError = false;
  const response = await page.goto(url).catch(err => {
    console.log('ERROR: ' + err);
    isBroken = true;
    responseError = true;
  });

  if (!responseError) {
    await page.waitFor(1000);
    console.log('Status code: ' + response.status());
    isBroken = (!response.ok());
  }
  console.log('Broken? ' + isBroken);

  await page.close();
  await browser.close();
  // } catch(err) {
  //   console.log(err);
  // }
})();
