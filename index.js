// let Crawler = require('simplecrawler');
const puppeteer = require('puppeteer');
const { Parser } = require('json2csv');
const fs = require('fs');
const queue = require('queue');

/* prepare CSV format */
// let fields = ['url', 'type', 'loading_time', 'status'];
// const parser = new Parser({ fields });
let crawledURLs = [];
let invalidURLs = [];

let q = new queue({
  concurrency: 5
});

let globalIndex = 0;

const entryUrl = 'https://www.areyouready.sg/';
// const entryUrl = 'https://www.academyofsingaporeteachers.moe.gov.sg/';
// const entryUrl = 'https://adelphi.digital/';

/* setup crawler */
(async() => {

  const browser = await puppeteer.launch();
  console.log('Browser launched');

  crawledURLs.push(entryUrl);
  await crawlAllURLs(entryUrl, browser);

  // q.on('success', (result, job) => {
  //   console.log(`Job done: ${job}`);
  // });

  console.log('start processing the queue');
  q.start(async (err) => {
    if (err) console.log(`Queue start error: ${err}`);

    console.log(`Completed: URLs crawled ${crawledURLs}`);
    console.log('Generating report...')
    fs.writeFile('report/crawledURLs.json', JSON.stringify(crawledURLs), (err, data) => {
      if (err) console.log(err);

      console.log('Crawled URLs saved in report/crawledURLs.json');
    });

    fs.writeFile('report/invalidURLs.json', JSON.stringify(invalidURLs), (err, data) => {
      if (err) console.log(err);

      console.log('Invalid URLs saved in report/invalidURLs.json');
    });
    await browser.close();
  });

})();

const crawlAllURLs = async (url, browser) => {
  console.log('====== Start new page ======');
  let page = await browser.newPage();
  console.log('New page created');

  console.log(`Loading ${url}...`);
  await page.goto(url).catch((err) => {
    console.log(err);
  });
  console.log(`Loaded`);

  console.log('Parsing all links in the page...');
  const links = await getAllLinks(page);
  console.log(`Got all links in ${url}`);

  // console.log('Taking screenshot...');
  // await takeScreenshot(page);

  // console.log('Storing HTML');
  // await saveHTML(page, url);

  console.log(`Checking each link in ${url}...`);
  console.log(`Number of links: ${links.length}`);
  for (let i = 0; i < links.length; i++) {
    /* validate URL format */
    if (crawledURLs.length < 100) {
      if (isValidURL(links[i]) && isInternalURL(links[i], entryUrl)) {
        /* check if {link} is crawled before */
        if (crawledURLs.indexOf(links[i]) > -1) {
          /* {link} is crawled before */
          console.log(`Crawled URL: ${links[i]}`);
        } else {
          console.log(`New URL: ${links[i]}`);
          crawledURLs.push(links[i]);
          console.log(`Crawled URLs: ${ JSON.stringify(crawledURLs)}`);

          /* queue crawling new URL */
          q.push(async (cb) => {
            console.log(`Start crawling ${links[i]}...`);
            await crawlAllURLs(links[i], browser);
            cb();
          });
        }
      } else {
        console.log(`Invalid URL: ${links[i]}`);
        invalidURLs.push(links[i]);
      }
    } else {
      break;
    }
  }
  console.log(`All links in ${url} are retrieved.`);
  await page.close();
  console.log('Page closed');
  console.log('====== End of page ======')
};

const getPathName = (url, basePath) => {
  let newUrl = url.replace(basePath, "");
  let pathSections = newUrl.split('/');
  console.log(`path name ${pathSections}`);
  return newUrl;
}

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

  fs.writeFile('report/homepage.html', pageContent, (err, data) => {
    if (err) console.log(err);

    console.log('HTML saved.');
  });
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
    path: 'report/' + globalIndex + '.jpg'
  });
  globalIndex++;
  console.log('Screenshot is saved.');
}

const getAllLinks = async (page) => {
  const links = await page.$$eval('a', as => as.map(a => a.href));

  return links;
}
