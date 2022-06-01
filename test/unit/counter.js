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
    let counter;

    beforeEach(async () => {
        setup = await deploy();
        owner = setup.roles.root;
        beneficiary = setup.roles.beneficiary;
        counter = setup.counter;
    })

    /* Contract deployment */
    context("Contract deployment", async () => {
        it("Should deploy an instance of Counter", async function () {
            expect(counter.address).not.to.equal(testConfig.SharedVariables.ZERO_ADDRESS);
        });
    
        it("Should have a value of 0", async function () {
            expect(await counter.current()).to.equal(0);
        })
    })

    /* Contract Interaction */
    context("Contract Interaction", async () => {
        it("Should increment the counter by one if called by the admin", async function () {
            const current = await counter.current();
            await counter.increment();
            const newValue = await counter.current();
            expect(newValue.sub(current)).to.equal(1);
        });
    
        it("Should not let increment if not called by the owner", async function () {
            await expect(counter.connect(beneficiary).increment())
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should decrement the counter by one if called by the admin", async function () {
            await counter.increment();
            const current = await counter.current();
            await counter.decrement();
            const newValue = await counter.current();
            expect(newValue.sub(current)).to.equal(-1);
        });
    
        it("Should not let decrement if not called by the owner", async function () {
            await expect(counter.connect(beneficiary).decrement())
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not let decrement below 0", async function () {
            await expect(counter.decrement())
            .to.be.revertedWith("Counter: decrement overflow");
        });

        it("Should not let transfer ownership when not called by the owner", async function () {
            await expect(counter.connect(beneficiary).transferOwnership(beneficiary.address))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should let transfer ownership when called by the owner", async function () {
            const currentOwner = await counter.owner();
            await counter.transferOwnership(beneficiary.address);
            const newOwner = await counter.owner();
            expect(currentOwner).to.equal(owner.address);
            expect(newOwner).to.equal(beneficiary.address);
        });
    })
    
});
