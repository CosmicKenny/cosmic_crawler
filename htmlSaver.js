const https = require('https');
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

  https.get(url, res => {
    if (res.statusCode == 200) {
      res.on('data', chunk => html += chunk );
    }
    res.on('end', () => {

      fs.writeFile(filePath, html, (err, errData) => {
        if (err) console.log(errData);

        console.log(`${filePath}  is saved`);
      });

    });
  });
};

const convertUrlToDirs = (url) => {
  let temp = [];
  let dirs = [];

  let cleanUrl = url.split('//')[1];  /* Remove https:// */

  cleanUrl = (url.slice(-1) == '/') ? cleanUrl.slice(0, -1) : cleanUrl; /* Remove last slash */

  temp = cleanUrl.split('/'); /* Convert directory names into array */

  temp.shift(); /* Remove domain name */

  let dirName = '';
  dirs = temp.map((dir, i) => {

    dirName += ((i > 0) ? '/' : '') + dir;

    return dirName;
  });

  return dirs;
};

module.exports = saveHtmlSource;
