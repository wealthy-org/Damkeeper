// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// A plain ERC-20 for exercising the deployed managers on testnet. Not a real asset —
/// mirrors the "EXMPL" example token used throughout the landing page and brief.md demos.
contract ExampleToken is ERC20 {
    constructor() ERC20("Example Token", "EXMPL") {
        _mint(msg.sender, 10_000_000 ether);
    }
}

contract DeployTestToken is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        ExampleToken token = new ExampleToken();
        vm.stopBroadcast();
        console.log("ExampleToken (EXMPL):", address(token));
    }
}
