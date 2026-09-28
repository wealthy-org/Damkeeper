// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamkeeperVestingManager} from "../src/DamkeeperVestingManager.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Example", "EXMPL") {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}

/// Deterministic case from brief.md section 8.5: 1,200 tokens, 120-day duration, 30-day cliff.
contract DamkeeperVestingManagerTest is Test {
    DamkeeperVestingManager manager;
    MockToken token;
    address admin = address(0xA11CE);
    address creator = address(0xC0FFEE);
    address beneficiary = address(0xB0B);

    uint64 start;
    uint64 cliff;
    uint64 end;
    uint256 constant DAY = 86400;
    uint256 constant AMOUNT = 1_200 ether;

    function setUp() public {
        manager = new DamkeeperVestingManager(admin);
        token = new MockToken();

        vm.prank(admin);
        manager.setTokenPolicy(address(token), true, type(uint256).max);
        vm.prank(admin);
        manager.setCreationPaused(false);

        token.transfer(creator, AMOUNT);

        start = uint64(block.timestamp + 1);
        cliff = start + uint64(30 * DAY);
        end = start + uint64(120 * DAY);

        vm.startPrank(creator);
        token.approve(address(manager), AMOUNT);
        manager.createVesting(address(token), beneficiary, AMOUNT, start, cliff, end);
        vm.stopPrank();
    }

    function test_nothingClaimableBeforeCliff() public {
        vm.warp(start + 29 * DAY);
        assertEq(manager.claimable(1), 0);
    }

    function test_cliffUnlocksCatchUp() public {
        vm.warp(cliff);
        assertEq(manager.vestedAmount(1), 300 ether);
    }

    function test_midpointAndRepeatedClaim() public {
        vm.warp(cliff);
        vm.prank(beneficiary);
        manager.claim(1);
        assertEq(token.balanceOf(beneficiary), 300 ether);

        vm.warp(start + 60 * DAY);
        assertEq(manager.claimable(1), 300 ether);

        vm.prank(beneficiary);
        manager.claim(1);
        assertEq(token.balanceOf(beneficiary), 600 ether);
    }

    function test_fullyVestedAtEnd() public {
        vm.warp(end);
        vm.prank(beneficiary);
        manager.claim(1);
        assertEq(token.balanceOf(beneficiary), AMOUNT);
    }

    function test_claimZeroReverts() public {
        vm.warp(start);
        vm.prank(beneficiary);
        vm.expectRevert(DamkeeperVestingManager.NothingClaimable.selector);
        manager.claim(1);
    }

    function test_onlyBeneficiaryCanClaim() public {
        vm.warp(end);
        vm.prank(creator);
        vm.expectRevert(DamkeeperVestingManager.NotBeneficiary.selector);
        manager.claim(1);
    }
}
