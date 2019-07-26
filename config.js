module.exports = {
  entryUrl: 'https://www.csit.gov.sg/',
  domain: 'www.csit.gov.sg',
  pageWaitTime: 10000, // used to slow down crawler to prevent being blocked
  debug: false,
  checkBrokenLink: false,
  detectFileLink: true,
  checkImageExist: true,
  checkVideoExist: true,
  checkIframeExist: true,
  detectExternalResource: false,
  savePageInfo: false,
  scanWCAG: false,
  validateHTML: false,
  takeScreenshot: false,
  reportsFolderPath: 'reports',
  lastUpdatedTextSelector: '.copyright',
  urlsSource: './src/exampleUrlsSource.json'  // provide path to the URLs.json
  // sourceOfURLs: null  // provide path to the URLs.json
};


