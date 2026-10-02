// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperVestingManager} from "../src/DamkeeperVestingManager.sol";

/// Deploys DamkeeperVestingManager on Robinhood Chain Mainnet,
/// enables the Damkeeper Token ($DAM), and unpauses creation in a single broadcast.
contract DeployVesting is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address token = vm.envOr("EXAMPLE_TOKEN_ADDRESS", address(0x8Fc5E1dFaeB1a4311CbBF8A387F3db530B78F3e0));
        uint256 cap = vm.envOr("LIABILITY_CAP", uint256(10_000_000 ether));

        vm.startBroadcast(deployerKey);

        DamkeeperVestingManager vestingManager = new DamkeeperVestingManager(deployer);
        vestingManager.setTokenPolicy(token, true, cap);
        vestingManager.setCreationPaused(false);

        vm.stopBroadcast();

        console.log("==================================================");
        console.log("  DamkeeperVestingManager Deployed & Configured!  ");
        console.log("==================================================");
        console.log("Deployer / admin:        ", deployer);
        console.log("DamkeeperVestingManager: ", address(vestingManager));
        console.log("DAM Token enabled:       ", token);
        console.log("Liability cap:           ", cap);
        console.log("Creation unpaused:       ", !vestingManager.creationPaused());
    }
}
