# Cosmic Node Crawler

## Features
- Crawl through entire website or provided URLs, based on the URL pattern (*crawledURLs.json*)
- Check broken links (*brokenLinks.json*, *testedPages.json*)
- Retrieve page information (*crawledPages.json*)
	- page title
	- meta description
	- latest updated date
- Detect page with external domain resources:
	- iframe (*pagesWithExternalIframes.json*)
	- image (*pagesWithExternalImages.json*)
	- video (*pagesWithExternalVideos.json*)
  - all external domain requests (*externalDomains.json*)
- Detect page with:
	- iframe (*pagesWithIframes.json*)
	- image (*pagesWithImages.json*)
	- video (*pagesWithVideos.json*)
- Check if oversize / overcompressed image being used
  - **oversize** when intrinsic size (width * height) of image 10% larger than rendered size
  - **overcompressed** when intrinsic size (width * height) of image 10% smaller than rendered size
- Detect all non-HTML document link (*pagesWithFiles.json*)
  - format: .pdf, .jp(e)g, .png, .xls(x), .doc(x), .mp3, .mp4
- Scan WCAG and generate report using [Pa11y](https://github.com/pa11y/pa11y)
- Validate HTML using [W3C validator](https://validator.w3.org/)
- URL redirection verification

## System Requirement
 - Microsoft Window / Mac OS
 - Node.JS v10 and above 

## Installation
1. Run `npm install`
2. Clone **config-sample.js** file and name it as **config.js**.

## How to run
1. In **config.js**, update the configuration:
```javascript
module.exports = {
  entryUrl: 'https://www.example.com/xxx',
  urlPattern: null,
  urlsSource: null
  // ...
}
```
2. Run `node index.js`

## Configuration
- `urlPattern` (*string* || `null`): Only URLs that start with `urlPattern` will be crawled. E.g.: `/press-release` will only crawl www.example.com/press-release/*
- `urlsSource` (*string* || `null`): File path to JSON file with **arrays of URLs** for crawler to test. E.g.: `./src/urlsSource.json`.
```javascript
// Example: urlsSource.json
[
  "https://www.example.com", 
  "https://www.example.com/xxx", 
  //...
]
```
- `pageWaitTime` (*integer*): Time (in miliseconds) to wait after page loaded. (Intentionally delay to prevent being blocked). E.g.: `5000`.
- `debug` (*boolean*): `true` to turn on debug mode, will stop crawler after **15 URLs**.
- `checkBrokenLink` (*boolean*): `true` to check broken links.
- `detectFileLink` (*boolean*): `true` to find the links that open non HTML documents (pdf, jpg, jpeg, png, xls, xlsx, doc, docx).
- `checkImageExist` (*boolean*): `true` to generate list of pages that contain images.
- `checkVideoExist` (*boolean*): `true` to generate list of pages that contain videos.
- `checkIframeExist` (*boolean*): `true` to generate list of pages that contain iframes.
- `disableCrawl` (*boolean*): `true` to prevent crawler to crawl the page.
- `detectExternalResource` (*boolean*): `true` to generate list of pages that contain external **iframes**, **images**, **videos**, and list of all **external domains**.
- `savePageInfo` (*boolean*): `true` to collect information of crawled pages, include.
    - Page Title `<title>`
    - Meta description `<meta name="description">`
    - Last Updated Date (depends on the `lastUpdatedTextSelector`)
- `scanWCAG` (*boolean*): `true` to scan the page for WCAG
- `validateHTML` (*boolean*): `true` to scan the page with W3C validator
- `takeScreenshot` (*boolean*): `true` to take screenshot of the page (mobile and desktop)
- `outputFolderName` (*string*): Name of the output folder. E.g.: `reports`
- `lastUpdatedTextSelector` (*string*): DOM selector of the last updated text. E.g.: `.copyright > p`

## Use Cases
### Redirection verification
To verify if all the URL redirection is correctly done.

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

## Future Work
1. Currently, detecting non-HTML document feature is only checking if the `href` contain the file extension. Hence, it will not detect any **redirect link** or the `href` does not contain the file extension at all.
2. **Feature**: crawl and download all the assets and save as static files.

> Written with [StackEdit](https://stackedit.io/).
