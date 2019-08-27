const gff = require("bionode-gff");
const fs = require("fs");
const path = require("path");

function calculate_file(file_name) {
  let gene,
    wrong_gene_counts = 0,
    total_counted_gene_length = 0,
    counted_genes = 0,
    first_to_last_exon_length_pieces = 0,
    total_coded_exon_length = 0;

  return new Promise(resolve => {
    gff
      .read(file_name)
      .on("data", onFeature)
      .on("end", () => {
        done_reading_file();
        resolve({
          file_name: file_name,
          average_gene_length: total_counted_gene_length / counted_genes,
          average_exon_length:
            total_coded_exon_length / first_to_last_exon_length_pieces,
          total_exon: first_to_last_exon_length_pieces
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
      first_to_last_exon_length_pieces++;
    }
    if (gene_length < coded_exon_length) wrong_gene_counts++;
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
    const firstCDS = g.cdss[0];
    const lastCDS = g.cdss[g.cdss.length - 1];
    for (let i = 0; i < g.exons.length; i++) {
      const firstExon = g.exons[i];
      if (firstCDS.start >= firstExon.start && firstCDS.end <= firstExon.end) {
        end = firstExon.end;
        break;
      }
    }
    for (let i = 0; i < g.exons.length; i++) {
      const lastExon = g.exons[g.exons.length - 1 - i];
      if (lastCDS.start >= lastExon.start && lastCDS.end <= lastExon.end) {
        start = lastExon.start;
        break;
      }
    }
    return Math.abs(end - start);
  }

  function done_reading_file() {
    fetch_gene_info(gene); // this is for last gene in file;
    console.log("Counted Genes = " + counted_genes);
    console.log("Total Counted Gene Length = " + total_counted_gene_length);
    console.log(
      "Average Gene Length = " + total_counted_gene_length / counted_genes
    );
    console.log(
      "Total Encoded First to Last Exon Length = " + total_coded_exon_length
    );
    console.log(
      "Total Encoded First to Last Exon Length Pieces = " +
        first_to_last_exon_length_pieces
    );
    console.log(
      "Average Length of First Coded Exon to Last Coded Exon = " +
        total_coded_exon_length / first_to_last_exon_length_pieces
    );
    console.log("Illegal Gene Number = " + wrong_gene_counts);
  }
}

async function calculate_all_files() {
  let result_arr = [];
  const directoryPath = path.join(__dirname, "mamals");
  let files = fs.readdirSync(directoryPath);
  let result_files = [];
  const pattern = /^GCF_[0-9]*.*/;
  files.forEach(function(f) {
    if (pattern.test(f)) result_files.push("./mamals/" + f);
  });

  for (let i = 0, len = result_files.length; i < len; i++) {
    const f = result_files[i];
    console.log("calculating " + f + "(" + i + "/" + len + ")");
    await calculate_file(f, "")
      .then(res => {
        result_arr.push([
          res.file_name,
          res.average_gene_length,
          res.average_exon_length
        ]);
      })
      .catch(err => console.log(err));
  }
  return result_arr;
}

async function initializedFileMap() {
  var contents = fs.readFileSync("files_map.json");
  // Define to JSON type
  var files_map = JSON.parse(contents);
  // Get Value from JSON
  let res_arr = await calculate_all_files();
  let res_str =
    "Organism Name, Gene Length, Length of First Coded Exon to Last Coded Exon\n";
  for (let i = 0; i < res_arr.length; i++) {
    res_arr[i][0] = files_map[res_arr[i][0]];
    res_str = res_str + res_arr[i].join(",") + "\n";
  }
  fs.writeFile("mamals.csv", res_str, err => {
    if (err) console.log(err);
    console.log("Successfully Written to File.");
  });
}

initializedFileMap();
