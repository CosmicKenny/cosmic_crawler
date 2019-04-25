const jsonToCsv = require('./jsonToCsv.js');

const resultsFolder = 'reports';

jsonToCsv.jsonToCsv([`${resultsFolder}/pagesWithExternalIframes.json`, `${resultsFolder}/pagesWithExternalImages.json`, `${resultsFolder}/pagesWithExternalVideos.json`], resultsFolder);
