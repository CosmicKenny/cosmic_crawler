const validator = require('./htmlValidate.js');

const resultsFolder = 'reports/html-validate';

const html = `
<!doctype html>
<html>
<head>
<title>Test</title>
</head>
<body>
</body>
</html>
`

validator.htmlValidate(html, resultsFolder, '1.json');
