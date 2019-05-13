const jsonToCsv = require('./jsonToCsv.js');

jsonToCsv.jsonToCsv('reports/crawledURLs.json', ['url'], 'reports/crawledURLs.csv', 'url');
