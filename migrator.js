const chalk = require('chalk');

const util = require('util');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const queue = require('queue');
const request = require('request');

const configuration = require('./config.js');

let q = new queue({
  concurrency: 5
});

var domainName = configuration.domain;
let entryUrl = configuration.entryUrl;
const resultsFolder = configuration.reportsFolderPath;
let errorLogs = [];

let crawledURLs = [];
let contents = [];

(async() => {
  const browser = await puppeteer.launch();
  console.log(chalk.green('Browser launched'));

  crawledURLs.push(entryUrl);
  await grabPageContent({
    url: entryUrl,
    browser,
    urlPattern: configuration.urlPattern
  });

  q.start(async (err) => {

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

    if (isCrawled(cleanUrl)) {
      continue;
    }

    if (isInternalURL(cleanUrl, domainName) && !isFileLink(cleanUrl)) {
      console.log(`${chalk.yellowBright('New URL found:')} ${cleanUrl}`);
      crawledURLs.push(cleanUrl);

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
      error: err
    });
  });
  contentObj['title'] = await page.$eval('.pagecontent_box h1', div => div.innerHTML).catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: err
    });
  });

  let descriptions = await page.$$eval('.pagecontent_box .description, .pageblock_box .ive_content', divs => divs.map(div => div.innerHTML)).catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: err
    });
  });

  contentObj['description'] = descriptions.join();

  /*
    Retrieve images from the carousel filmstrip
    - find all the images in filmstrip
    - get the image source of each filmstrip
    - replace the format from xxx/.tn.${original-name}.jpg to xxx/${original-name}
   */
  let images = await page.$$eval('.gv_galleryWrap .gv_filmstrip img', imgs => imgs.map(img => img.src.replace('.tn.', '').replace(/\.jpg$/, '')))
    .catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${err}`);
      errorLogs.push({
        url: url,
        error: err
      });
    });

  console.log(images);

  if (images) {
    contentObj['gallery'] = images;

    console.log(`${chalk.yellowBright('Found gallery images.')} Downloading images...`)
    /* Save image */
    images.map(img => {
      let imageDirs = img.split('/');
      let imageName = imageDirs[imageDirs.length - 1];
      download(img, `${dir}/${imageName}`, () => {
        console.log(`${chalk.blueBright(`${dir}/${imageName}`)} is saved.`);
      });
    });
  }

  contents.push(contentObj);

  await page.close();
  console.log(`${chalk.magentaBright('Page closed:')} ${url}`);

};

const getAllLinks = async (config) => {
  const { page, urlPattern } = config;
  let links;
  if (urlPattern !== null) {
    /* only get URL that contain the pattern of {domainName}/{pattern} */
    links = await page.$$eval('a', (as, args) => {
      let { domainName, urlPattern } = args;
      let regex = new RegExp(`^http(s)?:\/\/${domainName}\/${urlPattern.replace(/\//g, '\\/')}`);

      return as.filter(a => {
        return (a.href.match(regex) !== null);
      }).map(a => {
        return a.href;
      });
    }, { domainName, urlPattern }).catch(err => {
      console.log(`${chalk.red('Crawling error:')} ${err}`);
    });

  } else {
    links = await page.$$eval('a', as => as.map(a => a.href));
  }

  return links;
};

const isCrawled = (url) => {
  return (crawledURLs.indexOf(url) > -1);
};

const isValidURL = (url) => {
  /*
  condition:
  - should only start with http:// or https://
  - should not end with .pdf
  */
  const urlFormat = /^http(s)?:\/\/(.(?!pdf(\?.*)?$))*$/;
  return (url.match(urlFormat) !== null);
};

const isFileLink = (url) => {
  /*
  condition:
  - should only start with http:// or https://
  - should end with .{ext} or .{ext}?xxx, where ext = pdf, jpg, jpeg, png, xls, xlsx, doc, docx
  */
  const urlFormat = /^http(s)?:\/\/.+(\.(pdf|jpe?g|png|xlsx?|docx?|mp3|mp4)(\?.*)?){1}$/;
  return (url.match(urlFormat) !== null);
};

const isInternalURL = (url, domain) => {
  /* URL should contain the domain name */
  const urlFormat = new RegExp(`^http(s)?:\/\/${domain}`);
  return (url.match(urlFormat) !== null);
}

const createFolder = (folderName) => {
  if (!fs.existsSync(folderName)) {
    console.log(`${folderName} folder not found. Creating new folder...`)
    fs.mkdirSync(folderName);
    console.log(`${folderName} folder is created.`);
  }
}

const download = (uri, filename, callback) => {
  request.head(uri, (err, res, body) => {
    request(uri).pipe(fs.createWriteStream(filename))
      .on('error', (errMsg) => {
        console.log(errMsg);
      })
      .on('close', callback);
  });
};
