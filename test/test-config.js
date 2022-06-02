const NFTArguments = {
  name: "DAO Token",
  symbol: "DAO",
};

const TimelockArguments = {
  MIN_DELAY: 60,
  proposers: [],
  executors: [],
};

const GovernorArguments = {
  QUORUM_PERCENTAGE: 51,
  VOTING_PERIOD: 200,
  VOTING_DELAY: 200,
};

const SharedVariables = {
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
};

module.exports = {
  NFTArguments,
  SharedVariables,
  TimelockArguments,
  GovernorArguments,
};
