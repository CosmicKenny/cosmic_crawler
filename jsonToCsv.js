const { Parser } = require('json2csv');
const fs = require('fs');


const jsonToCsv = (file, fields, reportName, unwind) => {
  const parser = new Parser({
    fields: fields,
    unwind: unwind
  });

  fs.readFile(file, (err, data) => {
    if (err) console.log(err);

    console.log(JSON.parse(data));

    const csv = parser.parse(JSON.parse(data));

    fs.writeFile(reportName, csv, (err, data2) => {
      if (err) console.log(err);

      console.log(`${reportName} is saved`);
    });
  });
}

module.exports.jsonToCsv = jsonToCsv;
