const { parseEther } = ethers.utils;

const initialize = async (accounts) => {
  const setup = {};
  setup.roles = {
    root: accounts[0],
    beneficiary: accounts[1],
  };

  return setup;
};

const getContractInstance = async (factoryName, address, args) => {
  const Factory = await ethers.getContractFactory(factoryName, address);
  const parameters = args ? args : [];
  return await Factory.deploy(...parameters);
};

const gettokenInstances = async (setup) => {
  const DaoNFT_Factory = await ethers.getContractFactory(
    "DaoNFT",
    setup.roles.root
  );
  const nft = await DaoNFT_Factory.deploy("DAO Token", "DAO");
  return { nft };
};

module.exports = {
  initialize,
  gettokenInstances,
  getContractInstance,
};
