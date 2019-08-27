const axios = require("axios");
const cheerio = require("cheerio");

async function craw(url, selector) {
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);
  return $(selector).text();
}

craw("https://www.google.com", "a .ge_e").then(res => {
  console.log(res);
});
