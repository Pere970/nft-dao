// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Counter is Ownable {
    using Counters for Counters.Counter;

    /*
        State variables
    */

    Counters.Counter private counter;

    /*
        Events
    */    
    event ValueIncremented(uint256 newValue);
    event ValueDecremented(uint256 newValue);
  
    /*
        Constructor
    */
    constructor() {}

    /* 
        Public functions
    */

    /**
     * @dev  Returns the current value of the counter.
     */
    function current() public view returns (uint256) {
        return counter.current();
    }

    /* 
        Admin functions
    */

    /**
    * @dev  Changes the owner of the contract.
    * @param newAddress address representing the new owner
    */
    function transferOwnership(address newAddress) public virtual override(Ownable) onlyOwner {
        super._transferOwnership(newAddress);
    }
    
    /**
     * @dev  Increments the counter value by one.
     */
    function increment() public onlyOwner {
        counter.increment();
        emit ValueIncremented(counter.current());
    }

    /**
     * @dev  Decrements the counter value by one.
     */
    function decrement() public onlyOwner {
        counter.decrement();
        emit ValueDecremented(counter.current());
    }
}