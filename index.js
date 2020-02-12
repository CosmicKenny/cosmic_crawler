const chalk = require('chalk');
/* color convention:
  - magentaBright: page level status
  - green: browser status
  - blueBright: link or file path
  - bgMagenta: custom plugin
 */
const util = require('util');
const {createFolder, isCrawled, getDomainName, isInternalURL, isFileLink, isValidURL, getAllLinks} = require('./cosmicUtils.js');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const queue = require('queue');
const wcagTester = require('./wcagTester.js');
const htmlValidator = require('./htmlValidate');
const getExternalSources = require('./getExternalSources');
const takeScreenshot = require('./takeScreenshot');
const elementsFinder = require('./elementsFinder');
const infoRetriever = require('./infoRetriever');
const saveFile = require('./saveFile');

const configuration = require('./config.js');

const readFile = util.promisify(fs.readFile);

let urlSource = [];
let crawledURLs = [];
let crawledPages = [];
let testedPages = [];
let invalidURLs = [];
let pagesWithExternalIframes = [];
let pagesWithExternalImages = [];
let pagesWithExternalVideos = [];
let brokenURLs = [];
let testedURLs = [];
let errorLogs = [];
let pagesWithVideos = [];
let pagesWithImages = [];
let pagesWithIframes = [];
let pagesWithFiles = [];
let externalDomains = [];

let q = new queue({
  concurrency: 5
});

const resultsFolder = configuration.outputFolderName;

const entryUrl = configuration.entryUrl;
const domainName = getDomainName(entryUrl);
const urlPattern = configuration.urlPattern;
const disableCrawl = configuration.disableCrawl;

/* setup crawler */
const setup = () => {
  createFolder(resultsFolder);

  if (configuration.scanWCAG) {
    createFolder(`${resultsFolder}/wcag`);
  }

  if (configuration.validateHTML) {
    createFolder(`${resultsFolder}/html-validate`);
  }

  if (configuration.takeScreenshot) {
    createFolder(`${resultsFolder}/screenshots`);
    createFolder(`${resultsFolder}/screenshots/mobile`);
    createFolder(`${resultsFolder}/screenshots/desktop`);
  }
}

(async() => {

  setup();

  const browser = await puppeteer.launch();
  console.log(chalk.green('Browser launched'));

  if (configuration.urlsSource !== null) {
    /* Read URL from given source */
    const urlsSource = await readFile(configuration.urlsSource).catch((err) => {
      console.log(err);
    });

    urlSource = JSON.parse(urlsSource);

    for (let i = 0; i < urlSource.length; i++) {
      if (configuration.debug) {
        if (i >= 15) break;
      }

      q.push(async cb => {
        await crawlAllURLs(urlSource[i], browser);
      });
    };

  } else {
    /* Start crawling from the entry URL */
    crawledURLs.push(entryUrl);
    await crawlAllURLs(entryUrl, browser);
  }

  q.start(async (err) => {
    if (err) console.log(`Queue start error: ${err}`);

    console.log(chalk.green('Generating report...'));

    if (configuration.urlsSource === null) {
      saveFile.saveJson('crawledURLs', crawledURLs, resultsFolder);
    }

    if (configuration.savePageInfo) {
      saveFile.saveJson('crawledPages', crawledPages, resultsFolder);
    }

    saveFile.saveJson('invalidURLs', invalidURLs, resultsFolder);

    if (configuration.checkIframeExist) {
      saveFile.saveJson('pagesWithIframes', pagesWithIframes, resultsFolder);

    }

    if (configuration.checkImageExist) {
      saveFile.saveJson('pagesWithImages', pagesWithImages, resultsFolder);
    }

    if (configuration.detectFileLink) {
      saveFile.saveJson('pagesWithFiles', pagesWithFiles, resultsFolder);
    }

    if (configuration.checkVideoExist) {
      saveFile.saveJson('pagesWithVideos', pagesWithVideos, resultsFolder);
    }

    if (configuration.detectExternalResource) {
      saveFile.saveJson('pagesWithExternalIframes', pagesWithExternalIframes, resultsFolder);
      saveFile.saveJson('pagesWithExternalImages', pagesWithExternalImages, resultsFolder);
      saveFile.saveJson('pagesWithExternalVideos', pagesWithExternalVideos, resultsFolder);
      saveFile.saveJson('externalDomains', externalDomains, resultsFolder);
    }

    if (configuration.checkBrokenLink) {
      saveFile.saveJson('brokenLinks', brokenURLs, resultsFolder);
      saveFile.saveJson('testedPages', testedPages, resultsFolder);
    }

    await browser.close();
    console.log(chalk.green('Browser closed'));
  });

})();

const crawlAllURLs = async (url, browser) => {
  let page = await browser.newPage();
  let fileLinks = [];

  await page.setViewport(configuration.viewportSize.desktop);


  console.log(`${chalk.magentaBright('New page created:')} loading ${url}...`);

  if (configuration.detectExternalResource) {
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
      if (!isInternalURL(interceptedRequest.url(), domainName)) {
        let domain = getDomainName(interceptedRequest.url());

        if (externalDomains.indexOf(domain) == -1) {
          externalDomains.push(domain);
        }
      }
      interceptedRequest.continue();
    });
  }

  await page.goto(url, {
    timeout: 60000
  }).catch((err) => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: JSON.stringify(err)
    });
  });
  console.log(`${chalk.magentaBright('Holding on:')} ${url}`);
  await page.waitFor(configuration.pageWaitTime);
  console.log(`Continue after ${configuration.pageWaitTime / 1000}s on ${url}`);
  console.log(`${chalk.magentaBright('URL loaded:')} ${url}`);

  console.log(`${chalk.cyan('Parsing all links in:')} ${url}...`);
  const links = await getAllLinks({
    page,
    urlPattern
  });
  console.log(`${chalk.cyan('Got all links in:')} ${url}`);

  console.log(`${chalk.cyan('Checking each link in:')} ${url}...`);

  for (let i = 0; i < links.length; i++) {
    if (configuration.debug) {
      if (crawledURLs.length >= 15) {
        break;
      }
    }

    /* remove # from last character of {url} */
    let cleanUrl = (links[i].slice(-1) == '#') ? links[i].slice(0, -1) : links[i];

    if (isFileLink(cleanUrl)) {
      console.log(`${chalk.yellow('Non HTML Link:')} ${cleanUrl}`);
      if (configuration.detectFileLink) {
        fileLinks.push(cleanUrl);
        pagesWithFiles.push({
          pageUrl: url,
          file: cleanUrl
        });
      }
    }

    /* Check if the {cleanUrl} is valid URL format and non PDF file */
    if (!isValidURL(cleanUrl)) {
      console.log(`${chalk.red('Invalid link:')} ${cleanUrl}`);
      invalidURLs.push(cleanUrl);
      continue;
    }

    /* check if {cleanUrl} is crawled before */
    if (isCrawled(cleanUrl, crawledURLs) || disableCrawl) {
      continue;
    }

    /* Check if {cleanUrl} is broken links */
    if (configuration.checkBrokenLink) {
      /* Skip testing the link if it is tested before */
      let testPageObj = {
        pageUrl: url,
        url: cleanUrl,
        code: 200
      };
      let isBrokenURL = false;

      if (!isTested(cleanUrl)) {
        // console.log(`${chalk.cyan('Checking tested URLs code:')} ${cleanUrl}`);
        // testPageObj = testedPages.find(page => {
        //   return (page.url == cleanUrl)
        // });
        // testPageObj.url = cleanUrl;
      // } else {
        console.log(`${chalk.cyan('Testing link response:')} ${cleanUrl}`)
        // let testPageObj = {
        //   pageUrl: url,
        //   url: cleanUrl,
        //   code: 200
        // };

        let testResponseError = false;
        let testResponse;
        if (cleanUrl.indexOf('-admin.cwp') > -1) {
          /* Check if the link contain CWP link (xxx-admin.cwp.sg or xxx-admin.cwp-stg.sg) */
          console.log(`${chalk.bgRed('ERROR:')} ${cleanUrl} contain ${chalk.yellow('-admin.cwp')} in the URL.`);
          testPageObj.code = 4031; /* Special code by Kenny Saw, given to CWP admin */
          isBrokenURL = true;
        } else {
          const testPage = await browser.newPage();
          console.log(`Test page created. Loading: ${cleanUrl}...`);
          // isBrokenURL = false;
          // testResponseError = false;
          testResponse = await testPage.goto(cleanUrl, {
            timeout: 60000
          }).catch(err => {
            console.log(`${chalk.bgRed('ERROR:')} ${err}`);
            isBrokenURL = true;
            testResponseError = true;
            errorLogs.push({
              action: 'Broken link checker',
              url: url,
              error: err
            });
          });
          if (!testResponseError) {
            /* TO FIX: what's this 1000 here for? */
            await testPage.waitFor(1000);
            isBrokenURL = (!testResponse.ok());
          }
          console.log(`Test page visiting: ${cleanUrl}`);
          console.log(`${cleanUrl} is broken? ${chalk.yellow(isBrokenURL)}`);

          await testPage.close();
          console.log(`Test page closed: ${cleanUrl}`);
        }

        console.log(`Completed tested ${cleanUrl}`);

        testPageObj.code = (!testResponseError) ? null : testResponse.status();

        if (testPageObj.code != 403) {
          /* the URL is considered tested only if it is not 403 */
          testedURLs.push(cleanUrl);
          testedPages.push(testPageObj);
          console.log(`${cleanUrl} is tested`);
        }

        if (isBrokenURL && testPageObj.code != 403) {
          console.log(`${chalk.red('Broken link:')} ${cleanUrl}`);
          brokenURLs.push(testPageObj);
        }
      }
    }

    /* To continue crawl the found links if the source of URLs is not provided */
    if (configuration.urlsSource === null) {
      /* TO FIX: have to continue even if it's 403 code */
      /* validate URL format */
      if (isInternalURL(cleanUrl, domainName) && !isFileLink(cleanUrl)) {
        console.log(`${chalk.yellowBright('New URL found:')} ${cleanUrl}`);
        crawledURLs.push(cleanUrl);

        /* queue crawling new URL*/
        q.push(async (cb) => {
          await crawlAllURLs(cleanUrl, browser);
          cb();
        });
      }
    }
  }
  console.log(`${chalk.cyan('All links retrieved in')}: ${url}`);

  // =====================================================
  /* Do other fun things for this page here */
  let index = crawledURLs.indexOf(url);
  if (configuration.urlsSource !== null) {
    index = urlSource.indexOf(url);
  }

  if (configuration.takeScreenshot) {
    console.log('Taking screenshot...');
    await takeScreenshot({
      page,
      mobileDimension: {
        width: configuration.viewportSize.mobile.width,
        height: configuration.viewportSize.mobile.height
      },
      desktopDimension: {
        width: configuration.viewportSize.desktop.width,
        height: configuration.viewportSize.desktop.height
      },
      outputPath: resultsFolder,
      outputFileName: `${index + 1}.jpg`,
    });
  }

  if (configuration.detectFileLink) {
    console.log(`${chalk.cyan.bold('No of files:')} ${fileLinks.length}`);
  }

  if (configuration.checkIframeExist) {
    console.log(`${chalk.bgMagenta('Finding iframes in:')} ${url}`)
    let iframes = await elementsFinder.findIframes(page, url).catch(err => {
      errorLogs.push({
        url: url,
        error: err
      });
    });
    pagesWithIframes = pagesWithIframes.concat(iframes);
    console.log(`${chalk.bgMagenta('All iframes found in:')} ${url}`);
  }

  if (configuration.checkImageExist) {
    console.log(`${chalk.bgMagenta('Finding images in:')} ${url}`)
    let images = await elementsFinder.findImages(page, url).catch(err => {
      errorLogs.push({
        url: url,
        error: err
      });
    });
    pagesWithImages = pagesWithImages.concat(images);
    console.log(`${chalk.bgMagenta('All images found in:')} ${url}`);
  }

  if (configuration.checkVideoExist) {
    console.log(`${chalk.bgMagenta('Finding videos in:')} ${url}`)
    let videos = await elementsFinder.findVideos(page, url).catch(err => {
      errorLogs.push({
        url: url,
        error: err
      });
    });
    pagesWithVideos = pagesWithVideos.concat(videos);
    console.log(`${chalk.bgMagenta('All videos found in:')} ${url}`);
  }

  if (configuration.savePageInfo) {
    console.log(`${chalk.cyan('Collecting page information of:')} ${chalk.blue.underline(`${url}`)}`);
    crawledPages.push(await infoRetriever(page, url, {
      lastUpdatedTextSelector: configuration.lastUpdatedTextSelector
    }));
    console.log(`${chalk.green('Page information is collected for:')} ${chalk.blue.underline(`${url}`)}`);
  }

  if (configuration.detectExternalResource) {
    let { externalIframes, externalImages, externalVideos } = await getExternalSources(page, url, domainName);
    pagesWithExternalIframes = pagesWithExternalIframes.concat(externalIframes);
    pagesWithExternalImages = pagesWithExternalImages.concat(externalImages);
    pagesWithExternalVideos = pagesWithExternalVideos.concat(externalVideos);
  }

  if (configuration.scanWCAG) {
    console.log(`${chalk.bgMagenta('Scanning WCAG for:')} ${url}`);
    await wcagTester(url, `${resultsFolder}/wcag`, `${index + 1}`)
      .catch(err => {
        console.log(`${chalk.bgRed('ERROR:')} ${err}`);
        errorLogs.push({
          url: url,
          error: err
        });
      });
    console.log(`${chalk.bgMagenta('Finished scanning WCAG for:')} ${url}`);
  }

  if (configuration.validateHTML) {
    console.log(`${chalk.bgMagenta('Getting HTML of the page:')} ${url}...`);
    let HTML = await page.content();
    console.log(`${chalk.bgMagenta('Validating HTML for:')} ${url}`);
    await htmlValidator(url, HTML, `${resultsFolder}/html-validate`, `${index + 1}`);
    console.log(`${chalk.bgMagenta('Finish validating HTML for:')} ${url}`);
  }

  await page.close();
  console.log(`${chalk.magentaBright('Page closed:')} ${url}`);
};

const _getPathName = (url, basePath) => {
  let newUrl = url.replace(basePath, "");
  newUrl = newUrl.trim('/').replace(/\//g, '-');
  return newUrl;
}

const isTested = (url) => {
  return (testedURLs.indexOf(url) > -1);
};

const saveHTML = async (page, url) => {
  const pageContent = await page.content();

  /* TO FIX: save HTML into directories accordingly */
  const filePath = _getPathName(url, domainName);
  console.log('filepath', filePath);

  fs.writeFile(path.join(`${resultsFolder}`, 'html', filePath) + '-index.html', pageContent, (err, data) => {
    if (err) console.log(err);

    console.log(`HTML saved as ${path.join('html', filePath)}-index.html`);
  });

  return pageContent;
};
