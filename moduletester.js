const jsonToCsv = require('./jsonToCsv.js');

jsonToCsv.jsonToCsv('reports/crawledPages.json', ['url', 'title', 'description', 'lastUpdateText'], 'reports/crawledPages.csv');
