const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");

let files = [];
const directoryPath = path.join(__dirname, "mamals");

// promisefication
new Promise(function(resolve, reject) {
  fs.readdir(directoryPath, function(err, files) {
    if (err) return console.log("Unable to scan directory: " + err);
    files.forEach(function(file) {
      files.push(file);
    });
    resolve(files);
  });
})
  .then(result_files => {
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
    return Promise.all(requests);
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
  return $("dl.assembly_summary_new dd a")
    .first()
    .text();
}
