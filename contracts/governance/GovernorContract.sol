// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract GovernorContract is Governor, GovernorCompatibilityBravo, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl{
    using SafeCast for uint256;

    /*
        State variables
    */
    uint256 public _votingDelay; // Delay in blocks before a voting starts
    uint256 public _votingPeriod; // Delay in blocks while a voting is active
    uint256[] private _proposalIds; // Array of proposal ids

    /* 
        constructor
    */

    /*
        @param  _token address of the token contract used to track voting power
        @param  _quorumPercentage percentage of the total voting power that is needed to pass a proposal
        @param  _governanceVotingPeriod time in blocks while a proposal remains active
        @param _governanceVotingDelay time in blocks before a proposal can be voted on
        @param _timelock address of the timelock contract
    */
    constructor(
        IVotes _token,
        uint256 _quorumPercentage,
        uint256 _governanceVotingPeriod,
        uint256 _governanceVotingDelay,
        TimelockController _timelock
    )
        Governor("Governor")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumPercentage)
        GovernorTimelockControl(_timelock)
    {
        _votingDelay = _governanceVotingDelay;
        _votingPeriod = _governanceVotingPeriod;
    }
    
    /**
     * @dev Returns the voting delay before a proposal can be voted.
     */
    function votingDelay() public view override returns (uint256) {
        return _votingDelay;
    }

    /**
     * @dev Returns the voting period during a proposal can be voted.
     */
    function votingPeriod() public view override returns (uint256) {
        return _votingPeriod;
    }

    /**
     * @dev Returns the minimum token amount required to vote, propose or execute proposals.
     */
    function proposalThreshold() public pure override returns (uint256) {
        return 1;
    }

    /* 
        Information checks    
    */

    /**
     * @dev Returns the quorum required to pass a proposal.
     * @param blockNumber block number to check quorum for
     */
    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /**
    * @dev Returns an address' voting power at a certain block
    * @param account address to check voting power for
    * @param blockNumber block number to check quorum for
    */
    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernor, Governor)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    /**
    * @dev Returns the state of a proposal
    * @param proposalId proposal to check
    */
    function state(uint256 proposalId)
        public
        view
        override(Governor, IGovernor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    /**
     * @dev Implementation of the IERC165 interface. Inherited from OpenZeppelin Governor
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, IERC165, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /* 
        Proposals creations 
    */

    /**
    * @dev Create a new proposal
    * @param targets array of the contract addresses that will be called
    * @param values array of the ether that will be used to call the contracts
    * @param calldatas array of the parameters that will be passed to the contracts
    * @param description description of the proposal, what it does and why it should be voted on
    */
    function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
        public
        override(Governor, GovernorCompatibilityBravo, IGovernor)
        returns (uint256)
    {
        uint256 proposeResult = super.propose(targets, values, calldatas, description);
        _proposalIds.push(proposeResult);
        return proposeResult;
    }

    /* 
        Internal functions
    */

    /**
    * @dev Execute a proposal
    * @param proposalId proposal to execute
    * @param targets array of the contract addresses that will be called
    * @param values array of the ether that will be used to call the contracts
    * @param calldatas array of the parameters that will be passed to the contracts
    * @param descriptionHash descriptionHash of the proposal
    */
    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
    * @dev Cancel an active proposal
    * @param targets array of the contract addresses that will be called
    * @param values array of the ether that will be used to call the contracts
    * @param calldatas array of the parameters that will be passed to the contracts
    * @param descriptionHash descriptionHash of the proposal
    */
    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
    * @dev Returns the dao system executor address
    */
    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    
}