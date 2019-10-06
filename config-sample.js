module.exports = {
  entryUrl: 'https://www.csit.gov.sg/',
  domain: 'www.csit.gov.sg',
  urlPattern: null,
  // urlPattern: filtered/path,
  pageWaitTime: 10000, // used to slow down crawler to prevent being blocked
  viewportSize: {
    width: 375, // desktop = 1366
    height: 667 // desktop = 768
  },
  debug: false,
  checkBrokenLink: false,
  detectFileLink: false,
  checkImageExist: true,
  checkVideoExist: false,
  checkIframeExist: false,
  detectExternalResource: false,
  savePageInfo: false,
  scanWCAG: false,
  validateHTML: false,
  takeScreenshot: false,
  reportsFolderPath: 'reports',
  lastUpdatedTextSelector: '.copyright > p:nth-child(2)',
  urlsSource: './src/exampleUrlsSource.json'  // provide path to the URLs.json
  // urlsSource: null  // provide path to the URLs.json
};


