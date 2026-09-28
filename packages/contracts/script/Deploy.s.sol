// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperLockManager} from "../src/DamkeeperLockManager.sol";
import {DamkeeperVestingManager} from "../src/DamkeeperVestingManager.sol";

/// Deploys both managers with msg.sender as the initial admin. Creation stays
/// paused and no token is enabled until setTokenPolicy/setCreationPaused are
/// called explicitly — matches the "default deployment" rule in brief.md 9.3.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        DamkeeperLockManager lockManager = new DamkeeperLockManager(deployer);
        DamkeeperVestingManager vestingManager = new DamkeeperVestingManager(deployer);

        vm.stopBroadcast();

        console.log("Deployer / admin:      ", deployer);
        console.log("DamkeeperLockManager:  ", address(lockManager));
        console.log("DamkeeperVestingManager:", address(vestingManager));
    }
}
