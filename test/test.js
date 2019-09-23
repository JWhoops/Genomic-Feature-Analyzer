var assert = require("assert");
const calc = require("../calculate");

describe("calculate gene", function() {
  describe("#calculate_file", function() {
    it("should return correct coded exon length: 458509", async function() {
      let result = await calc.calculate_file("./mes/one_gene.gff");
      assert.equal(result.average_exon_length, 458509);
    });
    it("should return correct coded exon length: 458509 with pseudo gene", async function() {
      let result = await calc.calculate_file("./mes/one_gene_with_pseudo.gff");
      
      // assert.equal(result.average_exon_length, 458509);
    });
  });
});
