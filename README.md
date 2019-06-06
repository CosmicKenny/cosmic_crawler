# Node Crawler
## Features
- Crawl through entire website
- Store crawled URLs
- Inspect page from given URLs
- Store page information
	- page title
	- meta description
	- latest updated date
- Detect page with external domain resources
	- iframe
	- image
	- video
- detect page with
	- iframe
	- image
	- video
- detect all non-HTML document
- scan WCAG and generate report using [Pa11y](https://github.com/pa11y/pa11y)
- validate HTML using [W3C validator](https://validator.w3.org/)

## System Requirement
 - Microsoft Window / Mac OS
 - Node.JS v10
 - 

## Installation
1. create new project folder with following structure:
	- reports/
		- html-validate/
		- wcag/
2. run `npm install`

## Crawling
1. in **index.js**, update the `configuration`
```
const configuration = {
	entryUrl: 'https://domain.com/xxx',
	domain: 'domain.com',
  sourceOfURLs: null
}
```
2. run `node index.js`

## Inspect pages from given URLs
1. in **index.js**, update the `configuration`
```
const configuration = {
  sourceOfURLs: 'path/to/source.json'
};
```

2. run `node index.js`

## Generate CSV
1. run `node moduletester.js`
> Written with [StackEdit](https://stackedit.io/).
