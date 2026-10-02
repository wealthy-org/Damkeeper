// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// Official Damkeeper community & utility token for testing and lock exercising on Robinhood Chain.
contract DamkeeperToken is ERC20 {
    constructor() ERC20("Damkeeper", "DAM") {
        _mint(msg.sender, 10_000_000 ether);
    }
}

contract DeployDamToken is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        DamkeeperToken token = new DamkeeperToken();
        vm.stopBroadcast();
        console.log("Damkeeper Token (DAM):", address(token));
    }
}
