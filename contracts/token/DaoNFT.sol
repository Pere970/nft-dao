// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/draft-ERC721Votes.sol";

contract DaoNFT is ERC721, EIP712, ERC721Votes {
    using Counters for Counters.Counter;

    /*
        State variables
    */

    Counters.Counter private tokenIdCounter;

    /*
        Constructor
    */

    constructor(string memory _collectionName, string memory _collectionSymbol) ERC721(_collectionName,_collectionSymbol) EIP712(_collectionName, "1") {}

    /* 
        Minting
    */

    /**
     * @dev  Mints a new token after incrementing the id counter by one.
     * @notice not using onlyOwner modifier for testing purposes. On real cases, this should be used or charge the user a minting fee.
     */
    function mintToken() public {
        uint256 tokenId = tokenIdCounter.current();
        tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
    }

    /* 
        Internal functions
    */

    /**
    * @dev  Overrides standard ERC721 and ERC721Votes _afterTokenTransfer function.
    * @param from     address representing who is sending the token
    * @param to       address representing who is receiving the token
    * @param tokenId  uint256 representing the id of the token
    */
    function _afterTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Votes)
    {
        super._afterTokenTransfer(from, to, tokenId);
    }
}