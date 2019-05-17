// const wcagTester = require('./wcagTester.js');

// (async () => {
//   const tester = await wcagTester.wcagTester('https://www.silversupport.gov.sg/', 'reports/wcag', '0')
//     .catch(err => {
//       console.log(err);
//     });
// })();

const jsonToCsv = require('./jsonToCsv.js');


jsonToCsv.jsonToCsv('reports/crawledURLs.json', ['url'], 'reports/crawledURLs.csv', 'url');
jsonToCsv.jsonToCsv('reports/crawledPages.json', ['url', 'title', 'description', 'lastUpdatedText'], 'reports/crawledPages.csv');
jsonToCsv.jsonToCsv('reports/brokenLinks.json', ['source', 'url', 'code'], 'reports/brokenLinks.csv');
