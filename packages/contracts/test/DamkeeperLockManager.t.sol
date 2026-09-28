// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamkeeperLockManager} from "../src/DamkeeperLockManager.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Example", "EXMPL") {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}

/// A token that silently ignores transferFrom, so `received != amount` should be caught.
contract ShortTransferToken is ERC20 {
    constructor() ERC20("Short", "SHORT") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        super.transferFrom(from, to, amount / 2); // sends less than requested
        return true;
    }
}

contract DamkeeperLockManagerTest is Test {
    DamkeeperLockManager manager;
    MockToken token;
    address admin = address(0xA11CE);
    address creator = address(0xC0FFEE);
    address beneficiary = address(0xB0B);
    address attacker = address(0xBAD);

    uint256 constant AMOUNT = 500_000 ether;
    uint64 unlockTime;

    function setUp() public {
        manager = new DamkeeperLockManager(admin);
        token = new MockToken();

        vm.prank(admin);
        manager.setTokenPolicy(address(token), true, type(uint256).max);
        vm.prank(admin);
        manager.setCreationPaused(false);

        token.transfer(creator, AMOUNT);
        unlockTime = uint64(block.timestamp + 30 days);

        vm.startPrank(creator);
        token.approve(address(manager), AMOUNT);
        manager.createLock(address(token), beneficiary, AMOUNT, unlockTime);
        vm.stopPrank();
    }

    // ---- timing ----

    function test_withdrawBeforeUnlockReverts() public {
        vm.warp(unlockTime - 1);
        vm.prank(beneficiary);
        vm.expectRevert(DamkeeperLockManager.NotYetUnlocked.selector);
        manager.withdraw(1);
    }

    function test_withdrawExactlyAtUnlock() public {
        vm.warp(unlockTime);
        vm.prank(beneficiary);
        manager.withdraw(1);
        assertEq(token.balanceOf(beneficiary), AMOUNT);
    }

    function test_withdrawAfterUnlock() public {
        vm.warp(unlockTime + 365 days);
        vm.prank(beneficiary);
        manager.withdraw(1);
        assertEq(token.balanceOf(beneficiary), AMOUNT);
    }

    // ---- authorization ----

    function test_creatorCannotWithdrawIfNotBeneficiary() public {
        vm.warp(unlockTime);
        vm.prank(creator);
        vm.expectRevert(DamkeeperLockManager.NotBeneficiary.selector);
        manager.withdraw(1);
    }

    function test_attackerCannotWithdraw() public {
        vm.warp(unlockTime);
        vm.prank(attacker);
        vm.expectRevert(DamkeeperLockManager.NotBeneficiary.selector);
        manager.withdraw(1);
    }

    // ---- withdrawal ----

    function test_doubleWithdrawReverts() public {
        vm.warp(unlockTime);
        vm.prank(beneficiary);
        manager.withdraw(1);

        vm.prank(beneficiary);
        vm.expectRevert(DamkeeperLockManager.AlreadyWithdrawn.selector);
        manager.withdraw(1);
    }

    // ---- input validation ----

    function test_zeroBeneficiaryReverts() public {
        vm.startPrank(creator);
        token.approve(address(manager), AMOUNT);
        vm.expectRevert(DamkeeperLockManager.InvalidBeneficiary.selector);
        manager.createLock(address(token), address(0), AMOUNT, uint64(block.timestamp + 1 days));
        vm.stopPrank();
    }

    function test_zeroAmountReverts() public {
        vm.prank(creator);
        vm.expectRevert(DamkeeperLockManager.InvalidAmount.selector);
        manager.createLock(address(token), beneficiary, 0, uint64(block.timestamp + 1 days));
    }

    function test_pastUnlockTimeReverts() public {
        vm.prank(creator);
        vm.expectRevert(DamkeeperLockManager.InvalidUnlockTime.selector);
        manager.createLock(address(token), beneficiary, AMOUNT, uint64(block.timestamp));
    }

    // ---- ERC-20 edge cases ----

    function test_shortTransferReverts() public {
        ShortTransferToken bad = new ShortTransferToken();
        vm.prank(admin);
        manager.setTokenPolicy(address(bad), true, type(uint256).max);

        bad.transfer(creator, 1000 ether);
        vm.startPrank(creator);
        bad.approve(address(manager), 1000 ether);
        vm.expectRevert(DamkeeperLockManager.DepositMismatch.selector);
        manager.createLock(address(bad), beneficiary, 1000 ether, uint64(block.timestamp + 1 days));
        vm.stopPrank();
    }

    // ---- admission ----

    function test_disabledTokenBlocksCreate() public {
        vm.prank(admin);
        manager.setTokenPolicy(address(token), false, 0);

        vm.startPrank(creator);
        token.approve(address(manager), AMOUNT);
        vm.expectRevert(DamkeeperLockManager.TokenNotEnabled.selector);
        manager.createLock(address(token), beneficiary, AMOUNT, uint64(block.timestamp + 1 days));
        vm.stopPrank();
    }

    function test_capExceededReverts() public {
        vm.prank(admin);
        manager.setTokenPolicy(address(token), true, AMOUNT); // cap already hit by setUp's lock

        vm.startPrank(creator);
        token.approve(address(manager), 1 ether);
        vm.expectRevert(DamkeeperLockManager.CapExceeded.selector);
        manager.createLock(address(token), beneficiary, 1 ether, uint64(block.timestamp + 1 days));
        vm.stopPrank();
    }

    function test_creationPausedBlocksCreate() public {
        vm.prank(admin);
        manager.setCreationPaused(true);

        vm.startPrank(creator);
        token.approve(address(manager), AMOUNT);
        vm.expectRevert(DamkeeperLockManager.CreationIsPaused.selector);
        manager.createLock(address(token), beneficiary, AMOUNT, uint64(block.timestamp + 1 days));
        vm.stopPrank();
    }

    // ---- exit path stays open even when create is paused ----

    function test_withdrawWorksWhileCreationPaused() public {
        vm.prank(admin);
        manager.setCreationPaused(true);

        vm.warp(unlockTime);
        vm.prank(beneficiary);
        manager.withdraw(1);
        assertEq(token.balanceOf(beneficiary), AMOUNT);
    }

    // ---- direct transfer must not grant rights ----

    function test_directTransferDoesNotCreatePosition() public {
        token.transfer(address(manager), 1000 ether);
        // position #2 was never created — getLock returns the zero struct
        DamkeeperLockManager.LockPosition memory pos = manager.getLock(2);
        assertEq(pos.beneficiary, address(0));
    }
}
