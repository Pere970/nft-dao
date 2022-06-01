const { expect } = require("chai");
const { ethers } = require("hardhat");
const init = require("../test-init");
const { moveBlocks } = require("../helpers/move")
const testConfig = require("../test-config");

const deploy = async () => {
    const setup = await init.initialize(await ethers.getSigners());
  
    setup.tokens = await init.gettokenInstances(setup);
  
    setup.data = {};
  
    return setup;
  };

describe("Contract: NFTCollection", async function () {

    let setup;
    let owner;
    let beneficiary;

    beforeEach(async () => {
        setup = await deploy();
        owner = setup.roles.root;
        beneficiary = setup.roles.beneficiary;
    })

    /* Contract deployment */
    context("Contract deployment", async () => {
        it("Should deploy an instance of NFT Collection", async function () {
            expect(setup.tokens.nft.address).not.to.equal(testConfig.SharedVariables.ZERO_ADDRESS);
        });
    
        it(`Should have the desired name and symbol (${testConfig.NFTArguments.name}, ${testConfig.NFTArguments.symbol})`, async function () {
            expect(await setup.tokens.nft.name()).to.equal(testConfig.NFTArguments.name);
            expect(await setup.tokens.nft.symbol()).to.equal(testConfig.NFTArguments.symbol);
        })
    })
    

    /* Minting */
    context("Minting tokens", async () => {
        it("Should let anyone mint a DAO Token", async function () {
            const currentBalance = await setup.tokens.nft.balanceOf(beneficiary.address);
            await setup.tokens.nft.connect(beneficiary).mintToken();
            const newBalance = await setup.tokens.nft.balanceOf(beneficiary.address);
            expect(newBalance.sub(currentBalance)).to.equal(1);
        })
    
        it("Should emit Transfer event when minting a token", async function () {
            const tx = await setup.tokens.nft.mintToken();
            // Get the transaction receipt to access the events
            const txReceipt = await tx.wait();
            expect(txReceipt.events.length).to.equal(1);
            expect(txReceipt.events[0].event).to.equal("Transfer");
        })

        it("Should increment token total supply", async function () {
            let currentBlock = await ethers.provider.getBlock("latest")
            await moveBlocks(1) // mine block
            const currentSupply = await setup.tokens.nft.getPastTotalSupply(currentBlock.number);
            await setup.tokens.nft.mintToken();
            var newCurrentBlock = await ethers.provider.getBlock("latest")
            await moveBlocks(1) // mine block
            const newSupply = await setup.tokens.nft.getPastTotalSupply(newCurrentBlock.number);
            expect(newSupply.sub(currentSupply)).to.equal(1);
        })
    })
    

    /* Voting power tracking */
    context("Voting power tracking", async () => {
        it("Should not track voting power if user hasn't delegated it", async function () {
            const currentVotingPower = await setup.tokens.nft.getVotes(owner.address);
            await setup.tokens.nft.mintToken();
            const newVotingPower = await setup.tokens.nft.getVotes(owner.address);
            expect(newVotingPower.sub(currentVotingPower)).to.equal(0); // no change
        })
    
        it("Should track voting power once it has been delegated", async function () {
            await setup.tokens.nft.delegate(owner.address);
            const currentVotingPower = await setup.tokens.nft.getVotes(owner.address);
            await setup.tokens.nft.mintToken();
            const newVotingPower = await setup.tokens.nft.getVotes(owner.address);
            // now owns 1 NFT => 1 NFT = 1 Vote
            expect(newVotingPower.sub(currentVotingPower)).to.equal(1); 
        })
    
        it("Votes should be transfered when transfering the token and the receiver has delegated", async function () {
            await setup.tokens.nft.delegate(owner.address);
            const initialVotingPower = await setup.tokens.nft.getVotes(owner.address);
            const initialBeneficiaryVotingPower = await setup.tokens.nft.getVotes(beneficiary.address);
            // Get the transaction receipt to access the events and the tokenId
            const tx = await setup.tokens.nft.mintToken();
            const txReceipt = await tx.wait();

            const newVotingPower = await setup.tokens.nft.getVotes(owner.address);
            expect(newVotingPower.sub(initialVotingPower)).to.equal(1);
            await setup.tokens.nft.transferFrom(
                owner.address,
                beneficiary.address, 
                txReceipt.events[0].args["tokenId"]
            );
            const votingPowerAfterTransfer = await setup.tokens.nft.getVotes(owner.address);
            expect(votingPowerAfterTransfer).to.equal(0);
            await setup.tokens.nft.connect(beneficiary).delegate(beneficiary.address);
            expect((await setup.tokens.nft.getVotes(beneficiary.address)).sub(initialBeneficiaryVotingPower)).to.equal(1);
            
        })
    })
    
});
