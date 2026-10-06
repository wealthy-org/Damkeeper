// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperStakingFactory} from "../src/DamkeeperStakingFactory.sol";
import {DamkeeperStakingPool} from "../src/DamkeeperStakingPool.sol";

contract DeployStaking is Script {
    address constant DAM_TOKEN = 0x70ecc8a7Af0c97bD5B5A420fFd35B5e693f4e4b4;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy Factory
        DamkeeperStakingFactory factory = new DamkeeperStakingFactory(
            deployer,
            0, // zero creation fee
            payable(deployer)
        );

        // 2. Deploy Official $DAM Staking Pool via Factory
        address officialPool = factory.createPool(
            DAM_TOKEN,
            DAM_TOKEN,
            0, // Flexible
            "Official $DAM Staking Pool"
        );

        vm.stopBroadcast();

        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Deployer:                      ", deployer);
        console.log("DamkeeperStakingFactory:       ", address(factory));
        console.log("Official $DAM Staking Pool:    ", officialPool);
    }
}
