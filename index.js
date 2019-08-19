var gff = require("bionode-gff");
// var fs = require("fs");

gff
  .read("./mamals/GCF_001922835.1_NIST_Tur_tru_v1_genomic (1).gff")
  .on("data", onFeature)
  .on("end", done_reading_file);

let gene,
  wrong_gene_counts = 0,
  total_gene_length = 0,
  total_gene_count = 0,
  total_coded_exons_count = 0,
  total_coded_exon_length = 0,
  datas = {};
datas.data = [];

function onFeature(feature) {
  // convert gene into js object and calculate based on object property
  if (feature.type === "gene") {
    if (gene) {
      const coded_exon_length = get_coded_exon_length_for_gene(gene);
      const gene_length = gene.end - gene.start;
      if (coded_exon_length > 0 && coded_exon_length <= gene_length) {
        datas.data.push({
          x: coded_exon_length,
          y: gene_length
        });
        total_gene_length += gene_length;
        total_gene_count++;
        total_coded_exon_length += coded_exon_length;
        total_coded_exons_count++;
      } else {
        wrong_gene_counts++;
      }
    }
    gene = {};
    gene.exons = [];
    gene.cdss = [];
    gene.start = feature.start;
    gene.end = feature.end;
    gene.id = feature.seqid;
    gene.attributes = feature.attributes;
  } else if (feature.type === "exon") {
    let exon = {};
    exon.start = feature.start;
    exon.end = feature.end;
    gene.exons.push(exon);
  } else if (feature.type === "CDS") {
    let cds = {};
    cds.start = feature.start;
    cds.end = feature.end;
    gene.cdss.push(cds);
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
  // let scatter_data = JSON.stringify(datas);
  // fs.writeFile("./scatter.json", scatter_data, err => {
  //   if (err) console.log(err);
  //   console.log("Done!!!!!");
  // });
  console.log("Total Gene Count = " + total_gene_count);
  console.log("Total Gene Length = " + total_gene_length);
  console.log("Average Gene Length = " + total_gene_length / total_gene_count);
  console.log("Total Encoded Exon Length = " + total_coded_exon_length);
  console.log("Total Encoded Exon count = " + total_coded_exons_count);
  console.log(
    "Average Length of First Coded Exon to Last Coded Exon = " +
      total_coded_exon_length / total_coded_exons_count
  );
  console.log("Illegal Gene Number= " + wrong_gene_counts);
}
