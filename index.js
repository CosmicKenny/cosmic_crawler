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
const jsonToCsv = require('./jsonToCsv.js');

let crawledURLs = [];
let invalidURLs = [];
let pagesWithExternalIframes = [];
let pagesWithExternalImages = [];
let pagesWithExternalVideos = [];

let q = new queue({
  concurrency: 5
});

let globalIndex = 0;
let testRun = 0;

const resultsFolder = 'reports';

const domainName = 'www.population.sg';
const entryUrl = 'https://www.population.sg/articles';
// const domainName = 'adelphi.digital';
// const entryUrl = 'https://adelphi.digital/';

/* setup crawler */
(async() => {

  const browser = await puppeteer.launch();
  console.log(chalk.green('Browser launched'));

  /* sameUrlCrawling = true when there is no different page URL for different pages in listing page */
  const sameUrlCrawling = true;

  if (sameUrlCrawling) {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1366,
      height: 768
    });
    console.log(`${chalk.magentaBright('New page created:')} loading ${entryUrl}...`);
    await page.goto(entryUrl).catch((err) => {
      console.log(err);
    });
    console.log(`${chalk.magentaBright('URL loaded:')} ${entryUrl}`);

    crawledURLs.push(entryUrl);
    await crawlAllURLsInAjax(entryUrl, page, browser);

    await page.close();
    console.log(`${chalk.magentaBright('Page closed:')} ${entryUrl}`);
  } else {
    crawledURLs.push(entryUrl);
    await crawlAllURLs(entryUrl, browser);
  }

  q.start(async (err) => {
    if (err) console.log(`Queue start error: ${err}`);

    console.log(chalk.green('Generating report...'));

    fs.writeFile(`${resultsFolder}/crawledURLs.json`, JSON.stringify(crawledURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/crawledURLs.json`)} is saved.`);
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

    await browser.close();
    console.log(chalk.green('Browser closed'));

    jsonToCsv.jsonToCsv([`${resultsFolder}/pagesWithExternalIframes.json`, `${resultsFolder}/pagesWithExternalImages.json`, `${resultsFolder}/pagesWithExternalVideos.json`], resultsFolder);
  });

})();

const crawlAllURLsInAjax = async (url, page, browser) => {
  let links;
  console.log(`${chalk.magentaBright('Waiting for links to be available...')}`);
  await page.waitForSelector('#wsContentListTable a');
  console.log(`${chalk.magentaBright('Links are loaded. Parsing all links...')}`);
  links = await getAllLinks(page, '#wsContentListTable');

  console.log(`${chalk.cyan('Got all links in:')} ${url}`);
  console.log(`${chalk.cyan('Checking each link in:')} ${url}...`);
  for (let i = 0; i < links.length; i++) {
    // if (crawledURLs.length >= 10) {
    //   break;
    // }
    /* validate URL format */
    if (isValidURL(links[i]) && isInternalURL(links[i], domainName)) {
      /* check if {link[i]} is crawled before */
      if (isCrawled(links[i])) {
        /* {links[i]} is crawled before */
      } else {
        console.log(`${chalk.yellowBright('New URL found:')} ${links[i]}`);
        crawledURLs.push(links[i]);
        /* queue crawling new URL*/
        q.push(async (cb) => {
          await crawlAllURLs(links[i], browser);
          cb();
        });
      }
    } else {
      invalidURLs.push(links[i]);
    }
  }
  console.log(`${chalk.cyan('All links retrieved in')}: ${url}`);

  /* Do other fun things for this page here */
  // if (testRun >= 5) {
  //   return;
  // }
  testRun++;
  console.log(`Test run ${testRun}`);

  /* Checked if next button is disabled */
  const isNextButtonDisabled = await page.$eval('#wsContentListTable_next', node => node.classList.contains('disabled'));
  await page.screenshot({
    path: `reports/${testRun}.jpg`
  });
  if (isNextButtonDisabled || testRun >= 60) {
    return;
  }

  const nextLink = await page.waitForSelector('#wsContentListTable_next a');
  await nextLink.click();
  console.log('next link clicked');
  await page.waitForSelector('#wsContentListTable_processing', {
    hidden: true
  });
  console.log('loading gif hidden');
  await crawlAllURLsInAjax(url, page, browser);
}

const crawlAllURLs = async (url, browser) => {
  let links;

  const page = await browser.newPage();

  console.log(`${chalk.magentaBright('New page created:')} loading ${url}...`);
  await page.goto(url).catch((err) => {
    console.log(err);
  });
  console.log(`${chalk.magentaBright('URL loaded:')} ${url}`);

  console.log(`${chalk.cyan('Parsing all links in:')} ${url}...`);
  links = await getAllLinks(page);

  console.log(`${chalk.cyan('Got all links in:')} ${url}`);
  console.log(`${chalk.cyan('Checking each link in:')} ${url}...`);
  for (let i = 0; i < links.length; i++) {
    // if (crawledURLs.length >= 10) {
    //   break;
    // }
    /* validate URL format */
    if (isValidURL(links[i]) && isInternalURL(links[i], domainName)) {
      /* check if {link[i]} is crawled before */
      if (isCrawled(links[i])) {
        /* {links[i]} is crawled before */
      } else {
        console.log(`${chalk.yellowBright('New URL found:')} ${links[i]}`);
        crawledURLs.push(links[i]);
        /* queue crawling new URL*/
        q.push(async (cb) => {
          await crawlAllURLs(links[i], browser);
          cb();
        });
      }
    } else {
      invalidURLs.push(links[i]);
    }
  }
  console.log(`${chalk.cyan('All links retrieved in')}: ${url}`);

  /* Do other fun things for this page here */
  // console.log('Taking screenshot...');
  // await takeScreenshot(page);

  console.log(`${chalk.bgMagenta('Finding iframes in:')} ${url}`)
  await getPagesWithExternalIframes(page, url, domainName);
  console.log(`${chalk.bgMagenta('All iframes found in:')} ${url}`);
  console.log(`${chalk.bgMagenta('Finding images in:')} ${url}`)
  await getPagesWithExternalImages(page, url, domainName);
  console.log(`${chalk.bgMagenta('All images found in:')} ${url}`);
  console.log(`${chalk.bgMagenta('Finding videos in:')} ${url}`)
  await getPagesWithExternalVideos(page, url, domainName);
  console.log(`${chalk.bgMagenta('All videos found in:')} ${url}`);

  await page.close();
  console.log(`${chalk.magentaBright('Page closed:')} ${url}`);
};

const _getPathName = (url, basePath) => {
  let newUrl = url.replace(basePath, "");
  newUrl = newUrl.trim('/').replace(/\//g, '-');
  return newUrl;
}

const isCrawled = (url) => {
  let cleanUrl = url;
  return (crawledURLs.indexOf(cleanUrl) > -1);
};

const isValidURL = (url) => {
  /* URL should only start with http:// or https:// */
  const urlFormat = /^http(s)?:\/\//;
  return (url.match(urlFormat));
};

const isInternalURL = (url, domain) => {
  /* URL should contain the domain name */
  /* TO FIX: need to handle the case if the domain name is not at the beginning. e.g.: for www.abc.com?param=www.domain.com */
  return (url.includes(domain));
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

const getAllLinks = async (page, wrapper = '') => {
  const links = await page.$$eval(`${wrapper} a`, as => as.map(a => a.href));

  return links;
}
