// let Crawler = require('simplecrawler');
const puppeteer = require('puppeteer');
const { Parser } = require('json2csv');
const path = require('path');
const fs = require('fs');
const queue = require('queue');

/* prepare CSV format */
// let fields = ['url', 'type', 'loading_time', 'status'];
// const parser = new Parser({ fields });
let crawledURLs = [];
let invalidURLs = [];
let hasIframeUrls = [];

let q = new queue({
  concurrency: 5
});

let globalIndex = 0;

const resultsFolder = 'reports';

const domainName = 'https://www.smartnation.sg/';
const entryUrl = 'https://www.smartnation.sg/';

/* setup crawler */
(async() => {

  const browser = await puppeteer.launch();
  console.log('Browser launched');

  crawledURLs.push(entryUrl);
  await crawlAllURLs(entryUrl, browser);

  console.log('start processing the queue');
  q.start(async (err) => {
    if (err) console.log(`Queue start error: ${err}`);

    console.log(`Completed: URLs crawled ${crawledURLs}`);
    console.log('Generating report...');

    fs.writeFile(`${resultsFolder}/crawledURLs.json`, JSON.stringify(crawledURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`Crawled URLs saved in ${resultsFolder}/crawledURLs.json`);
    });

    fs.writeFile(`${resultsFolder}/invalidURLs.json`, JSON.stringify(invalidURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`Invalid URLs saved in ${resultsFolder}/invalidURLs.json`);
    });

    fs.writeFile(`${resultsFolder}/hasIframe.json`, JSON.stringify(hasIframeUrls), (err, data) => {
      if (err) console.log(err);

      console.log(`URLs with iframe is saved in ${resultsFolder}/hasIframe.json`);
    });
    await browser.close();
  });

})();

const crawlAllURLs = async (url, browser) => {
  console.log('====== Start new page ======');
  let page = await browser.newPage();

  console.log(`New page created, loading ${url}`);
  await page.goto(url).catch((err) => {
    console.log(err);
  });
  console.log(`Loaded ${url}`);

  console.log(`Parsing all links in the ${url}...`);
  const links = await getAllLinks(page);
  console.log(`Got all links in ${url}`);

  console.log(`Checking each link in ${url}...`);
  for (let i = 0; i < links.length; i++) {
    /* validate URL format */
    // if (crawledURLs.length < 5) {
      if (isValidURL(links[i]) && isInternalURL(links[i], domainName)) {
        /* check if {link[i]} is crawled before */
        if (isCrawled(links[i])) {
          /* {links[i]} is crawled before */
        } else {
          console.log(`New URL: ${links[i]}`);
          crawledURLs.push(links[i]);

          /* queue crawling new URL */
          q.push(async (cb) => {
            console.log(`Start crawling ${links[i]}...`);
            await crawlAllURLs(links[i], browser);
            cb();
          });
        }
      } else {
        invalidURLs.push(links[i]);
      }
    // } else {
    //   break;
    // }
  }
  console.log(`All links in ${url} are retrieved.`);

  /* Do other fun things for this page here */
  // console.log('Taking screenshot...');
  // await takeScreenshot(page);

  /* retrieve the HTML of the rendered page */
  console.log(`Getting HTML of the page ${url}...`);
  let HTML = await page.content();

  /* get all iframes */
  let $iframes = await page.$$('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])');

  if ($iframes.length > 0) {
    console.log(`${url} has iframe`);

    let obj = {
      url: url,
      iframes: []
    };

    const iframes = await page.$$eval('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])', fs => fs.map(f => f.src));
    for (let j = 0; j < iframes.length; j++) {
      obj.iframes.push(iframes[j]);
    }
    hasIframeUrls.push(obj);
  }

  await page.close();
  console.log(`Page ${url} closed`);
  console.log('====== End of page ======');
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

  // const fileName = 'index.html';

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
