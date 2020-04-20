function findElemByText({str, selector = '*', leaf = 'outerHTML'}){
  // generate regex from string
  const regex = new RegExp(str, 'gmi');

  // search the element for specific word
  const matchOuterHTML = e => (regex.test(e[leaf]))

  // array of elements
  const elementArray = [...document.getElementsByTagName(selector)];

  // return filtered element list
  return elementArray.filter(matchOuterHTML)
}
  
// usage
// findElemByText({str: 'Example', leaf: 'innerHTML', selector: 'title'});
// findElemByText({str: 'Example', selector: 'h1'});
// findElemByText({str: 'Example'});

// Normalizing the text
function getText(linkText) {
  linkText = linkText.replace(/\r\n|\r/g, "\n");
  linkText = linkText.replace(/\ +/g, " ");

  // Replace &nbsp; with a space 
  var nbspPattern = new RegExp(String.fromCharCode(160), "g");
  return linkText.replace(nbspPattern, " ");
}