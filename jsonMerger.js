const chalk = require('chalk');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

let fields = ['url', 'iframes', ];
const parser = new Parser({ fields });

let urls = [];
let allFiles = [];
let domainNames = [];

const recursiveReadFile = (index, callback) => {
  console.log(`${chalk.blue(`Opening file ${index}:`)} ${allFiles[index]}`);
  fs.readFile(allFiles[index], (err, data) => {
    if (err) console.log(err);

    urls = urls.concat(JSON.parse(data));
    index++;

    if (index < allFiles.length) {
      recursiveReadFile(index, callback);
    } else {
      callback();
    }
  });
};

const parseDomain = (url) => {
  let newUrl = url.replace(/^http(s)?:\/\//g, '');

  newUrl = newUrl.split('/')[0];

  return newUrl;
};

const afterReadingFiles = () => {
  urls.map(url => {
    if (url.iframes) {
      let iframes = url.iframes;
      iframes.map(iframe => {
        let domainName = parseDomain(iframe);
        if (domainNames.indexOf(domainName) > -1) {
          // domain exist
        } else {
          domainNames.push(domainName);
        }
      });
    } else if (url.images) {
      let images = url.images;
      images.map(image => {
        let domainName = parseDomain(image);
        if (domainNames.indexOf(domainName) > -1) {
          // domain exist
        } else {
          domainNames.push(domainName);
        }
      });
    } else if (url.videos) {
      let videos = url.videos;
      videos.map(video => {
        if (domainNames.indexOf(domainName) > -1) {
          // domain exist
        } else {
          domainNames.push(domainName);
        }
      });
    }
  });


  fs.writeFile('reports/consolidated.json', JSON.stringify(domainNames), (err, data) => {
    if (err) console.log(err);

    console.log(`${chalk.underline.blueBright('reports/consolidated.json')} is saved.`);
  });
};

const jsonMerger = (files, storage) => {
  allFiles = files;
  recursiveReadFile(0, afterReadingFiles);
};

module.exports.jsonMerger = jsonMerger;
