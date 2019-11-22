/* Utilisation functions */

const fs = require('fs');
const request = require('request');

/* Get Domain Name from URL */
const getDomainName = (url) => {
  let domain = url.replace(/^http(s)?:\/\//, '').split('/')[0];

  return domain;
};

/* Download gallery images, one by one */
const download = (uri, filename, callback) => {
  console.log(`${chalk.yellowBright('Downloading')} ${uri}`);
  request.head(uri, (err, res, body) => {
    request(uri).pipe(fs.createWriteStream(filename))
      .on('error', (errMsg) => {
        console.log(`${chalk.redBg('Download Error:')} ${errMsg}`);
      })
      .on('close', callback);
  });
};

/* Create folder of folderName if the folder does not exist */
const createFolder = (folderName) => {
  if (!fs.existsSync(folderName)) {
    console.log(`${folderName} folder not found. Creating new folder...`)
    fs.mkdirSync(folderName);
    console.log(`${folderName} folder is created.`);
  }
}

const isCrawled = (url, crawledURLs) => {
  return (crawledURLs.indexOf(url) > -1);
};

/* To check if URL is internal */
const isInternalURL = (url, domain) => {
  /*
  condition:
  - {url} should start with domain to be recognized as internal URL
  */
  const urlFormat = new RegExp(`^http(s)?:\/\/${domain}`);
  return (url.match(urlFormat) !== null);
}

const isFileLink = (url) => {
  /*
  condition:
  - should only start with http:// or https://
  - should end with .{ext} or .{ext}?xxx, where {ext} = pdf, jpg, jpeg, png, xls, xlsx, doc, docx
  */
  const urlFormat = /^http(s)?:\/\/.+(\.(pdf|jpe?g|png|xlsx?|docx?|mp3|mp4)(\?.*)?){1}$/;
  return (url.match(urlFormat) !== null);
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

/* Retrieve all anchor links found in the page */
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

/* Take screenshot of the page in mobile and desktop version  */
const takeScreenshot = async (args) => {
  let { page, mobileDimension, desktopDimension, outputPath, outputFileName} = args;

  /* Screenshot for mobile */
  page.setViewport({
    width: mobileDimension.width,
    height: mobileDimension.height
  });
  await page.screenshot({
    path: `${outputPath}/screenshots/mobile/${outputFileName}`,
    fullPage: true
  });

  console.log('Mobile screenshot is saved.');

  /* Screenshot for desktop */
  page.setViewport({
    width: desktopDimension.width,
    height: desktopDimension.height
  });
  await page.screenshot({
    path: `${outputPath}/screenshots/desktop/${outputFileName}`,
    fullPage: true
  });

  console.log('Desktop screenshot is saved.');
}

/* Check if the url is external URL */
const isExternalSource = (url, domain) => {
  return (!url.includes(domain));
};

module.exports = {
  getDomainName,
  download,
  isCrawled,
  createFolder,
  isInternalURL,
  isFileLink,
  isValidURL,
  getAllLinks,
  takeScreenshot
};
