// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamkeeperStakingPool} from "../src/DamkeeperStakingPool.sol";
import {DamkeeperStakingFactory} from "../src/DamkeeperStakingFactory.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory sym) ERC20(name, sym) {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}

contract DamkeeperStakingTest is Test {
    MockToken damToken;
    MockToken rewardToken;
    DamkeeperStakingPool pool;
    DamkeeperStakingPool lockedPool;
    DamkeeperStakingFactory factory;

    address creator = address(0xCAFE);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant REWARD_TOTAL = 60_000 ether;
    uint256 constant REWARD_DURATION = 30 days; // ~2.000 ether per day
    uint256 constant LOCK_DURATION = 14 days;

    function setUp() public {
        damToken = new MockToken("Damkeeper", "DAM");
        rewardToken = new MockToken("Reward", "RWD");

        // Deploy flexible pool (lockDuration = 0)
        pool = new DamkeeperStakingPool(
            address(damToken),
            address(damToken),
            creator,
            0,
            "Damkeeper Official Pool"
        );

        // Deploy locked pool (lockDuration = 14 days)
        lockedPool = new DamkeeperStakingPool(
            address(damToken),
            address(rewardToken),
            creator,
            LOCK_DURATION,
            "Community Locked Pool"
        );

        // Deploy factory
        factory = new DamkeeperStakingFactory(creator, 0.001 ether, payable(creator));

        // Fund creator & notify rewards
        damToken.transfer(creator, 500_000 ether);
        rewardToken.transfer(creator, 500_000 ether);

        vm.startPrank(creator);
        damToken.approve(address(pool), REWARD_TOTAL);
        pool.notifyRewardAmount(REWARD_TOTAL, REWARD_DURATION);

        rewardToken.approve(address(lockedPool), REWARD_TOTAL);
        lockedPool.notifyRewardAmount(REWARD_TOTAL, REWARD_DURATION);
        vm.stopPrank();

        // Distribute tokens to stakers
        damToken.transfer(alice, 10_000 ether);
        damToken.transfer(bob, 10_000 ether);
    }

    function test_stakeAndEarnRewards() public {
        vm.startPrank(alice);
        damToken.approve(address(pool), 1_000 ether);
        pool.stake(1_000 ether);
        vm.stopPrank();

        assertEq(pool.balanceOf(alice), 1_000 ether);
        assertEq(pool.totalStaked(), 1_000 ether);

        // Advance 1 day (86,400 seconds)
        vm.warp(block.timestamp + 1 days);

        // Since Alice is 100% of the pool, she should earn ~2,000 DAM for 1 day
        uint256 earnedAlice = pool.earned(alice);
        assertApproxEqAbs(earnedAlice, 2_000 ether, 1 ether);

        // Alice claims rewards
        uint256 balBefore = damToken.balanceOf(alice);
        vm.prank(alice);
        pool.getReward();
        uint256 balAfter = damToken.balanceOf(alice);

        assertApproxEqAbs(balAfter - balBefore, 2_000 ether, 1 ether);
        assertEq(pool.earned(alice), 0);
    }

    function test_multipleStakersShareRewards() public {
        // Alice stakes 1,000 at t=0
        vm.startPrank(alice);
        damToken.approve(address(pool), 1_000 ether);
        pool.stake(1_000 ether);
        vm.stopPrank();

        // 1 day passes: Alice earns 2,000 DAM
        vm.warp(block.timestamp + 1 days);

        // Bob stakes 1,000 at t=1 day (Now pool has 2,000 DAM total: 50% Alice, 50% Bob)
        vm.startPrank(bob);
        damToken.approve(address(pool), 1_000 ether);
        pool.stake(1_000 ether);
        vm.stopPrank();

        // Another 1 day passes (t=2 days)
        vm.warp(block.timestamp + 1 days);

        // Alice: 2,000 (day 1) + 1,000 (day 2) = ~3,000 DAM
        // Bob: 1,000 (day 2) = ~1,000 DAM
        assertApproxEqAbs(pool.earned(alice), 3_000 ether, 2 ether);
        assertApproxEqAbs(pool.earned(bob), 1_000 ether, 2 ether);
    }

    function test_flexibleUnstakeAnytime() public {
        vm.startPrank(alice);
        damToken.approve(address(pool), 1_000 ether);
        pool.stake(1_000 ether);

        // Unstake immediately without waiting
        pool.withdraw(500 ether);
        assertEq(pool.balanceOf(alice), 500 ether);
        assertEq(pool.totalStaked(), 500 ether);

        pool.withdraw(500 ether);
        assertEq(pool.balanceOf(alice), 0);
        vm.stopPrank();
    }

    function test_timelockedUnstakeBeforeDurationReverts() public {
        vm.startPrank(alice);
        damToken.approve(address(lockedPool), 1_000 ether);
        lockedPool.stake(1_000 ether);

        // Try to withdraw at 5 days (< 14 days lock)
        vm.warp(block.timestamp + 5 days);
        vm.expectRevert();
        lockedPool.withdraw(1_000 ether);
        vm.stopPrank();
    }

    function test_timelockedUnstakeAfterDurationSucceeds() public {
        vm.startPrank(alice);
        damToken.approve(address(lockedPool), 1_000 ether);
        lockedPool.stake(1_000 ether);

        // Advance 14 days and 1 second
        vm.warp(block.timestamp + LOCK_DURATION + 1);
        lockedPool.withdraw(1_000 ether);
        assertEq(lockedPool.balanceOf(alice), 0);
        vm.stopPrank();
    }

    function test_exitWithdrawsAndClaims() public {
        vm.startPrank(alice);
        damToken.approve(address(pool), 1_000 ether);
        pool.stake(1_000 ether);

        vm.warp(block.timestamp + 10 days);
        uint256 expectedReward = pool.earned(alice);
        uint256 balBefore = damToken.balanceOf(alice);

        pool.exit();

        uint256 balAfter = damToken.balanceOf(alice);
        assertEq(pool.balanceOf(alice), 0);
        assertApproxEqAbs(balAfter - balBefore, 1_000 ether + expectedReward, 1 ether);
        vm.stopPrank();
    }

    function test_emergencyWithdraw() public {
        vm.startPrank(alice);
        damToken.approve(address(pool), 1_000 ether);
        pool.stake(1_000 ether);

        vm.warp(block.timestamp + 5 days);
        uint256 balBefore = damToken.balanceOf(alice);

        // Emergency withdraw forfeits reward and safely pulls principal
        pool.emergencyWithdraw();
        uint256 balAfter = damToken.balanceOf(alice);

        assertEq(balAfter - balBefore, 1_000 ether);
        assertEq(pool.balanceOf(alice), 0);
        assertEq(pool.earned(alice), 0);
        vm.stopPrank();
    }

    function test_factoryDeploysPool() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        address newPoolAddr = factory.createPool{value: 0.001 ether}(
            address(damToken),
            address(rewardToken),
            7 days,
            "Alice Community Pool"
        );

        assertTrue(factory.isPool(newPoolAddr));
        assertEq(factory.poolCount(), 1);

        DamkeeperStakingPool newPool = DamkeeperStakingPool(newPoolAddr);
        assertEq(newPool.creator(), alice);
        assertEq(newPool.lockDuration(), 7 days);
        assertEq(newPool.poolName(), "Alice Community Pool");
    }
}
