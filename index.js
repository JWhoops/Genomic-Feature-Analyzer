const gff = require("bionode-gff");
const fs = require("fs");

// let path = process.argv[2]; // get file path from parameter
// // check if file exist
// try {
//   if (fs.existsSync(path)) {
//     // load GFF file
//     gff
//       .read(path)
//       .on("data", onFeature)
//       .on("end", done_reading_file);
//   } else {
//     console.log("Couldn't find file: " + path);
//   }
// } catch (err) {
//   console.error(err);
// }
let gene,
  wrong_gene_counts = 0,
  total_gene_length = 0,
  total_gene_count = 0,
  first_to_last_exon_length_pieces = 0,
  total_coded_exon_length = 0;

gff
.read("./mamals/GCF_000001405.39_GRCh38.p13_genomic.gff")
.on("data", onFeature)
.on("end", done_reading_file);
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
    const coded_exon_length = get_coded_exon_length_for_gene(gene);
    const gene_length = gene.end - gene.start;
    total_gene_count++;
    total_gene_length += gene_length;
    if (coded_exon_length > 0 && coded_exon_length <= gene_length) {
      total_coded_exon_length += coded_exon_length;
      first_to_last_exon_length_pieces++;
    }
    if (gene_length < coded_exon_length) {
      wrong_gene_counts++;
    }
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
        start = firstExon.start;
        break;
      }
    }
    for (let i = 0; i < g.exons.length; i++) {
      const lastExon = g.exons[g.exons.length - 1 - i];
      if (lastCDS.start >= lastExon.start && lastCDS.end <= lastExon.end) {
        end = lastExon.end;
        break;
      }
    }
    return Math.abs(end - start);
  }

  function done_reading_file() {
    fetch_gene_info(gene); // this is for last gene in file;
    // let scatter_data = JSON.stringify(datas);
    // fs.writeFile("./scatter.json", scatter_data, err => {
    //   if (err) console.log(err);
    //   console.log("Done!!!!!");
    // });
    console.log("Total Gene Count = " + total_gene_count);
    console.log("Total Gene Length = " + total_gene_length);
    console.log(
      "Average Gene Length = " + total_gene_length / total_gene_count
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