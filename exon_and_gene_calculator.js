const gff = require("bionode-gff");
const fs = require("fs");

/**
 * Pass in file pathm it will calculate the average legnth of
 * first coded exon to last coded exon, and the average length
 * of gene
 * @param {*} file_name
 * @returns {Promise} a promise that contains the result
 */
function calculate_file(file_name) {
  let gene,
    total_counted_gene_length = 0,
    counted_genes = 0,
    total_coded_exon_length = 0,
    wrong_gene_counts = 0;

  // asynchrous event
  return new Promise(resolve => {
    // start reading file
    gff
      .read(file_name)
      // call this function when reading each line of file
      .on("data", onFeature)
      // call this funciton when finished
      .on("end", () => {
        if (gene) fetch_gene_info(gene); // this is for last gene in file;
        // return the result
        let average_gene_length = 0;
        let average_exon_length = 0;
        if (counted_genes !== 0) {
          average_gene_length = total_counted_gene_length / counted_genes;
          average_exon_length = total_coded_exon_length / counted_genes;
        }
        resolve({
          file_name: file_name,
          average_gene_length: average_gene_length,
          average_exon_length: average_exon_length,
          total_exon: counted_genes,
          illegal_genes: wrong_gene_counts
        });
      });
  });

  /**
   * if record is a feature, combine exon and CDS and gene into gene obejct
   * @param {Feature} feature object
   */
  function onFeature(feature) {
    /* convert gene into js object and calculate based on object property
  / if record is gene load previous exon and CDS and other properties into
  / Gene object */
    if (feature.type === "gene") {
      if (gene) fetch_gene_info(gene);
      gene = feature;
      gene.start = feature.start;
      gene.end = feature.end;
      gene.exons = []; // push all exons to gene object
      gene.cdss = []; // push all CDS to gene object
    } else if (feature.type === "exon" && gene) {
      let exon = {};
      exon.start = feature.start;
      exon.end = feature.end;
      gene.exons.push(exon);
    } else if (feature.type === "CDS" && gene) {
      let cds = {};
      cds.start = feature.start;
      cds.end = feature.end;
      gene.cdss.push(cds);
    } else if (feature.type === "pseudogene") {
      /* if pseudogene, fetch the previous gene info
         and return  */
      if (gene) fetch_gene_info(gene);
      gene = null; // do not add exon or cds after pseudogene
    }
  }

  /**
   * this will manipulate the gene info
   * @param {gene} gene gene record
   */
  function fetch_gene_info(gene) {
    // get the last coded_exon_length
    const coded_exon_length = get_coded_exon_length_for_gene(gene);
    const gene_length = gene.end - gene.start;
    if (coded_exon_length > 0 && coded_exon_length <= gene_length) {
      counted_genes++;
      total_counted_gene_length += gene_length;
      total_coded_exon_length += coded_exon_length;
    }
    if (gene_length < coded_exon_length && coded_exon_length !== 0)
      wrong_gene_counts++;
  }
  // calculate the coded exon length
  // first_exon_start first_DSA first_exon_end
  // last_exon_start last_DSA last_exon_end
  function get_coded_exon_length_for_gene(gene) {
    // deep clone gene becasue I don't want mutate the original gene
    let g = Object.assign({}, gene);
    if (g.cdss.length === 0) return 0;
    let start = 0,
      end = 0;
    // both EXON and CDS are in reverse order!!!!!!!!
    g.exons.sort((a, b) => {
      return b.start - a.start;
    });
    g.cdss.sort((a, b) => {
      return b.start - a.start;
    });
    const firstCDS = g.cdss[g.cdss.length - 1];
    const lastCDS = g.cdss[0];
    // find first coded exon
    for (let i = 0; i < g.exons.length; i++) {
      const firstExon = g.exons[g.exons.length - 1 - i];
      if (firstCDS.start >= firstExon.start && firstCDS.end <= firstExon.end) {
        start = firstExon.start;
        break;
      }
    }
    // find last coded exon
    for (let i = 0; i < g.exons.length; i++) {
      const lastExon = g.exons[i];
      if (lastCDS.start >= lastExon.start && lastCDS.end <= lastExon.end) {
        end = lastExon.end;
        break;
      }
    }
    return Math.abs(end - start);
  }
}

/**
 * this function will calculate all mamal gff files
 */
async function calculate_all_files(directoryPath) {
  let result_arr = [];
  let files;
  try {
    files = fs.readdirSync(directoryPath);
  } catch (error) {
    console.log(error);
    process.exit();
  }
  let result_files = [];
  // filter illegal files
  const pattern = /^GCF_[0-9]*.*/;
  files.forEach(function(f) {
    if (pattern.test(f)) result_files.push(directoryPath + "/" + f);
  });

  for (let i = 0, len = result_files.length; i < len; i++) {
    const f = result_files[i];
    console.log("calculating " + f + "(" + (i + 1) + "/" + len + ")");
    await calculate_file(f, "")
      .then(res => {
        result_arr.push([
          res.file_name,
          res.average_gene_length,
          res.average_exon_length,
          res.illegal_genes
        ]);
      })
      .catch(err => console.log(err));
  }
  return result_arr;
}

async function get_averages_coded_exon_and_gene(directory_path, ouput_path) {
  var contents;
  try {
    contents = fs.readFileSync("./assembly_2_name.json");
  } catch (error) {
    console.log(error);
  }
  // Define to JSON type
  var files_map = JSON.parse(contents);
  // Get Value from JSON
  let res_arr = await calculate_all_files(directory_path);
  let res_str =
    "Organism Name,Average Gene Length," +
    "Average Length of First Coded Exon to Last Coded Exon, Illegal Genes\n";
  // join results
  for (let i = 0; i < res_arr.length; i++) {
    /** convert file path to assembly 
     eg: convert ./path/GCF_000001405.39_GRCh38.p13_genomic.gff
     to GCF_000001405.39
    */
    let organism_assembly = res_arr[i][0].match(/GCF_(.+?)\.[0-9]+/g)[0];
    let organism_name = files_map[organism_assembly];
    // if organism assembly is not in json file
    organism_name
      ? (res_arr[i][0] = organism_name)
      : (res_arr[i][0] = organism_assembly);
    res_str = res_str + res_arr[i].join(",") + "\n";
  }
  // write to file
  fs.writeFile(ouput_path, res_str, err => {
    if (err) console.log(err);
    console.log("Successfully Written to File.");
  });
}

// initializedFileMap(process.argv[2], process.argv[3]);
module.exports = {
  calculate_file: calculate_file,
  get_averages_coded_exon_and_gene: get_averages_coded_exon_and_gene
};
