const chalk = require('chalk');
/* color convention:
  - magentaBright: page level status
  - green: browser status
  - blueBright: link or file path
  - bgMagenta: custom plugin
 */
const util = require('util');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const queue = require('queue');
const jsonMerger = require('./jsonMerger.js');
const wcagTester = require('./wcagTester.js');
const htmlValidator = require('./htmlValidate');

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

let q = new queue({
  concurrency: 5
});

const resultsFolder = configuration.reportsFolderPath;

const domainName = configuration.domain;
const entryUrl = configuration.entryUrl;
const urlPattern = configuration.urlPattern;
const disableCrawl = configuration.disableCrawl;

const createFolder = (folderName) => {
  if (!fs.existsSync(folderName)) {
    console.log(`${folderName} folder not found. Creating new folder...`)
    fs.mkdirSync(folderName);
    console.log(`${folderName} folder is created.`);
  }
}

/* setup crawler */
const setup = () => {
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
      fs.writeFile(`${resultsFolder}/crawledURLs.json`, JSON.stringify(crawledURLs), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/crawledURLs.json`)} is saved.`);
      });
    }

    if (configuration.savePageInfo) {
      fs.writeFile(`${resultsFolder}/crawledPages.json`, JSON.stringify(crawledPages), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/crawledPages.json`)} is saved.`);
      });
    }

    fs.writeFile(`${resultsFolder}/invalidURLs.json`, JSON.stringify(invalidURLs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/invalidURLs.json`)} is saved.`);
    });

    if (configuration.checkIframeExist) {
      let items = [];
      pagesWithIframes.map(item => {
        item.iframes.map(iframe => {
          items.push({
            pageUrl: item.pageUrl,
            iframe: iframe
          });
        });
      });
      fs.writeFile(`${resultsFolder}/pagesWithIframes.json`, JSON.stringify(items), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithIframes.json`)} is saved.`);
      });
    }

    if (configuration.checkImageExist) {
      let items = [];
      pagesWithImages.map(item => {
        item.images.map(image => {
          let { src, naturalWidth, naturalHeight, width, height, oversize, overcompressed} = image;
          items.push({
            pageUrl: item.pageUrl,
            src,
            naturalWidth,
            naturalHeight,
            width,
            height,
            oversize,
            overcompressed
          });
        });
      });
      fs.writeFile(`${resultsFolder}/pagesWithImages.json`, JSON.stringify(items), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithImages.json`)} is saved.`);
      });
    }

    if (configuration.detectFileLink) {
      let items = [];
      pagesWithFiles.map(item => {
        item.files.map(file => {
          items.push({
            pageUrl: item.pageUrl,
            files: file
          });
        });
      });
      fs.writeFile(`${resultsFolder}/pagesWithFiles.json`, JSON.stringify(items), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithFiles.json`)} is saved.`);
      });
    }

    if (configuration.checkVideoExist) {
      let items = [];
      pagesWithVideos.map(item => {
        item.videos.map(video => {
          items.push({
            pageUrl: item.pageUrl,
            video: video
          });
        });
      });
      fs.writeFile(`${resultsFolder}/pagesWithVideos.json`, JSON.stringify(items), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithVideos.json`)} is saved.`);
      });
    }

    if (configuration.detectExternalResource) {
      let iframes = [];
      let images = [];
      let videos = [];
      pagesWithExternalIframes.map(item => {
        item.iframes.map(iframe => {
          iframes.push({
            pageUrl: item.url,
            iframe: iframe
          });
        });
      });
      pagesWithExternalImages.map(item => {
        item.images.map(image => {
          images.push({
            pageUrl: item.url,
            image: image
          });
        });
      });
      pagesWithExternalVideos.map(item => {
        item.videos.map(video => {
          videos.push({
            pageUrl: item.url,
            video: video
          });
        });
      });
      fs.writeFile(`${resultsFolder}/pagesWithExternalIframes.json`, JSON.stringify(iframes), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithExternalIframes.json`)} is saved.`);
      });

      fs.writeFile(`${resultsFolder}/pagesWithExternalImages.json`, JSON.stringify(images), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithExternalImages.json`)} is saved.`);
      });

      fs.writeFile(`${resultsFolder}/pagesWithExternalVideos.json`, JSON.stringify(videos), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/pagesWithExternalVideos.json`)} is saved.`);
      });
    }

    if (configuration.checkBrokenLink) {
      fs.writeFile(`${resultsFolder}/brokenLinks.json`, JSON.stringify(brokenURLs), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/brokenLinks.json`)} is saved.`);
      });

      fs.writeFile(`${resultsFolder}/testedPages.json`, JSON.stringify(testedPages), (err, data) => {
        if (err) console.log(err);

        console.log(`${chalk.underline.blueBright(`${resultsFolder}/testedPages.json`)} is saved.`);
      });
    }

    fs.writeFile(`${resultsFolder}/errorLogs.json`, JSON.stringify(errorLogs), (err, data) => {
      if (err) console.log(err);

      console.log(`${chalk.underline.blueBright(`${resultsFolder}/errorLogs.json`)} is saved.`);
    });

    await browser.close();
    console.log(chalk.green('Browser closed'));

    if (configuration.detectExternalResource) {
      jsonMerger([`${resultsFolder}/pagesWithExternalIframes.json`, `${resultsFolder}/pagesWithExternalImages.json`, `${resultsFolder}/pagesWithExternalVideos.json`], resultsFolder);
    }
  });

})();

const crawlAllURLs = async (url, browser) => {
  let page = await browser.newPage();

  await page.setViewport(configuration.viewportSize.desktop);

  let filesInfo = {
    pageUrl: url,
    files: []
  };

  console.log(`${chalk.magentaBright('New page created:')} loading ${url}...`);
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
        console.log(links[i]);
        filesInfo.files.push(cleanUrl);
      }
    }

    /* Check if the {cleanUrl} is valid URL format and non PDF file */
    if (!isValidURL(cleanUrl)) {
      console.log(`${chalk.red('Invalid link:')} ${cleanUrl}`);
      invalidURLs.push(cleanUrl);
      continue;
    }

    /* check if {cleanUrl} is crawled before */
    if (isCrawled(cleanUrl) || disableCrawl) {
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
    await takeScreenshot(page, index + 1);
  }

  if (configuration.detectFileLink) {
    console.log(`${chalk.bgYellow('NO OF FILES::')} ${filesInfo.files.length}`);
    if (filesInfo.files.length) {
      pagesWithFiles.push(filesInfo);
    }
  }

  if (configuration.checkIframeExist) {
    console.log(`${chalk.bgMagenta('Finding iframes in:')} ${url}`)
    await getPagesWithIframes(page, url);
    console.log(`${chalk.bgMagenta('All iframes found in:')} ${url}`);
  }

  if (configuration.checkImageExist) {
    console.log(`${chalk.bgMagenta('Finding images in:')} ${url}`)
    await getPagesWithImages(page, url);
    console.log(`${chalk.bgMagenta('All images found in:')} ${url}`);
  }

  if (configuration.checkVideoExist) {
    console.log(`${chalk.bgMagenta('Finding videos in:')} ${url}`)
    await getPagesWithVideos(page, url).catch(err => {
      errorLogs.push({
        url: url,
        error: err
      });
    });
    console.log(`${chalk.bgMagenta('All videos found in:')} ${url}`);
  }

  if (configuration.savePageInfo) {
    console.log(`${chalk.bgMagenta('Collecting page information of:')} ${url}`)
    await getPageInformation(page, url);
    console.log(`${chalk.bgMagenta('Page information is collected for:')} ${url}`);
  }

  if (configuration.detectExternalResource) {
    console.log(`${chalk.bgMagenta('Finding iframes in:')} ${url}`)
    await getPagesWithExternalIframes(page, url, domainName);
    console.log(`${chalk.bgMagenta('All iframes found in:')} ${url}`);
    console.log(`${chalk.bgMagenta('Finding images in:')} ${url}`)
    await getPagesWithExternalImages(page, url, domainName);
    console.log(`${chalk.bgMagenta('All images found in:')} ${url}`);
    console.log(`${chalk.bgMagenta('Finding videos in:')} ${url}`)
    await getPagesWithExternalVideos(page, url, domainName);
    console.log(`${chalk.bgMagenta('All videos found in:')} ${url}`);
  }

  if (configuration.scanWCAG) {
    console.log(`${chalk.bgMagenta('Scanning WCAG for:')} ${url}`);
    await wcagTester.wcagTester(url, `${resultsFolder}/wcag`, `${index + 1}`)
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
    await htmlValidator.htmlValidate(url, HTML, `${resultsFolder}/html-validate`, `${index + 1}`);
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

const getLastUpdatedDate = async (page, selector) => {
  const lastUpdatedText = await page.$eval(selector, node => node.innerHTML)
    .catch(err => {
      console.log(`${chalk.bgRed('ERROR:')} ${err}`);
      return null;
    });

  return lastUpdatedText;
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

const getPagesWithVideos = async (page, url) => {
  let $videos = await page.$$('video');
  let pageUrl = url;

  if ($videos.length > 0) {

    const videos = await page.$$eval('video', vids => vids.map(vid => vid.querySelector('source').src));

    if (videos.length) {
      const obj = {
        pageUrl: url,
        videos: videos
      };

      pagesWithVideos.push(obj);
    }
  }
}

const getPagesWithImages = async (page, url) => {
  let $images = await page.$$('img');

  if($images.length > 0) {

    const images = await page.$$eval('img', imgs => {
      return imgs.map(img => {
        return {
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          width: img.width,
          height: img.height,
          oversize: ((img.naturalWidth * img.naturalHeight) > (img.width * img.height) * 1.1),
          overcompressed: ((img.naturalWidth * img.naturalHeight) < (img.width * img.height) * 0.9)
        }
      });
    });

    if (images.length) {
      const obj = {
        pageUrl: url,
        images: images
      };

      pagesWithImages.push(obj);
    }

  }
}

const getPagesWithIframes = async (page, url) => {
  let $iframes = await page.$$('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])');
  let pageUrl = url;

  if ($iframes.length > 0) {
    const iframes = await page.$$eval('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])', fs => fs.map(f => f.src));

    if (iframes.length) {
      const obj = {
        pageUrl: url,
        iframes: iframes
      }

      pagesWithIframes.push(obj);
    }
  }
}

const getPageInformation = async (page, url) => {
  const title = await page.title().catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: err
    });
  });

  const description = await page.$eval('meta[name="description"]', node => node.attributes.content.value)
  .catch(err => {
    console.log(`${chalk.bgRed('ERROR:')} ${err}`);
    errorLogs.push({
      url: url,
      error: err
    });
    return null;
  });


  const lastUpdatedText = await getLastUpdatedDate(page, configuration.lastUpdatedTextSelector);

  let obj = {
    url: url,
    title: title,
    description: description,
    lastUpdatedText: lastUpdatedText
  }

  crawledPages.push(obj);
}

const isExternalSource = (url, domain) => {
  return (!url.includes(domain));
};

const takeScreenshot = async (page, index) => {
  // const dimensions = await page.evaluate(() => {
  //   return {
  //     width: document.documentElement.clientWidth,
  //     height: document.documentElement.clientHeight,
  //     deviceScaleFactor: window.devicePixelRatio
  //   };
  // });

  page.setViewport({
    width: configuration.viewportSize.mobile.width,
    height: configuration.viewportSize.mobile.height
  });
  await page.screenshot({
    path: `${resultsFolder}/screenshots/mobile/${index}.jpg`,
    fullPage: true
  });

  console.log('Mobile screenshot is saved.');

  page.setViewport({
    width: configuration.viewportSize.desktop.width,
    height: configuration.viewportSize.desktop.height
  });
  await page.screenshot({
    path: `${resultsFolder}/screenshots/desktop/${index}.jpg`,
    fullPage: true
  });

  console.log('Desktop screenshot is saved.');
}

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
}
