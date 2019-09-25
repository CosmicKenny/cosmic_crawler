const htmlValidator = require('html-validator');
const fs = require('fs');
const chalk = require('chalk');

const validate = async (url, html, storage, reportName) => {
  const results = await htmlValidator({
    data: html
  });

  /* Save JSON format report */
  fs.writeFile(`${storage}/${reportName}.json`, results, (err, data) => {
    if (err) console.log(err);

    console.log(`${chalk.underline.blueBright(`${storage}/${reportName}.json`)} is saved.`);
  });

  let resultsObj = JSON.parse(results);

  let generatedReport = generateHtmlReport(url, resultsObj.messages);

  /* Save HTML format report */
  fs.writeFile(`${storage}/${reportName}.html`, generatedReport, (err, data) => {
    if (err) console.log(err);

    console.log(`${chalk.underline.blueBright(`${storage}/${reportName}.html`)} is saved.`);
  });
};

let generateHtmlReport = (url, messages) => {
  /* Generate HTML report for ERROR and warning message*/
  let errorMessagesHtml = messages.map((message) => {
    if (message.type == 'error' || (message.type == 'info' && message.subType == 'warning')) {
      return errorHtml(message);
    } else {
      return false;
    }
  });

  return htmlReport(url, errorMessagesHtml);
}

let errorHtml = (msg) => {
  let { type, lastLine, lastColumn, firstColumn, message, extract} = msg;

  let htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  message = message.replace(/[&<>"'\/]/g, (match) => {
    return htmlEscapes[match];
  });
  message = message.replace(/\“/g, '<code>');
  message = message.replace(/\”/g, '</code>');
  extract = extract.replace(/[&<>"'\/]/g, (match) => {
    return htmlEscapes[match];
  });
  let html = `
  <li class="result ${(msg.subType) ? 'warning' : 'error'}">
    <h2>${type.toUpperCase()}${(msg.subType) ? '-' + msg.subType.toUpperCase() : ''}: ${message}</h2>
    <p>From line ${lastLine}, column ${firstColumn}; to line ${lastLine}, column ${lastColumn}</p>
    <p><pre>${extract}</pre></p>
  </li>
  `;

  return html;
};

const htmlReport = (url, errorMessagesHtml) => {

  let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <title>HTML Validator report for ${url}</title>
    <style>

		html, body {
			margin: 0;
			padding: 0;
			background-color: #fff;
			font-family: Arial, Helvetica, sans-serif;
			font-size: 16px;
			line-height: 22px;
			color: #333;
		}
		li {
			margin-bottom: 15px;
		}
		h1, h2, p, pre, ul {
			margin-top: 0;
			margin-bottom: 0;
		}
		h1 {
			margin-bottom: 10px;
			font-size: 24px;
			line-height: 24px;
		}
		h2 {
			font-size: 16px;
		}
		pre {
			white-space: pre-wrap;
			overflow: auto;
		}

		.page {
			max-width: 800px;
			margin: 0 auto;
			padding: 25px;
		}

		.counts {
			margin-top: 30px;
			font-size: 20px;
		}
		.count {
			display: inline-block;
			padding: 5px;
			border-radius: 5px;
			border: 1px solid #eee;
		}

		.clean-list {
			margin-left: 0;
			padding-left: 0;
			list-style: none;
		}
		.results-list {
			margin-top: 30px;
		}

		.result {
			padding: 10px;
			border-radius: 5px;
			border: 1px solid #eee;
		}
		.error {
			background-color: #fdd;
			border-color: #ff9696;
		}
		.warning {
			background-color: #ffd;
			border-color: #e7c12b;
		}
		.notice {
			background-color: #eef4ff;
			border-color: #b6d0ff;
		}

	</style>
  </head>
  <body>
    <div class="page">
      <h1>HTML Validator Report for ${url}</h1>

      <ul class="clean-list results-list">
        ${errorMessagesHtml}
      </ul>
    </div>
  </body>
  </html>
  `

  return html;
};

module.exports.htmlValidate = validate;
