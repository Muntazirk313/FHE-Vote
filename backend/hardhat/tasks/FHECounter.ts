import { task } from "hardhat/config";

task("fhe-counter", "Interact with FHECounter contract")
  .addParam("address", "Deployed FHECounter contract address")
  .addParam("action", "Action: 'get' or 'increment' or 'decrement'")
  .addOptionalParam("amount", "Amount for increment/decrement (default 1)")
  .setAction(async (taskArgs: any, hre: any) => {
    const signer = (await hre.ethers.getSigners())[0];
    const counter = await hre.ethers.getContractAt("FHECounter", taskArgs.address, signer);

    if (taskArgs.action === "get") {
      const count = await counter.getCount();
      console.log("Current count (encrypted):", count);
    } else if (taskArgs.action === "increment" || taskArgs.action === "decrement") {
      const amount = taskArgs.amount || 1;
      console.log(`${taskArgs.action}ing by ${amount}...`);
      // This is a placeholder - actual encrypted interaction would be needed
      console.log("Note: Encrypted operations require FHEVM client setup");
    } else {
      throw new Error("Invalid action. Use 'get', 'increment', or 'decrement'");
    }
  });
