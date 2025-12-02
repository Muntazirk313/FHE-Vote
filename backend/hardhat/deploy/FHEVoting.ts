import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying FHEVotingCreatorFinalizer contract...");

  const deployed = await deploy("FHEVotingCreatorFinalizer", {
    from: deployer,
    log: true,
  });

  console.log(`FHEVotingCreatorFinalizer contract deployed at: ${deployed.address}`);
  console.log("✅ FHEVotingCreatorFinalizer deployed successfully!");
  console.log("");
  console.log("Features:");
  console.log("  ✓ Create confidential voting proposals");
  console.log("  ✓ Encrypted vote submission (FHEVM euint8)");
  console.log("  ✓ Votes stay confidential on-chain");
  console.log("  ✓ Creator-only finalization of results");
  console.log("  ✓ Double-vote prevention");
};

export default func;
func.id = "deploy_fhe_voting";
func.tags = ["FHEVoting"];
