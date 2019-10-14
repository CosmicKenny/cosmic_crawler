const chalk = require('chalk');
const util = require('util');

const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const fetch = require('node-fetch');

const resultsFolder = 'reports';
const contentFilename = 'cleanedContents.json';

// const endpoint = 'http://khengcheng.southeastasia.cloudapp.azure.com/wp-json/wp/v2/lp_news';
const endpoint = 'http://local.khengcheng.build/wp-json/wp/v2/lp_news';
let wpContents = [];
let contents = [];
let migrationLog = [];
let index = 0;

(async() => {
  console.log(`${chalk.yellowBright('Start uploading to WordPress...')}`);

  contents = await readFile(`./${resultsFolder}/${contentFilename}`).catch(err => {
    console.log(err);
  });  

  contents = JSON.parse(contents);

  contents = contents.filter((content, i) => {
    return !(i >= 1 && i < 35 || i == 105 || i == 130);
  });

  contents = contents.reverse();
  
  wpContents = contents.map((content) => {
    // return content.url;
    return {
      title: content.title,
      content: content.cleaned,
      status: "publish"
    }
  });

  uploadContents(wpContents[0]);

})();

const uploadContents = async (content) => {
  let response = await fetch(endpoint, {
    method: 'post',
    headers: {
      "Authorization": "Basic YWRtaW46dzNkTjU1dFpQZw==",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(content)
  }).catch(err => {
    console.log(`${chalk.bgRed('Error:')} ${err}`);
  });

  let status = {
    statusText: response.statusText,
    status: response.status
  };

  console.log(`${chalk.yellowBright('Uploaded:')} ${contents[index].url}`);
  console.log(`${chalk.yellowBright('Migration Status: ')} ${JSON.stringify(status)}`);
  
  migrationLog.push({
    url: contents[index].url,
    status
  });

  index++;
  if (index < wpContents.length) {
    await uploadContents(wpContents[index]);
  } else {
    fs.writeFile('reports/migration.json', JSON.stringify(migrationLog), (err, data) => {
      if (err) console.log(err);

      console.log('reports/migration.json is saved.');
    });
  }
};
