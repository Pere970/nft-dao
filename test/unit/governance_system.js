const { expect } = require("chai");
const { ethers } = require("hardhat");
const init = require("../test-init");
const { moveBlocks } = require("../helpers/move");
const { moveTime } = require("../helpers/move_time");
const testConfig = require("../test-config");

const deploy = async () => {
  const setup = await init.initialize(await ethers.getSigners());

  setup.tokens = await init.gettokenInstances(setup);

  setup.counter = await init.getContractInstance("Counter", setup.roles.root);

  setup.timelock = await init.getContractInstance(
    "Timelock",
    setup.roles.root,
    [
      testConfig.TimelockArguments.MIN_DELAY,
      testConfig.TimelockArguments.proposers,
      testConfig.TimelockArguments.executors,
    ]
  );

  setup.governor = await init.getContractInstance(
    "GovernorContract",
    setup.roles.root,
    [
      setup.tokens.nft.address,
      testConfig.GovernorArguments.QUORUM_PERCENTAGE,
      testConfig.GovernorArguments.VOTING_PERIOD,
      testConfig.GovernorArguments.VOTING_DELAY,
      setup.timelock.address,
    ]
  );

  setup.data = {};

  return setup;
};

describe("Governance System", async function () {
  let setup;
  let owner;
  let beneficiary;
  let timelock;
  let governor;
  let nft;
  let counter;

  beforeEach(async () => {
    setup = await deploy();
    owner = setup.roles.root;
    beneficiary = setup.roles.beneficiary;
    nft = setup.tokens.nft;
    timelock = setup.timelock;
    governor = setup.governor;
    counter = setup.counter;

    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    const proposerTx = await timelock.grantRole(proposerRole, governor.address);
    await proposerTx.wait(1);
    const executorTx = await timelock.grantRole(
      executorRole,
      testConfig.SharedVariables.ZERO_ADDRESS
    );
    await executorTx.wait(1);

    await counter.transferOwnership(timelock.address);
  });

  /* Contract deployment */
  context("Contract deployment and setup", async () => {
    it("Should deploy all the smart contracts", async function () {
      expect(counter.address).not.to.equal(
        testConfig.SharedVariables.ZERO_ADDRESS
      );
      expect(timelock.address).not.to.equal(
        testConfig.SharedVariables.ZERO_ADDRESS
      );
      expect(governor.address).not.to.equal(
        testConfig.SharedVariables.ZERO_ADDRESS
      );
      expect(nft.address).not.to.equal(testConfig.SharedVariables.ZERO_ADDRESS);
    });

    it("Should make timelock the owner of the counter contract", async function () {
      expect(await counter.owner()).to.equal(timelock.address);
    });

    it("Should grant the proposer role to the governor contract", async function () {
      const proposerRole = await timelock.PROPOSER_ROLE();
      expect(await timelock.hasRole(proposerRole, governor.address)).to.be.true;
    });

    it("Should grant the executor role to the zero address", async function () {
      const proposerRole = await timelock.EXECUTOR_ROLE();
      expect(
        await timelock.hasRole(
          proposerRole,
          testConfig.SharedVariables.ZERO_ADDRESS
        )
      ).to.be.true;
    });
  });

  describe("Proposals creation", () => {
    context("Should not let create a proposal", async () => {
      it("If the account has not any votes", async function () {
        const currentBalance = await nft.balanceOf(owner.address);
        const encodedIncrementFunction = counter.interface.encodeFunctionData(
          "increment",
          []
        );
        const proposalDescription = "Increment counter by one";
        await expect(
          governor["propose(address[],uint256[],bytes[],string)"](
            [counter.address],
            [0],
            [encodedIncrementFunction],
            proposalDescription
          )
        ).to.be.revertedWith(
          "Governor: proposer votes below proposal threshold"
        );
        expect(currentBalance).to.equal(0);
      });

      it("If the account has not delegated voting power", async function () {
        await nft.mintToken();
        const currentBalance = await nft.balanceOf(owner.address);
        expect(currentBalance).to.equal(1);
        const encodedIncrementFunction = counter.interface.encodeFunctionData(
          "increment",
          []
        );
        const proposalDescription = "Increment counter by one";
        await expect(
          governor["propose(address[],uint256[],bytes[],string)"](
            [counter.address],
            [0],
            [encodedIncrementFunction],
            proposalDescription
          )
        ).to.be.revertedWith(
          "Governor: proposer votes below proposal threshold"
        );
      });
    });

    context("Should let create a proposal", async () => {
      it("If the account has enough voting power", async function () {
        await nft.mintToken();
        await nft.delegate(owner.address);
        const currentBalance = await nft.balanceOf(owner.address);
        const encodedIncrementFunction = counter.interface.encodeFunctionData(
          "increment",
          []
        );
        const proposalDescription = "Increment counter by one";
        const tx = await governor[
          "propose(address[],uint256[],bytes[],string)"
        ](
          [counter.address],
          [0],
          [encodedIncrementFunction],
          proposalDescription
        );
        expect(currentBalance).to.equal(1);
        const txReceipt = await tx.wait();
        expect(txReceipt.events[0].event).to.equal("ProposalCreated");
      });
    });
  });

  describe("Proposals voting", () => {
    let proposalId;
    beforeEach(async () => {
      await nft.mintToken();
      await nft.delegate(owner.address);
      const encodedIncrementFunction = counter.interface.encodeFunctionData(
        "increment",
        []
      );
      const proposalDescription = "Increment counter by one";
      const tx = await governor["propose(address[],uint256[],bytes[],string)"](
        [counter.address],
        [0],
        [encodedIncrementFunction],
        proposalDescription
      );
      const txReceipt = await tx.wait();
      proposalId = txReceipt.events[0].args.proposalId;
    });

    context("Should not let vote", async () => {
      it("If the voting delay has not ended", async function () {
        await expect(
          governor.connect(beneficiary).castVote(proposalId, 0)
        ).to.be.revertedWith("Governor: vote not currently active");
      });

      it("If the user has not enough voting power", async function () {
        const threshold = await governor.proposalThreshold();
        const currentBeneficiaryBalance = await nft.balanceOf(
          beneficiary.address
        );
        expect(currentBeneficiaryBalance).to.equal(0);
        expect(currentBeneficiaryBalance).to.be.below(threshold);
        await moveBlocks(testConfig.GovernorArguments.VOTING_DELAY);

        await governor.connect(beneficiary).castVote(proposalId, 1);
        const proposal = await governor.proposals(proposalId);
        // It lets the user vote but its weight is 0
        expect(proposal.forVotes).to.equal(0);
      });

      it("If the voting period has ended", async function () {
        await moveBlocks(testConfig.GovernorArguments.VOTING_DELAY);
        await moveBlocks(testConfig.GovernorArguments.VOTING_PERIOD);
        await expect(
          governor.connect(beneficiary).castVote(proposalId, 0)
        ).to.be.revertedWith("Governor: vote not currently active");
      });
    });

    context("Should let vote", async () => {
      it("If the voting delay ended and user has enough power", async function () {
        await moveBlocks(testConfig.GovernorArguments.VOTING_DELAY);
        await governor.castVote(proposalId, 0);
        const proposal = await governor.proposals(proposalId);
        // It lets the user vote but its weight is 0
        expect(proposal.againstVotes).to.equal(1);
      });
    });
  });

  describe("Proposals queuing", () => {
    let proposalId;
    beforeEach(async () => {
      await nft.mintToken();
      await nft.delegate(owner.address);
      const encodedIncrementFunction = counter.interface.encodeFunctionData(
        "increment",
        []
      );
      const proposalDescription = "Increment counter by one";
      const tx = await governor["propose(address[],uint256[],bytes[],string)"](
        [counter.address],
        [0],
        [encodedIncrementFunction],
        proposalDescription
      );
      const txReceipt = await tx.wait();
      proposalId = txReceipt.events[0].args.proposalId;
    });

    context("Should not let queue", async () => {
      it("If the voting period has not ended", async function () {
        await moveBlocks(testConfig.GovernorArguments.VOTING_DELAY);
        await governor.castVote(proposalId, 1);
        await expect(governor["queue(uint256)"](proposalId)).to.be.revertedWith(
          "Governor: proposal not successful"
        );
      });

      it("If the voting has not been successful", async function () {
        await moveBlocks(testConfig.GovernorArguments.VOTING_DELAY);
        await governor.castVote(proposalId, 0);
        await expect(governor["queue(uint256)"](proposalId)).to.be.revertedWith(
          "Governor: proposal not successful"
        );
      });
    });

    context("Should let queue", async () => {
      it("If the voting period has passed and status is successful", async function () {
        await moveBlocks(testConfig.GovernorArguments.VOTING_DELAY);
        await governor.castVote(proposalId, 1);
        await moveBlocks(testConfig.GovernorArguments.VOTING_PERIOD);
        expect(await governor.state(proposalId)).to.equal(4);
        await governor["queue(uint256)"](proposalId);
        expect(await governor.state(proposalId)).to.equal(5);
      });
    });
  });

  describe("Proposals execution", () => {
    let proposalId;
    beforeEach(async () => {
      await nft.mintToken();
      await nft.delegate(owner.address);
      const encodedIncrementFunction = counter.interface.encodeFunctionData(
        "increment",
        []
      );
      const proposalDescription = "Increment counter by one";
      const tx = await governor["propose(address[],uint256[],bytes[],string)"](
        [counter.address],
        [0],
        [encodedIncrementFunction],
        proposalDescription
      );
      const txReceipt = await tx.wait();
      proposalId = txReceipt.events[0].args.proposalId;
      await moveBlocks(testConfig.GovernorArguments.VOTING_DELAY);
      await governor.castVote(proposalId, 1); //For Vote
      await moveBlocks(testConfig.GovernorArguments.VOTING_PERIOD);
      await governor["queue(uint256)"](proposalId); //queue the proposal
    });

    context("Should not let execute", async () => {
      it("If the time delay is not over", async function () {
        await expect(
          governor["execute(uint256)"](proposalId)
        ).to.be.revertedWith("TimelockController: operation is not ready");
      });
    });

    context("Should let queue", async () => {
      it("If the time delay is over", async function () {
        await moveTime(testConfig.TimelockArguments.MIN_DELAY);
        const currentCounterValue = await counter.current();
        await governor["execute(uint256)"](proposalId);
        const newCounterValue = await counter.current();
        expect(newCounterValue.sub(currentCounterValue)).to.equal(1);
      });
    });
  });
});
