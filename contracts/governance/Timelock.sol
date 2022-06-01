// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract Timelock is TimelockController {

  /* constructor */
  
  /*
  * @param  minDelay how much time has to be waited before executing
  * @param  proposers array of the addresses that can propose
  * @param  executors array of the addresses that can execute
  */
  constructor(
    uint256 minDelay, 
    address[] memory proposers,
    address[] memory executors
  ) TimelockController(minDelay, proposers, executors) {}
}