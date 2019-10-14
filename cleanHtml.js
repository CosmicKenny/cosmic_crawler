const chalk = require('chalk');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const sanitizeHtml = require('sanitize-html');

/*
- Read JSON
- Clean up HTML
- Save as JSON
 */

let index = 0;
let contents = [];

(async() => {
  console.log('Opening file..');

  contents = await readFile('./reports/contents.json')
    .catch(err => {
      console.log(`${chalk.bgRed('Error reading:')} ${JSON.stringify(err)}`);
    });

  contents = JSON.parse(contents);

  let cleanedContents = contents.map(content => {
    content['cleaned'] = sanitizeHtml(content.description).replace(/\n/g, ' ');

    return content;
  });

  fs.writeFile('reports/cleanedContents.json', JSON.stringify(cleanedContents), (err, data) => {
    if (err) console.log(err);

    console.log('reports/cleanedContents.json is saved.');
  });

})();
