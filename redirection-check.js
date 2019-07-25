const fs = require('fs');
const puppeteer = require('puppeteer');
const chalk = require('chalk');
const queue = require('queue');
const readFile = util.promisify(fs.readFile);

let urls = [];
let errors = [];

let q = new queue({
  concurrency: 5
});

let browser;

let configuration = {
  urlsMapSource: '/src/exampleRedirectionMap.json'
};

(async () => {
  const urlsMap = await readFile(configuration.urlsMapSource).catch(err => {
    console.log(err);
  });

  const pages = JSON.parse(urlsMap);


  browser = await puppeteer.launch();
  console.log(chalk.yellow('Browser launched'));

  pages.map(async (page) => {
    q.push(async cb => {
      await testing(page);
    })
  });

  q.start(async err => {
    if (err) console.log(chalk.red(err));

    fs.writeFile('reports/redirectionTestResults.json', JSON.stringify(urls), (err, data) => {
      if (err) console.log(err);
      console.log(`${chalk.underline.blueBright(`reports/redirectionTestResults.json`)} is saved`);
    })
    fs.writeFile('reports/redirectionTestErrors.json', JSON.stringify(errors), (err, data) => {
      if (err) console.log(err);
      console.log(`${chalk.underline.blueBright(`reports/redirectionTestErrors.json`)} is saved`);
    });

    await browser.close();
  });

})();

const testing = async (page) => {
  let chromePage = await browser.newPage().catch(err => {
    console.log(err)
  });
  console.log(chalk.yellow('New page created'));
  await chromePage.goto(page.origin).catch(err => {
    errors.push(err);
  });
  console.log(chalk.yellow('Page URL:' + page.origin));
  await chromePage.waitForNavigation().catch(err => {
    errors.push(err);
  });
  let redirectedUrl = await chromePage.url();

  urls.push({
    origin: page.origin,
    destination: page.destination,
    result: redirectedUrl,
    matched: (page.destination.toLowerCase() == redirectedUrl.toLowerCase())
  });

  await chromePage.close();
};
