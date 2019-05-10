const chalk = require('chalk');
/* color convention:
  - magentaBright: page level status
  - green: browser status
  - blueBright: link or file path
  - bgMagenta: custom plugin
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const queue = require('queue');
const http = require('http');
const jsonToCsv = require('./jsonToCsv.js');
const wcagTester = require('./wcagTester.js');
const htmlValidator = require('./htmlValidate');

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

let q = new queue({
  concurrency: 5
});

let globalIndex = 0;

const resultsFolder = 'reports';

const domainName = 'www.cpf.gov.sg';
const entryUrl = 'https://www.cpf.gov.sg/Members/Careers/careers/cpfb-careers';
// const domainName = 'adelphi.digital';
// const entryUrl = 'https://adelphi.digital/';

/* setup crawler */
(async() => {

  const browser = await puppeteer.launch();
  console.log(chalk.green('Browser launched'));

  crawledURLs.push(entryUrl);
  await crawlAllURLs(entryUrl, browser);

  q.start(async (err) => {
    if (err) console.log(`Queue start error: ${err}`);

    console.log(chalk.green('Generating report...'));

    fs.writeFile(`${resultsFolder}/crawledURLs.json`, JSON.stringify(crawledURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/crawledURLs.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/crawledPages.json`, JSON.stringify(crawledPages), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/crawledPages.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/testedPages.json`, JSON.stringify(testedPages), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/testedPages.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/invalidURLs.json`, JSON.stringify(invalidURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/invalidURLs.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/pagesWithExternalIframes.json`, JSON.stringify(pagesWithExternalIframes), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithExternalIframes.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/pagesWithExternalImages.json`, JSON.stringify(pagesWithExternalImages), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithExternalImages.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/pagesWithExternalVideos.json`, JSON.stringify(pagesWithExternalVideos), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithExternalVideos.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/brokenLinks.json`, JSON.stringify(brokenURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/brokenLinks.json`)} is saved.`);
    });

    fs.writeFile(`${resultsFolder}/errorLogs.json`, JSON.stringify(errorLogs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/errorLogs.json`)} is saved.`);
    });

    await browser.close();
    console.log(chalk.green('Browser closed'));

    jsonToCsv.jsonToCsv([`${resultsFolder}/pagesWithExternalIframes.json`, `${resultsFolder}/pagesWithExternalImages.json`, `${resultsFolder}/pagesWithExternalVideos.json`], resultsFolder);
  });

})();

const crawlAllURLs = async (url, browser) => {
  let page = await browser.newPage();

  console.log(`${chalk.magentaBright('New page created:')} loading ${url}...`);
  await page.goto(url).catch((err) => {
    console.log(err);
  });
  console.log(`${chalk.magentaBright('URL loaded:')} ${url}`);

  console.log(`${chalk.cyan('Parsing all links in:')} ${url}...`);
  const links = await getAllLinks(page);
  console.log(`${chalk.cyan('Got all links in:')} ${url}`);

  console.log(`${chalk.cyan('Checking each link in:')} ${url}...`);
  for (let i = 0; i < links.length; i++) {
    // if (crawledURLs.length >= 15) {
    //   break;
    // }

    /* Check if the {links[i]} is valid URL format */
    if (!isValidURL(links[i])) {
      console.log(`${chalk.red('Invalid link:')} ${links[i]}`);
      invalidURLs.push(links[i]);
      continue;
    }

    /* remove # from last character of {url} */
    let cleanUrl = (links[i].slice(-1) == '#') ? links[i].slice(0, -1) : links[i];

    /* check if {cleanUrl} is crawled before */
    if (isCrawled(cleanUrl)) {
      continue;
    }

    /* check if {cleanUrl} is tested before */
    if (isTested(cleanUrl)) {
      continue;
    }

    /* Check for {cleanUrl} is broken links */
    console.log(`${chalk.cyan('Testing link response:')} ${cleanUrl}`)
    const testPage = await browser.newPage();
    console.log(`Test page created. Loading: ${cleanUrl}...`);
    let isBrokenURL = false;
    let testResponseError = false;
    const testResponse = await testPage.goto(cleanUrl).catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${err}`);
      isBrokenURL = true;
      testResponseError = true;
      errorLogs.push(err);
    });
    if (!testResponseError) {
      await testPage.waitFor(1000);
      isBrokenURL = (!testResponse.ok());
    }
    console.log(`Test page visiting: ${cleanUrl}`);
    console.log(`${cleanUrl} is broken? ${chalk.yellow(isBrokenURL)}`);

    const testPageObj = {
      source: url,
      url: cleanUrl,
      code: (testResponseError) ? null : testResponse.status()
    };

    if (testPageObj.code != 403) {
      testedURLs.push(cleanUrl);
      testedPages.push(testPageObj);
    }

    await testPage.close();
    console.log(`Test page closed: ${cleanUrl}`);


    if (isBrokenURL && testPageObj.code != 403) {
      console.log(`${chalk.red('Broken link:')} ${cleanUrl}`);
      brokenURLs.push(testPageObj);
    }

    /* TO FIX: have to continue even if it's 403 code */
    /* validate URL format */
    if (isInternalURL(cleanUrl, domainName)) {
      console.log(`${chalk.yellowBright('New URL found:')} ${cleanUrl}`);
      crawledURLs.push(cleanUrl);

      /* queue crawling new URL*/
      q.push(async (cb) => {
        await crawlAllURLs(cleanUrl, browser);
        cb();
      });
    }

  }
  console.log(`${chalk.cyan('All links retrieved in')}: ${url}`);

  // =====================================================
  /* Do other fun things for this page here */
  // console.log('Taking screenshot...');
  // await takeScreenshot(page);

  /* retrieve the HTML of the rendered page */
  // console.log(`${chalk.bgMagenta('Getting HTML of the page:')} ${url}...`);
  // let HTML = await page.content();

  // console.log(`${chalk.bgMagenta('Finding iframes in:')} ${url}`)
  // await getPagesWithExternalIframes(page, url, domainName);
  // console.log(`${chalk.bgMagenta('All iframes found in:')} ${url}`);
  // console.log(`${chalk.bgMagenta('Finding images in:')} ${url}`)
  // await getPagesWithExternalImages(page, url, domainName);
  // console.log(`${chalk.bgMagenta('All images found in:')} ${url}`);
  // console.log(`${chalk.bgMagenta('Finding videos in:')} ${url}`)
  // await getPagesWithExternalVideos(page, url, domainName);
  // console.log(`${chalk.bgMagenta('All videos found in:')} ${url}`);


  // let index = crawledURLs.indexOf(url);
  // console.log(`${chalk.bgMagenta('Scanning WCAG for:')} ${url}`);
  // await wcagTester.wcagTester(url, `${resultsFolder}/wcag`, `${index}.html`, `${index}.jpg`);
  // console.log(`${chalk.bgMagenta('Finished scanning WCAG for:')} ${url}`);

  // console.log(`${chalk.bgMagenta('Validating HTML for:')} ${url}`);
  // await htmlValidator.htmlValidate(url, HTML, `${resultsFolder}/html-validate`, `${index}`);
  // console.log(`${chalk.bgMagenta('Finish validating HTML for:')} ${url}`);

  // await page.close();
  // console.log(`${chalk.magentaBright('Page closed:')} ${url}`);
};

const _getPathName = (url, basePath) => {
  let newUrl = url.replace(basePath, "");
  newUrl = newUrl.trim('/').replace(/\//g, '-');
  return newUrl;
}

const isCrawled = (url) => {
  return (crawledURLs.indexOf(url) > -1);
};

const isTested = (url) => {
  return (testedURLs.indexOf(url) > -1);
};

const isValidURL = (url) => {
  /*
  condition:
  - should only start with http:// or https://
  - should not end with .pdf
  */
  const urlFormat = /^http(s)?:\/\/(.(?!\.pdf$))*$/;
  return (url.match(urlFormat) !== null);
};

const isInternalURL = (url, domain) => {
  /* URL should contain the domain name */
  const urlFormat = new RegExp(`^http(s)?:\/\/${domainName}`);
  return (url.match(urlFormat) !== null);
}

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

// const hasIframe = (html) => {
//   /* find if the html has iframe which:
//     - NOT <iframe sandbox=... (from WOGAA)
//     - NOT <iframe id="stSegmentFrame"... (from addthis)
//    */
//   let regex = /<iframe\s(?!sandbox)(?!id="stSegmentFrame")(?!id="stLframe")/g;

//   return regex.test(html);
// };

const getPagesWithExternalIframes = async (page, url, domain) => {
  let $iframes = await page.$$('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])');

  if ($iframes.length > 0) {
    let temp = [];

    const iframes = await page.$$eval('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])', fs => fs.map(f => f.src));
    for (let i = 0; i < iframes.length; i++) {
      if (isExternalSource(iframes[i], domain)) {
        temp.push(iframes[i]);
      }
    }

    if (temp.length > 0) {
      let obj = {
        url: url,
        iframes: temp
      };

      pagesWithExternalIframes.push(obj);
    }
  }
}

const getPagesWithExternalImages = async (page, url, domain) => {
  let $images = await page.$$('img');

  if($images.length > 0) {
    let temp = [];

    const images = await page.$$eval('img', imgs => imgs.map(img => img.src));
    for (let i = 0; i < images.length; i++) {
      if (isExternalSource(images[i], domain)) {
        temp.push(images[i]);
      }
    }

    if (temp.length > 0) {
      let obj = {
        url: url,
        images: temp
      }

      pagesWithExternalImages.push(obj);
    }
  }
}

const getPagesWithExternalVideos = async (page, url, domain) => {
  let $videos = await page.$$('video');

  if ($videos.length > 0) {
    let temp = [];

    const videos = await page.$$eval('video', vids => vids.map(vid => vid.src));
    for (let i = 0; i < videos.length; i++) {
      if (isExternalSource(videos[i], domain)) {
        temp.push(videos[i]);
      }
    }

    if (temp.length > 0) {
      let obj = {
        url: url,
        videos: temp
      }

      pagesWithExternalVideos.push(obj);
    }
  }
}

const isExternalSource = (url, domain) => {
  return (!url.includes(domain));
};

const takeScreenshot = async (page) => {
  const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      deviceScaleFactor: window.devicePixelRatio
    };
  });
  console.log(`Dimension of the page: ${JSON.stringify(dimensions)}`);

  page.setViewport({
    width: dimensions.width,
    height: dimensions.height
  });
  await page.screenshot({
    path: `${resultsFolder}/${globalIndex}.jpg`
  });
  globalIndex++;
  console.log('Screenshot is saved.');
}

const getAllLinks = async (page) => {
  const links = await page.$$eval('a', as => as.map(a => a.href));

  return links;
}
