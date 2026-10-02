// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperLockManager} from "../src/DamkeeperLockManager.sol";

contract EnableLockToken is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address lockManagerAddr = vm.envAddress("LOCK_MANAGER_ADDRESS");
        address token = vm.envAddress("EXAMPLE_TOKEN_ADDRESS");
        uint256 cap = vm.envOr("LIABILITY_CAP", uint256(10_000_000 ether));

        DamkeeperLockManager lockManager = DamkeeperLockManager(lockManagerAddr);

        vm.startBroadcast(deployerKey);

        lockManager.setTokenPolicy(token, true, cap);
        lockManager.setCreationPaused(false);

        vm.stopBroadcast();

        console.log("Token policy enabled & creation unpaused on DamkeeperLockManager!");
        console.log("LockManager: ", lockManagerAddr);
        console.log("Token:       ", token);
        console.log("Cap:         ", cap);
    }
}
