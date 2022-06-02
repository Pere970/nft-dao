const deployFunction = async ({ getNamedAccounts, deployments, network }) => {
  console.log(`Deploying on network ${network.name}`);
  const { deploy } = deployments;
  const { root } = await getNamedAccounts();

  await deploy("DaoNFT", {
    contract: "DaoNFT",
    from: root,
    args: ["DAO Token", "DAO"],
    log: true,
  });
};

module.exports = deployFunction;
module.exports.tags = ["Token"];
