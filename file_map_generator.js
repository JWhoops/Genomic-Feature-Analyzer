const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");

function get_assembly_organism_name_json(directoryPath, outputPath) {
  let files = [];
  /**
   * logic below will generate a json file that contains mapping of
   * assembly aceesion and organism name by crawling NBCI page
   */
  let result_files = [];
  try {
    result_files = fs.readdirSync(directoryPath);
  } catch (error) {
    console.log("Invalid directory path!!!");
    process.exit();
  }

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
    // send all request and get all mamal htmls
    let requests = mamal_urls.map(url => axios.get(base_url + url));
    resolve(Promise.all(requests));
  })
    // parse all html files
    .then(responses => {
      let files_map = {};
      for (let i = 0; i < responses.length; i++) {
        files_map["GCF_" + files[i].split("_")[1]] = get_name(
          responses[i].data
        );
      }
      if (Object.keys(files_map).length !== 0) {
        files_map = JSON.stringify(files_map);
        // write result to json file
        fs.writeFile(outputPath + ".json", files_map, err => {
          if (err) {
            console.log("Invalid out file path!!!");
            process.exit();
          }
          console.log("Successfully Written to File.");
        });
      } else {
        console.log("Did not parse anything becasue of empty object.");
      }
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
}

if (process.argv.length !== 4) {
  console.log("Invalid argument numbers!!!!");
} else {
  get_assembly_organism_name_json(process.argv[2], process.argv[3]);
}
