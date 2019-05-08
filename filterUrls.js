const fs = require('fs');

const filterUrls = async () => {
  fs.readFile('reports/crawledURLs.json', (err, data) => {
    let crawledLinks = JSON.parse(data);
    let filteredLinks = [];

    crawledLinks.map((link) => {
      if (link.slice(-1) == '#') {
        let temp = link.slice(0, link.length - 1);

        if (filteredLinks.indexOf(temp) > -1) {

        } else {
          filteredLinks.push(temp);
        }
      } else {
        filteredLinks.push(link);
      }
    });

    fs.writeFile('reports/filteredURLs.json', JSON.stringify(filteredLinks), (err, data) => {
      if (err) console.log(err);

      console.log('Stored in reports/filteredURLs.json');
    })
  });
};

module.exports.filterUrls = filterUrls;
