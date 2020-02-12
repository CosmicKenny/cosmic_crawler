const chalk = require('chalk');

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

  console.log(chalk.green('Mobile screenshot is saved.'));

  /* Screenshot for desktop */
  page.setViewport({
    width: desktopDimension.width,
    height: desktopDimension.height
  });
  await page.screenshot({
    path: `${outputPath}/screenshots/desktop/${outputFileName}`,
    fullPage: true
  });

  console.log(chalk.green('Desktop screenshot is saved.'));
}

module.exports = takeScreenshot;
