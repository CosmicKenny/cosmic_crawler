// const wcagTester = require('./wcagTester.js');

// (async () => {
//   const tester = await wcagTester.wcagTester('https://www.silversupport.gov.sg/', 'reports/wcag', '0')
//     .catch(err => {
//       console.log(err);
//     });
// })();

const jsonToCsv = require('./jsonToCsv.js');


jsonToCsv.jsonToCsv('reports/brokenLinks.json', ['source', 'url', 'code'], 'reports/brokenLinks.csv');
