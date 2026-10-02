// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperLockManager} from "../src/DamkeeperLockManager.sol";

/// Deploys only DamkeeperLockManager with deployer as initial admin.
contract DeployLock is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        DamkeeperLockManager lockManager = new DamkeeperLockManager(deployer);

        vm.stopBroadcast();

        console.log("Deployer / admin:     ", deployer);
        console.log("DamkeeperLockManager: ", address(lockManager));
        console.log("Lock Fee (wei):       ", lockManager.lockFee());
        console.log("Fee Recipient:        ", lockManager.feeRecipient());
    }
}
