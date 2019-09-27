var assert = require("assert");
const calc = require("../exon_and_gene_calculator");

describe("calculate gene", function() {
  describe("#calculate_file", function() {
    it("should return correct coded exon length: 458509", async function() {
      let result = await calc.calculate_file("./mes/one_gene.gff");
      assert.equal(result.average_exon_length, 458509);
    });
    it("should return correct coded exon length: 458509 with duplciation and pseudo gene", async function() {
      let result = await calc.calculate_file(
        "./mes/one_gene_duplication_and_pseudp.gff"
      );
      assert.equal(result.average_exon_length, 458509);
    });
    it("should return correct coded exon length: 458509 with one pseudo gene", async function() {
      let result = await calc.calculate_file("./mes/one_gene_with_pseudo.gff");
      assert.equal(result.average_exon_length, 458509);
    });
    it("should return correct coded exon length: 0 wihtout any encoded exon", async function() {
      let result = await calc.calculate_file(
        "./mes/one_gene_no_coded_exon.gff"
      );
      assert.equal(result.average_exon_length, 0);
    });
    it("should return correct coded exon length: 0 with illegal gene", async function() {
      let result = await calc.calculate_file(
        "./mes/one_gene_no_coded_exon.gff"
      );
      assert.equal(result.average_exon_length, 0);
    });
    it("should return correct coded exon length: 458509 with multiple same genes", async function() {
      let result = await calc.calculate_file(
        "./mes/multiple_gene.gff"
      );
      assert.equal(result.average_exon_length, 458509);
    });
  });
});
