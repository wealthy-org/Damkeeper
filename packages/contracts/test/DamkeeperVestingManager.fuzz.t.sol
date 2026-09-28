// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamkeeperVestingManager} from "../src/DamkeeperVestingManager.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Example", "EXMPL") {
        _mint(msg.sender, 1_000_000_000_000 ether);
    }
}

/// Fuzzes the vesting formula against an independently-written reference model
/// (plain Python-style integer math, not a copy of the contract's mulDiv call),
/// per brief.md section 14.2 — "jangan hanya menyalin rumus implementasi ke
/// expected result".
contract DamkeeperVestingManagerFuzzTest is Test {
    DamkeeperVestingManager manager;
    MockToken token;
    address admin = address(0xA11CE);
    address creator = address(0xC0FFEE);
    address beneficiary = address(0xB0B);

    function setUp() public {
        manager = new DamkeeperVestingManager(admin);
        token = new MockToken();

        vm.prank(admin);
        manager.setTokenPolicy(address(token), true, type(uint256).max);
        vm.prank(admin);
        manager.setCreationPaused(false);

        token.transfer(creator, 1_000_000_000 ether);
    }

    /// Independent reference implementation of brief.md section 8.5.
    function referenceVested(uint256 amount, uint256 start, uint256 cliff, uint256 end, uint256 t)
        internal
        pure
        returns (uint256)
    {
        if (t < start) return 0;
        if (cliff != 0 && t < cliff) return 0;
        if (t >= end) return amount;
        // Independent integer-division formula (written separately from Math.mulDiv).
        uint256 elapsed = t - start;
        uint256 duration = end - start;
        return (amount * elapsed) / duration;
    }

    function testFuzz_vestedMatchesIndependentModel(
        uint256 amount,
        uint64 startOffset,
        uint64 duration,
        uint64 cliffOffset,
        uint64 tOffset,
        bool withCliff
    ) public {
        amount = bound(amount, 1, 1_000_000 ether);
        // Minimum 2 seconds so a cliff strictly between start and end (start < cliff < end,
        // brief.md 8.4) always has at least one valid value to pick.
        duration = uint64(bound(duration, 2, 4 * 365 days));
        startOffset = uint64(bound(startOffset, 1, 30 days));
        tOffset = uint64(bound(tOffset, 0, 2 * uint256(duration) + 1 days));

        uint64 start = uint64(block.timestamp) + startOffset;
        uint64 end = start + duration;
        uint64 cliff = 0;
        if (withCliff) {
            cliffOffset = uint64(bound(cliffOffset, 1, duration - 1));
            cliff = start + cliffOffset;
        }

        vm.startPrank(creator);
        token.approve(address(manager), amount);
        uint256 positionId = manager.createVesting(address(token), beneficiary, amount, start, cliff, end);
        vm.stopPrank();

        uint256 t = uint256(start) + tOffset;
        vm.warp(t);

        uint256 expected = referenceVested(amount, start, cliff, end, t);
        assertEq(manager.vestedAmount(positionId), expected, "vestedAmount diverged from independent model");
        assertLe(manager.vestedAmount(positionId), amount, "vested must never exceed deposit");
    }

    function testFuzz_claimNeverExceedsVested(uint256 amount, uint64 duration, uint64 warpTo) public {
        amount = bound(amount, 1, 1_000_000 ether);
        duration = uint64(bound(duration, 1 hours, 365 days));
        // An explicit start must be strictly in the future (brief.md 8.4) — block.timestamp
        // alone would be rejected as already-expired.
        uint64 start = uint64(block.timestamp) + 1;
        uint64 end = start + duration;

        vm.startPrank(creator);
        token.approve(address(manager), amount);
        uint256 positionId = manager.createVesting(address(token), beneficiary, amount, start, 0, end);
        vm.stopPrank();

        warpTo = uint64(bound(warpTo, 0, duration + 1 days));
        vm.warp(start + warpTo);

        uint256 claimable = manager.claimable(positionId);
        if (claimable == 0) return;

        vm.prank(beneficiary);
        uint256 claimed = manager.claim(positionId);

        assertEq(claimed, claimable, "claim() must pay exactly the previewed claimable amount");
        assertLe(token.balanceOf(beneficiary), amount, "beneficiary can never receive more than the deposit");
    }
}
