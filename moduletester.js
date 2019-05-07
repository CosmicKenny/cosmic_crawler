const wcagTest = require('./wcagTester.js');

const resultsFolder = 'reports';

wcagTester.wcagTester('https://adelphi.digital', resultsFolder);
