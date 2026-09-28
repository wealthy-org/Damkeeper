// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperLockManager} from "../src/DamkeeperLockManager.sol";
import {DamkeeperVestingManager} from "../src/DamkeeperVestingManager.sol";

/// Enables the example token for creation on both managers and unpauses
/// creation — the two admin-only calls in brief.md section 9.3, run against
/// already-deployed testnet managers.
contract EnableToken is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address lockManagerAddr = vm.envAddress("LOCK_MANAGER_ADDRESS");
        address vestingManagerAddr = vm.envAddress("VESTING_MANAGER_ADDRESS");
        address token = vm.envAddress("EXAMPLE_TOKEN_ADDRESS");
        uint256 cap = vm.envOr("LIABILITY_CAP", uint256(10_000_000 ether));

        DamkeeperLockManager lockManager = DamkeeperLockManager(lockManagerAddr);
        DamkeeperVestingManager vestingManager = DamkeeperVestingManager(vestingManagerAddr);

        vm.startBroadcast(deployerKey);

        lockManager.setTokenPolicy(token, true, cap);
        lockManager.setCreationPaused(false);

        vestingManager.setTokenPolicy(token, true, cap);
        vestingManager.setCreationPaused(false);

        vm.stopBroadcast();

        console.log("Token enabled on both managers, creation unpaused.");
        console.log("Token:  ", token);
        console.log("Cap:    ", cap);
    }
}
