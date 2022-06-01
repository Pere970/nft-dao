const { expect } = require("chai");
const { ethers } = require("hardhat");
const init = require("../test-init");
const testConfig = require("../test-config");

const deploy = async () => {
    const setup = await init.initialize(await ethers.getSigners());
  
    setup.counter = await init.getContractInstance("Counter", setup.roles.root);
  
    setup.data = {};
  
    return setup;
  };

describe("Contract: Counter", async function () {

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
        it("Should deploy an instance of Counter", async function () {
            expect(setup.counter.address).not.to.equal(testConfig.SharedVariables.ZERO_ADDRESS);
        });
    
        it("Should have a value of 0", async function () {
            expect(await setup.counter.current()).to.equal(0);
        })
    })

    /* Contract Interaction */
    context("Contract Interaction", async () => {
        it("Should increment the counter by one if called by the admin", async function () {
            const current = await setup.counter.current();
            await setup.counter.increment();
            const newValue = await setup.counter.current();
            expect(newValue.sub(current)).to.equal(1);
        });
    
        it("Should not let increment if not called by the owner", async function () {
            await expect(setup.counter.connect(beneficiary).increment())
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should decrement the counter by one if called by the admin", async function () {
            await setup.counter.increment();
            const current = await setup.counter.current();
            await setup.counter.decrement();
            const newValue = await setup.counter.current();
            expect(newValue.sub(current)).to.equal(-1);
        });
    
        it("Should not let decrement if not called by the owner", async function () {
            await expect(setup.counter.connect(beneficiary).decrement())
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not let decrement below 0", async function () {
            await expect(setup.counter.decrement())
            .to.be.revertedWith("Counter: decrement overflow");
        });

        it("Should not let transfer ownership when not called by the owner", async function () {
            await expect(setup.counter.connect(beneficiary).transferOwnership(beneficiary.address))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should let transfer ownership when called by the owner", async function () {
            const currentOwner = await setup.counter.owner();
            await setup.counter.transferOwnership(beneficiary.address);
            const newOwner = await setup.counter.owner();
            expect(currentOwner).to.equal(owner.address);
            expect(newOwner).to.equal(beneficiary.address);
        });
    })
    
});
