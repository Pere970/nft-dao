const { ethers } = require("hardhat");

const deployFunction = async ({ getNamedAccounts, deployments, network }) => {
  console.log(`Deploying on network ${network.name}`);
  const { deploy } = deployments;
  const { root } = await getNamedAccounts();
  const counter = await ethers.getContract("Counter");
  const nft = await ethers.getContract("DaoNFT");
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  await deploy("Timelock", {
    contract: "Timelock",
    from: root,
    args: [60, [], []],
    log: true,
  });

  const timelock = await ethers.getContract("Timelock");
  if ((await counter.owner()) == root) {
    await counter.transferOwnership(timelock.address);
    console.log(
      `Counter ownership transfered to Timelock => ${timelock.address}`
    );
  }

  const executorRole = await timelock.EXECUTOR_ROLE();
  await timelock.grantRole(executorRole, ZERO_ADDRESS);
  console.log(`Executor role granted to zero address`);

  await deploy("GovernorContract", {
    contract: "GovernorContract",
    from: root,
    args: [nft.address, 51, 20, 20, timelock.address],
    log: true,
  });
  const governor = await ethers.getContract("GovernorContract");

  const proposerRole = await timelock.PROPOSER_ROLE();
  await timelock.grantRole(proposerRole, governor.address);
  console.log(`Proposer role granted to Governor => ${governor.address}`);

  const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();
  await timelock.revokeRole(adminRole, root);
  console.log(`Revoked admin permissions from deployer over Timelock`);
};

module.exports = deployFunction;
module.exports.tags = ["Governance"];
