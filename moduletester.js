const jsonToCsv = require('./jsonToCsv.js');

jsonToCsv.jsonToCsv('reports/cpf-broken-links.json', ['source', 'url', 'code']);
