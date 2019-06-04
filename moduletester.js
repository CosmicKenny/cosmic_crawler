/* Test WCAG */

// const wcagTester = require('./wcagTester.js');
// (async () => {
//   const tester = await wcagTester.wcagTester('https://www.ica.gov.sg/feedbackform', 'reports/wcag', '309')
//     .catch(err => {
//       console.log(err);
//     });
// })();

/* End: Test WCAG */


/* Test conversion from JSON to CSV */

// const jsonToCsv = require('./jsonToCsv.js');
// jsonToCsv.jsonToCsv('reports/crawledURLs.json', ['url'], 'reports/crawledURLs.csv', 'url');
// jsonToCsv.jsonToCsv('reports/crawledPages.json', ['url', 'title', 'description', 'lastUpdateText'], 'reports/crawledPages.csv');
// jsonToCsv.jsonToCsv('reports/brokenLinks.json', ['source', 'url', 'code'], 'reports/brokenLinks.csv');

/* End: Test conversion from JSON to CSV */


/* Test html validator */
const puppeteer = require('puppeteer');
const htmlValidator = require('./htmlValidate');

(async () => {
  console.log('Lauching browser');
  let browser = await puppeteer.launch();
  console.log('Browser launched');
  let url = 'https://www.ica.gov.sg/search-results?searchText=permanent';
  let page = await browser.newPage();
  console.log('New page created');
  await page.goto(url, {
    timeout: 60000
  }).catch(err => {
    console.log(err);
  });
  console.log(`Navigated to ${url}`);
  let HTML = await page.content();
  await htmlValidator.htmlValidate(url, HTML, `reports/html-validate`, '426');
  console.log('Completed');
  await page.close();
  await browser.close();
})();
/* End: Test html validator */
