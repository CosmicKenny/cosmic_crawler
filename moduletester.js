const wcagTest = require('./wcagTester.js');

const resultsFolder = 'reports/wcag';

wcagTest.wcagTester('https://adelphi.digital', resultsFolder, '1.html', '1.jpg');
Kenny
