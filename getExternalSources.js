const chalk = require('chalk');
const {isInternalURL} = require('./cosmicUtils.js');

const externalSources = async (page, url, domain) => {
  console.log(`${chalk.bgMagenta('Finding iframes in:')} ${url}`)
  let externalIframes = await getPagesWithExternalIframes(page, url, domain);
  console.log(`${chalk.bgMagenta('All iframes found in:')} ${url}`);

  console.log(`${chalk.bgMagenta('Finding images in:')} ${url}`)
  let externalImages = await getPagesWithExternalImages(page, url, domain);
  console.log(`${chalk.bgMagenta('All images found in:')} ${url}`);

  console.log(`${chalk.bgMagenta('Finding videos in:')} ${url}`)
  let externalVideos = await getPagesWithExternalVideos(page, url, domain);
  console.log(`${chalk.bgMagenta('All videos found in:')} ${url}`);

  return {
    externalIframes,
    externalImages,
    externalVideos
  }
};

const getPagesWithExternalIframes = async (page, url, domain) => {
  let $iframes = await page.$$('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])');

  let externalIframes = [];


  if ($iframes.length > 0) {
    const iframes = await page.$$eval('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])', fs => fs.map(f => f.src));
    for (let i = 0; i < iframes.length; i++) {
      if (!isInternalURL(iframes[i], domain)) {
        externalIframes.push({
          pageUrl: url,
          iframe: iframes[i]
        });
      }
    }
  }

  return externalIframes;
}

const getPagesWithExternalImages = async (page, url, domain) => {
  let $images = await page.$$('img');

  let externalImages = [];

  if($images.length > 0) {

    const images = await page.$$eval('img', imgs => imgs.map(img => img.src));
    for (let i = 0; i < images.length; i++) {
      if (!isInternalURL(images[i], domain)) {
        externalImages.push({
          pageUrl: url,
          image: images[i]
        });
      }
    }
  }

  return externalImages;
}

const getPagesWithExternalVideos = async (page, url, domain) => {
  let $videos = await page.$$('video');

  let externalVideos = [];

  if ($videos.length > 0) {

    const videos = await page.$$eval('video', vids => vids.map(vid => vid.src));
    for (let i = 0; i < videos.length; i++) {
      if (!isInternalURL(videos[i], domain)) {
        externalVideos.push({
          pageUrl: url,
          video: videos[i]
        });
      }
    }
  }

  return externalVideos;
}

module.exports = externalSources;
