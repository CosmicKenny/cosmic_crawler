const { Parser } = require('json2csv');
const fs = require('fs');


const jsonToCsv = (file, fields, reportName, unwind = null) => {
  let parser;
  if (unwind) {
    parser = new Parser({
      fields: fields,
      unwind: unwind
    });
  } else {
    parser = new Parser({
      fields: fields
    });
  }

  fs.readFile(file, (err, data) => {
    if (err) console.log(err);

    console.log(JSON.parse(data));

    let csv;

    if (unwind) {
      csv = parser.parse(JSON.parse(`{"${unwind}": ${data}}`));
    } else {
      csv = parser.parse(JSON.parse(data));
    }

    fs.writeFile(reportName, csv, (err, data2) => {
      if (err) console.log(err);

      console.log(`${reportName} is saved`);
    });
  });
}

module.exports = jsonToCsv;
