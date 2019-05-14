 wcagTester = require('./wcagTester.js');

(async () => {
  const tester = await wcagTester.wcagTester('https://www.silversupport.gov.sg/', 'reports/wcag', '0')
    .catch(err => {
      console.log(err);
    });
})();
