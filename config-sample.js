module.exports = {
  entryUrl: 'https://www.csit.gov.sg/',
  urlPattern: null,
  // urlPattern: filtered/path,
  pageWaitTime: 10000, // used to slow down crawler to prevent being blocked
  viewportSize: {
    mobile: {
      width: 375,
      height: 667
    },
    desktop: {
      width: 1366,
      height: 768
    }
  },
  debug: false,
  checkBrokenLink: false,
  detectFileLink: false,
  checkImageExist: true,
  checkVideoExist: false,
  checkIframeExist: false,
  disableCrawl: false, // true to turn off the crawler
  detectExternalResource: false,
  savePageInfo: false,
  scanWCAG: false,
  validateHTML: false,
  takeScreenshot: false,
  outputFolderName: 'reports',
  lastUpdatedTextSelector: '.copyright > p:nth-child(2)',
  urlsSource: './src/exampleUrlsSource.json'  // provide path to the URLs.json
  // urlsSource: null  // provide path to the URLs.json
};


