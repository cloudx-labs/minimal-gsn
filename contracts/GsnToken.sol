// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GsnToken is ERC20, Ownable {
    uint8 private _decimals = 0;

    constructor(address stakeManager) ERC20("GsnToken", "$GSN") {
        _mint(msg.sender, 10000);
        _approve(msg.sender, stakeManager, 10000);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}