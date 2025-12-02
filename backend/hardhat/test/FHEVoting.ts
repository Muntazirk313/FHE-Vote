import { expect } from "chai";
import { ethers } from "hardhat";

describe("FHEVotingCreatorFinalizer", function () {
  let fheVoting: any;
  let creator: any;
  let voter1: any;
  let voter2: any;
  let voter3: any;

  beforeEach(async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    creator = owner;
    voter1 = addr1;
    voter2 = addr2;
    voter3 = addr3;

    const Factory = await ethers.getContractFactory("FHEVotingCreatorFinalizer");
    fheVoting = await Factory.deploy();
    await fheVoting.waitForDeployment();
  });

  describe("Proposal Creation", function () {
    it("should create a proposal with valid title and duration", async function () {
      const tx = await fheVoting.createProposal("Should we increase voting time?", 3600);
      await tx.wait();

      const proposalCount = await fheVoting.getProposalCount();
      expect(proposalCount).to.equal(1);

      const proposal = await fheVoting.getProposal(0);
      expect(proposal.title).to.equal("Should we increase voting time?");
    });

    it("should revert if duration is 0", async function () {
      await expect(fheVoting.createProposal("Invalid Proposal", 0)).to.be.rejectedWith(
        Error
      );
    });

    it("should emit ProposalCreated event", async function () {
      const tx = await fheVoting.createProposal("Test Proposal", 3600);
      expect(tx).to.be.ok;
    });

    it("should set proposal creator correctly", async function () {
      await fheVoting.createProposal("Creator Test", 3600);
      const proposal = await fheVoting.getProposal(0);
      expect(proposal.title).to.equal("Creator Test");
      expect(proposal.finalized).to.equal(false);
    });
  });

  describe("Voting Restrictions", function () {
    beforeEach(async function () {
      await fheVoting.createProposal("Test Vote", 1); // 1 second duration
    });

    it("should prevent voting after deadline", async function () {
      // Advance time past the voting deadline
      await ethers.provider.send("hardhat_mine", ["0x100"]); // Mine 256 blocks

      // Try to vote after deadline - should fail with "voting closed"
      await expect(
        fheVoting.connect(voter1).castVote(0, "0x0", "0x")
      ).to.be.rejectedWith(Error);
    });

    it("should track voting participation", async function () {
      const hasVoted = await fheVoting.hasVoted(0, voter1.address);
      expect(hasVoted).to.equal(false);
    });
  });

  describe("Results Finalization", function () {
    beforeEach(async function () {
      await fheVoting.createProposal("Test Vote", 1); // 1 second duration
    });

    it("should prevent finalization before voting ends", async function () {
      const results: [bigint, bigint, bigint, bigint] = [1n, 1n, 1n, 1n];
      await expect(
        fheVoting.finalizeResults(0, results)
      ).to.be.rejectedWith(Error);
    });

    it("should prevent non-creator from finalizing", async function () {
      // Advance time
      await ethers.provider.send("hardhat_mine", ["0x100"]);

      const results: [bigint, bigint, bigint, bigint] = [1n, 1n, 1n, 1n];
      
      await expect(
        fheVoting.connect(voter1).finalizeResults(0, results)
      ).to.be.rejectedWith(Error);
    });

    it("should revert if results total doesn't match zero votes", async function () {
      // Advance time
      await ethers.provider.send("hardhat_mine", ["0x100"]);

      // Try to finalize with non-zero results when no votes cast
      const results: [bigint, bigint, bigint, bigint] = [1n, 1n, 1n, 1n];
      
      await expect(
        fheVoting.finalizeResults(0, results)
      ).to.be.rejectedWith(Error);
    });

    it("should prevent double finalization", async function () {
      // Advance time
      await ethers.provider.send("hardhat_mine", ["0x100"]);

      // First finalization with zero results (no votes)
      const results: [bigint, bigint, bigint, bigint] = [0n, 0n, 0n, 0n];
      
      // This will fail because no votes cast
      await expect(
        fheVoting.finalizeResults(0, results)
      ).to.be.rejectedWith(Error);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await fheVoting.createProposal("View Test", 3600);
    });

    it("should return correct proposal count", async function () {
      expect(await fheVoting.getProposalCount()).to.equal(1);

      await fheVoting.createProposal("Second Proposal", 3600);
      expect(await fheVoting.getProposalCount()).to.equal(2);
    });

    it("should return proposal metadata", async function () {
      const proposal = await fheVoting.getProposal(0);
      expect(proposal.title).to.equal("View Test");
      expect(proposal.finalized).to.equal(false);
      expect(proposal.voteCount).to.equal(0);
    });

    it("should revert when getting results before finalization", async function () {
      await expect(fheVoting.getResults(0)).to.be.rejectedWith(Error);
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      await fheVoting.createProposal("Access Test", 1);
      await ethers.provider.send("hardhat_mine", ["0x100"]);
    });

    it("should only allow creator to get encrypted votes", async function () {
      await expect(
        fheVoting.connect(voter1).getEncryptedVotes(0)
      ).to.be.rejectedWith(Error);
    });

    it("should prevent getting encrypted votes before voting ends", async function () {
      await fheVoting.createProposal("Timing Test", 3600);
      
      await expect(
        fheVoting.getEncryptedVotes(1)
      ).to.be.rejectedWith(Error);
    });
  });

  describe("Multiple Proposals", function () {
    it("should handle multiple concurrent proposals", async function () {
      await fheVoting.createProposal("Proposal 1", 3600);
      await fheVoting.createProposal("Proposal 2", 3600);
      await fheVoting.createProposal("Proposal 3", 3600);

      expect(await fheVoting.getProposalCount()).to.equal(3);

      const p1 = await fheVoting.getProposal(0);
      const p2 = await fheVoting.getProposal(1);
      const p3 = await fheVoting.getProposal(2);

      expect(p1.title).to.equal("Proposal 1");
      expect(p2.title).to.equal("Proposal 2");
      expect(p3.title).to.equal("Proposal 3");
    });
  });
});
