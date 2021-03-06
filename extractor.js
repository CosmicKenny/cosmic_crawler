/*
This module crawl through a listing page with specific template, and download the content into a structured data
Process:
- Start crawling
- Grab content based on defined structure
- Save into defined JSON structure
- Save image in the folder of the page
- Generate list of URLs mapping to the files
*/

const chalk = require('chalk');
const puppeteer = require('puppeteer');
const fs = require('fs');
const queue = require('queue');
const {createFolder, isCrawled, getDomainName, isInternalURL, download, isFileLink, isValidURL, getAllLinks} = require('./cosmicUtils.js');

const configuration = require('./config.js');

let q = new queue({
  concurrency: 5
});

let entryUrl = configuration.entryUrl;
let domainName = getDomainName(entryUrl);
const resultsFolder = configuration.reportsFolderPath;
const disableCrawl = configuration.disableCrawl;
let errorLogs = [];

let crawledURLs = [];
let contents = [];
let invalidURLs = [];

(async() => {
  const browser = await puppeteer.launch();
  console.log(chalk.green('Browser launched'));

  crawledURLs.push(entryUrl);
  contents.push({
    url: entryUrl
  });
  await grabPageContent({
    url: entryUrl,
    browser,
    urlPattern: configuration.urlPattern
  }).catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: JSON.stringify(err)
    });
  });;

  q.start(async (err) => {
    if (err) console.log(`Queue start error: ${err}`);

    fs.writeFile(`${resultsFolder}/crawledURLs.json`, JSON.stringify(crawledURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/crawledURLs.json`)} is saved.`);

    });

    fs.writeFile(`${resultsFolder}/contents.json`, JSON.stringify(contents), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/contents.json`)} is saved.`);

    });

    fs.writeFile(`${resultsFolder}/errorLogs.json`, JSON.stringify(errorLogs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/errorLogs.json`)} is saved.`);
    });

    await browser.close();
    console.log(chalk.green('Browser closed'));
  });
})();

/* Grab Content of the given URL */
const grabPageContent = async (config) => {
  const { url, browser, urlPattern } = config;

  const imgFolder = `${resultsFolder}/images`;
  createFolder(imgFolder);

  const page = await browser.newPage().catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: JSON.stringify(err)
    });
  });
  console.log(`${chalk.magentaBright('New page created:')} loading ${url}...`);

  await page.goto(url, {
    timeout: 60000
  }).catch(err => {
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
  }).catch( err => {
    console.log(err);
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
    }

    /* Check if the {cleanUrl} is valid URL format and non PDF file */
    if (!isValidURL(cleanUrl)) {
      console.log(`${chalk.red('Invalid link:')} ${cleanUrl}`);
      invalidURLs.push(cleanUrl);
      continue;
    }

    if (isCrawled(cleanUrl, crawledURLs) || disableCrawl) {
      continue;
    }

    if (isInternalURL(cleanUrl, domainName) && !isFileLink(cleanUrl)) {
      console.log(`${chalk.yellowBright('New URL found:')} ${cleanUrl}`);
      crawledURLs.push(cleanUrl);
      contents.push({
        url: cleanUrl
      });

      /* queue crawling new URL*/
      q.push(async (cb) => {
        await grabPageContent({
          url: cleanUrl,
          browser,
          urlPattern
        });

        cb();
      });
    }
  }

  // =============================================
  /* Start copying content */
  let index = crawledURLs.indexOf(url);
  let contentObj = {};

  let dir = `${resultsFolder}/images/${index + 1}`;

  /* Create folder for this URL index */
  createFolder(dir);

  contentObj['url'] = url;
  contentObj['pageTitle'] = await page.title().catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: JSON.stringify(err)
    });
  });
  contentObj['title'] = await page.$eval('.pagecontent_box h1', div => div.innerHTML).catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: JSON.stringify(err)
    });
  });

  let descriptions = await page.$$eval('.pagecontent_box .description, .pageblock_box .ive_content', divs => divs.map(div => div.innerHTML)).catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: JSON.stringify(err)
    });
  });

  contentObj['description'] = descriptions.join();

  /*
    Retrieve images from the carousel filmstrip
    - find all the images in filmstrip
    - get the image source of each filmstrip
    - replace the format from xxx/.tn.${original-name}.jpg to xxx/${original-name}
   */
  console.log(`${chalk.yellowBright('Checking for gallery for:')} ${url}`);
  let gallery = await page.$$eval('.gv_galleryWrap .gv_filmstrip img', imgs => imgs.map(img => img.src.replace('.tn.', '').replace(/\.jpg$/, '')))
    .catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${err}`);
      errorLogs.push({
        url: url,
        error: err
      });
    });

  if (gallery && gallery.length) {
    contentObj['gallery'] = gallery;
    console.log(`${chalk.yellowBright('Found gallery images. Downloading gallery images...')}`)
    // /* Save image */
    gallery.map(img => {
      let imageName = getImageNameFromUrl(img);
      download(img, `${dir}/${imageName}`, () => {
        console.log(`${chalk.blueBright(`${dir}/${imageName}`)} is saved.`);
      });
    });
  }
  console.log(`${chalk.yellowBright('Gallery check complete:')} ${url}`);


  /* Check for images */
  console.log(`${chalk.yellowBright('Checking images for:')} ${url}`);
  let images = await page.$$eval('.pagecontent_box :not(.gv_galleryWrap) img, .pageblock_box :not(.gv_galleryWrap) img', imgs => imgs.map(img => img.src))
  // let images = await page.$$eval('.pageblock_box :not(.gv_galleryWrap) img', imgs => imgs.map(img => img.src))
    .catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${err}`);
      errorLogs.push({
        url: url,
        error: JSON.stringify(err)
      });
    });

  if (images && images.length) {
    contentObj['images'] = images;
    createFolder(`${dir}/images`);

    console.log(`${chalk.yellowBright('Downloading images for:')}  ${url}...`);
    images.map(img => {
      let imageName = getImageNameFromUrl(img);
      download(img, `${dir}/images/${imageName}`, () => {
        console.log(`${chalk.blueBright(`${dir}/images/${imageName}`)} is saved.`);
      });
    });
  }
  console.log(`${chalk.yellowBright('Image check complete for:')} ${url}`);

  contents[index] = contentObj;

  await page.close();
  console.log(`${chalk.magentaBright('Page closed:')} ${url}`);

};

const getImageNameFromUrl = (url) => {
  let imageDirs = url.split('/');
  let imageName = imageDirs[imageDirs.length - 1].split('?')[0];

  return imageName;
}
