// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperAirdrop} from "../src/DamkeeperAirdrop.sol";

/// Deploys DamkeeperAirdrop to Robinhood Chain Mainnet
contract DeployAirdrop is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        DamkeeperAirdrop airdrop = new DamkeeperAirdrop();

        vm.stopBroadcast();

        console.log("-----------------------------------------");
        console.log("Damkeeper Airdrop Deployed Successfully!");
        console.log("Deployer:          ", deployer);
        console.log("DamkeeperAirdrop:  ", address(airdrop));
        console.log("Network:           Robinhood Chain Mainnet (4663)");
        console.log("-----------------------------------------");
    }
}
