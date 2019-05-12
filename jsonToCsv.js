const { Parser } = require('json2csv');
const fs = require('fs');


const jsonToCsv = (file, fields) => {
  const parser = new Parser({ fields });

  fs.readFile(file, (err, data) => {
    if (err) console.log(err);

    console.log(JSON.parse(data));

    const csv = parser.parse(JSON.parse(data));

    fs.writeFile('reports/brokenLinks.csv', csv, (err, data2) => {
      if (err) console.log(err);

      console.log('reports/brokenLinks.csv is saved');
    });
  });
}

module.exports.jsonToCsv = jsonToCsv;
