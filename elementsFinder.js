const findIframes = async (page, url) => {
  let $iframes = await page.$$('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])');
  let pagesWithIframes = [];

  if ($iframes.length > 0) {
    const iframes = await page.$$eval('iframe:not([sandbox]):not([id="stSegmentFrame"]):not([id="stLframe"])', fs => fs.map(f => f.src));

    for (let i = 0; i < iframes.length; i++) {
      pagesWithIframes.push({
        pageUrl: url,
        iframes: iframes[i]
      });
    }
  }

  return pagesWithIframes;
};

const findImages = async (page, url) => {
  let $images = await page.$$('img');
  let pagesWithImages = [];

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

    for (let i = 0; i < images.length; i++) {
      pagesWithImages.push({
        pageUrl: url,
        images: images[i]
      })
    }
  }

  return pagesWithImages;
}

const findVideos = async (page, url) => {
  let $videos = await page.$$('video');
  let pagesWithVideos = [];

  if ($videos.length > 0) {

    const videos = await page.$$eval('video', vids => vids.map(vid => vid.querySelector('source').src));

    for (let i = 0; i < videos.length; i++) {
      pagesWithVideos.push({
        pageUrl: url,
        videos: videos[i]
      });
    }
  }

  return pagesWithVideos;
}

module.exports = { findIframes, findImages, findVideos };
