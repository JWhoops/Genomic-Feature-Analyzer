const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");

let files = [];
const directoryPath = path.join(__dirname, "mamals");
/**
 * logic below will generate a json file that contains mapping of
 * assembly aceesion and organism name by crawling NBCI page
 */
let result_files = fs.readdirSync(directoryPath);
new Promise(resolve => {
  files = result_files;
  const pattern = /^GCF_[0-9]*.*/;
  let mamal_urls = [];
  const base_url = "https://www.ncbi.nlm.nih.gov/assembly/";
  files = result_files.filter(file_name => pattern.test(file_name));
  for (f of files) {
    const assembly_acces = "GCF_" + f.split("_")[1];
    mamal_urls.push(assembly_acces);
  }
  let requests = mamal_urls.map(url => axios.get(base_url + url));
  resolve(Promise.all(requests));
})
  .then(responses => {
    let files_map = {};
    for (let i = 0; i < responses.length; i++) {
      files_map["./mamals/" + files[i]] = get_name(responses[i].data);
    }
    files_map = JSON.stringify(files_map);
    fs.writeFile("files_map.json", files_map, err => {
      if (err) console.log(err);
      console.log("Successfully Written to File.");
    });
  })
  .catch(error => {
    console.log(error);
  });

function get_name(html) {
  const $ = cheerio.load(html);
  //parse div contains organism name
  let name = $("dl.assembly_summary_new dd a")
    .first()
    .text();
  // remove content in the parentheses
  for (let i = 0; i < name.length; i++) {
    if (name[i] === "(") {
      name = name.substring(0, i - 1);
    }
  }
  return name;
}