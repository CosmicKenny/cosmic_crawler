const http = require('http');
const { createFolder, getDomainName } = require('./cosmicUtils');
const fs = require('fs');

const saveHtmlSource = async (url, outputPath) => {

  /* Setup folder structure according to URL */
  let dirs = convertUrlToDirs(url);

  createFolder(outputPath);
  dirs.map(dir => {
    createFolder(`${outputPath}/${dir}`);
  });

  let filePath = outputPath + '/';
  filePath += (dirs.length == 0) ? '' : dirs[dirs.length - 1];
  filePath += '/index.html';

  let html = '';

  http.get(url, res => {
    console.log(res.statusCode);
    if (res.statusCode == 200) {
      res.on('data', chunk => html += chunk );
    }
    res.on('end', () => {

      html = html.replace(/href="http(s)?:\/\/nccs.uat.digital/g, "href=\"");
      html = html.replace(/src="http(s)?:\/\/nccs.uat.digital/g, "src=\"");
      html = html.replace(/href="http(s)?:\/\/www.nccs.gov.sg/g, "href=\"");
      html = html.replace(/src="http(s)?:\/\/www.nccs.gov.sg/g, "src=\"");
      html = html.replace(/href="\/\//g, "href=\"https://");
      html = html.replace(/src="\/\//g, "src=\"https://");
      html = html.replace(/\/\/www.google-analytics.com/g, "https://www.google-analytics.com");

      // change href internal links to relative depending on url structure
      // get home path relative to current location -> ../../
      let relativePathPrepend = '';

      for(i = 0; i < dirs.length; i++) {
        relativePathPrepend += '../';
      }

      // get each link on html
      
      // let assetPattern = new RegExp(/(href|src)="\/([^"]*)/g);
      let linkPattern = new RegExp(/<a\s+(?:[^>]*?\s+)?href="\/([^"]*)/g);
      let assetPattern = new RegExp(/<link\s+(?:[^>]*?\s+)?href=['"]([^https][\.\d\w\\/-]*)/g);
      let srcPattern = new RegExp(/<script\s+(?:[^>]*?\s+)?src\s*=\s*['"]([\w/\.\d\s-]*)["']>/g);
      let imgPattern = new RegExp(/<img\s+(?:[^>]*?\s+)?src="([^"]*)/g);
      let siteFinityJS = new RegExp(/<script src="\/Telerik.Web.UI.WebResource.axd/);
      let siteFinityJS2 = new RegExp(/<script src="\/ScriptResource.axd/);

      // replace urls with prepend relative path
      html = makeLinksRelative(html, linkPattern, relativePathPrepend, 'href', 1);
      html = makeLinksRelative(html, assetPattern, relativePathPrepend, 'href');
      html = makeLinksRelative(html, srcPattern, relativePathPrepend, 'src');
      html = makeLinksRelative(html, imgPattern, relativePathPrepend, 'src');
      html = makeLinksRelative(html, siteFinityJS, relativePathPrepend, 'src');
      html = makeLinksRelative(html, siteFinityJS2, relativePathPrepend, 'src');

      fs.writeFile(filePath, html, (err, errData) => {
        if (err) console.log(errData);

        console.log(`${filePath}  is saved`);
      });

    });
  });
};

const makeLinksRelative = (html, linkPattern, relativePathPrepend, type, addTag = 0) => {
  relativePathPrepend = type + '="' + relativePathPrepend;
  replaceType = new RegExp(type + '="');
  leadingSlash = new RegExp(type + '="/');

  html = html.replace(linkPattern, function(m) {

    let newUrl = '';

    // remove folder paths on url
    newUrl = m.replace(/(?:\.\.\/)+/, "");

    // remove leading slash
    newUrl = newUrl.replace(leadingSlash, type + '="');


    newUrl = newUrl.replace(replaceType, relativePathPrepend);

    if(addTag) {
      newUrl += '/index.html';
    }

    return newUrl;
  });

  return html;
}


const convertUrlToDirs = (url) => {
  let temp = [];
  let dirs = [];

  let cleanUrl = url.split('//')[1];  /* Remove https:// */

  cleanUrl = (url.slice(-1) == '/') ? cleanUrl.slice(0, -1) : cleanUrl; /* Remove last slash */

  temp = cleanUrl.split('/'); /* Convert directory names into array */

  temp.shift(); /* Remove domain name */

  let rowLen = temp.length;

  let dirName = '';
  dirs = temp.map((dir, i) => {
    // if (rowLen === i + 1) {
    //   dir = encodeURIComponent(dir);
    // }

    dirName += ((i > 0) ? '/' : '') + dir;

    return dirName;
  });

  // console.log(dirName);

  return dirs;
};

module.exports = saveHtmlSource;
