import { task } from "hardhat/config";

task("create-proposal", "Create an FHE voting proposal")
  .addParam("address", "Deployed FHEVotingCreatorFinalizer contract address")
  .addParam("title", "Proposal title")
  .addOptionalParam("duration", "Voting duration in seconds (default: 86400 for 1 day)", "86400")
  .setAction(async (taskArgs, hre) => {
    const signer = (await hre.ethers.getSigners())[0];
    const voting = await hre.ethers.getContractAt("FHEVotingCreatorFinalizer", taskArgs.address, signer);

    const durationSeconds = Number(taskArgs.duration);
    if (durationSeconds <= 0) {
      throw new Error("Duration must be > 0");
    }

    console.log(`Creating proposal: "${taskArgs.title}"`);
    console.log(`Voting duration: ${durationSeconds} seconds (${Math.floor(durationSeconds / 3600)} hours)`);
    console.log(`Creator: ${signer.address}`);

    const tx = await voting.createProposal(
      taskArgs.title,
      durationSeconds
    );
    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Proposal created in tx:", receipt.transactionHash);
    
    // Get proposal info
    const proposalCount = await voting.getProposalCount();
    const proposalId = Number(proposalCount) - 1;
    console.log(`✅ Proposal ID: ${proposalId}`);
  });
