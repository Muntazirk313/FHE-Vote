import { task } from "hardhat/config";

task("finalize-results", "Finalize voting results (creator only)")
  .addParam("address", "Deployed FHEVotingCreatorFinalizer contract address")
  .addParam("id", "Proposal id")
  .addParam("results", "Comma-separated vote counts (e.g., '10,20,15,5' for options 0,1,2,3)")
  .setAction(async (taskArgs, hre) => {
    const signer = (await hre.ethers.getSigners())[0];
    const voting = await hre.ethers.getContractAt("FHEVotingCreatorFinalizer", taskArgs.address, signer);

    const id = Number(taskArgs.id);
    const resultArray = taskArgs.results.split(",").map((v: string) => BigInt(v.trim()));

    if (resultArray.length !== 4) {
      throw new Error("Results must have exactly 4 values");
    }

    console.log(`Finalizing proposal ${id}`);
    console.log(`Results: Option0=${resultArray[0]}, Option1=${resultArray[1]}, Option2=${resultArray[2]}, Option3=${resultArray[3]}`);
    console.log(`Total votes: ${resultArray[0] + resultArray[1] + resultArray[2] + resultArray[3]}`);

    const tx = await voting.finalizeResults(id, resultArray);
    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Results finalized in tx:", receipt.transactionHash);
    
    // Fetch and display stored results
    const storedResults = await voting.getResults(id);
    console.log("\n✅ Stored Results:");
    for (let i = 0; i < 4; i++) {
      console.log(`  Option ${i}: ${storedResults[i]} votes`);
    }
  });
