# Node Crawler
## Features
- Crawl through entire website
- Store crawled URLs
- Inspect page from given URLs
- Check broken links
- Retrieve page information
	- page title
	- meta description
	- latest updated date
- Detect page with external domain resources
	- iframe
	- image
	- video
- Detect page with
	- iframe
	- image
	- video
- Check if oversize / overcompressed image being used
  - oversize when intrinsic size (width * height) of image 10% larger than rendered size
  - overcompressed when intrinsic size (width * height) of image 10% smaller than rendered size
- Detect all non-HTML document
  - format: .pdf, .jp(e)g, .png, .xls(x), .doc(x), .mp3, .mp4
- Scan WCAG and generate report using [Pa11y](https://github.com/pa11y/pa11y)
- Validate HTML using [W3C validator](https://validator.w3.org/)
- URL redirection verification

## System Requirement
 - Microsoft Window / Mac OS
 - Node.JS v10 and above 

## Installation
1. create new project folder with following structure:
    - reports/
      - html-validate/
      - wcag/
      - screenshots/
2. run `npm install`
3. **rename** `config-sample.js` to `config.js`.

## Crawling
1. in **config.js**, update the `configuration`
```javascript
const configuration = {
  entryUrl: 'https://domain.com/xxx',
  domain: 'domain.com',
  sourceOfURLs: null
}
```
2. run `node index.js`

## Inspect pages from given URLs
1. in **index.js**, update the `configuration`
    - `urlsSource` (*string*): File path to the source of the URLs to be crawled
2. run `node index.js`
**Note**: the `urlsSource.json` should be an array of links
```javascript
["https://www.example.com", "https://example.com", //...]
```

## Redirection verification
- To verify if all the URL redirection is correctly done
1. Prepare a URL mapping JSON file.
2. The JSON file should be an array of objects with property `url` and `destination`
    - **Note**: Ensure the format of URL must start with `http://` or `https://`, and end with ending trail, e.g.: https://www.example.com/xxx/.
```javascript
[
  {
    "origin": "URL",
    "destination": "URL"
  },
  // ...
]
```
3. Update `configuration` in **redirection-check.js** file.
    - `urlsMapSource` (*string*): File path to the source of the URLs map, e.g.: **./src/exampleRedirectionMap.json**.
4. Run `node redirection-check.js`
5. Test report will be saved in **reports/redirectionTestResults.json**.
    - Incorrect redirection will be marked as `matched: false`

> Written with [StackEdit](https://stackedit.io/).


## Future Work
1. Currently, detecting non-HTML document feature is only checking if the `href` contain the file extension. Hence, it will not detect any **redirect link** or the `href` does not contain the file extension at all.
2. **Feature**: crawl and download all the assets and save as static files.
