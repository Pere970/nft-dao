const deployFunction = async ({ getNamedAccounts, deployments, network }) => {
    const { deploy } = deployments;
    const { root } = await getNamedAccounts();
  
    await deploy("Greeter", {
      from: root,
      args: ["HELLO!!!!"],
      log: true,
    });
  };
  
  module.exports = deployFunction;
  module.exports.tags = ["Greeter"];