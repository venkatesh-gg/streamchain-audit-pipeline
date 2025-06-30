const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying AuditLogger contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const AuditLogger = await ethers.getContractFactory("AuditLogger");
  const auditLogger = await AuditLogger.deploy();

  await auditLogger.deployed();

  console.log("AuditLogger deployed to:", auditLogger.address);
  console.log("Transaction hash:", auditLogger.deployTransaction.hash);

  // Verify contract on Etherscan (if not localhost)
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await auditLogger.deployTransaction.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: auditLogger.address,
        constructorArguments: [],
      });
    } catch (error) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log("Contract already verified!");
      } else {
        console.error(error);
      }
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    address: auditLogger.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    transactionHash: auditLogger.deployTransaction.hash
  };

  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });