// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {DamkeeperLockManager} from "../src/DamkeeperLockManager.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Example", "EXMPL") {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}

/// Handler that drives random create/withdraw/policy-update/direct-transfer sequences
/// against the manager, per brief.md section 14.2. Ghost-tracks what a correct
/// implementation's totalLiability *should* be, independent of the contract's own
/// bookkeeping, so the invariant check isn't just re-reading the contract's own state.
contract LockManagerHandler is Test {
    DamkeeperLockManager public manager;
    MockToken public token;
    address public admin;

    uint256[] public openPositionIds;
    uint256 public ghostLiability;

    address[] internal actors;

    constructor(DamkeeperLockManager _manager, MockToken _token, address _admin) {
        manager = _manager;
        token = _token;
        admin = _admin;
        actors.push(address(0x1001));
        actors.push(address(0x1002));
        actors.push(address(0x1003));
        for (uint256 i = 0; i < actors.length; i++) {
            vm.prank(actors[i]);
            token.approve(address(manager), type(uint256).max);
        }
    }

    /// Called once from setUp() after the test contract has funded this handler —
    /// can't fund actors from the constructor since the handler holds no tokens yet
    /// at that point.
    function fundActors() external {
        for (uint256 i = 0; i < actors.length; i++) {
            token.transfer(actors[i], 1_000_000 ether);
        }
    }

    function createLock(uint256 actorSeed, uint256 amount, uint64 delay) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 1, 1_000_000 ether);
        delay = uint64(bound(delay, 1, 365 days));

        if (token.balanceOf(actor) < amount) return;
        if (ghostLiability + amount > manager.liabilityCap(address(token))) return;

        vm.prank(actor);
        try manager.createLock(address(token), actor, amount, uint64(block.timestamp) + delay) returns (
            uint256 positionId
        ) {
            openPositionIds.push(positionId);
            ghostLiability += amount;
        } catch {
            // creation paused, or some other legitimate rejection — not a failure of the invariant
        }
    }

    function withdraw(uint256 idx) external {
        if (openPositionIds.length == 0) return;
        idx = idx % openPositionIds.length;
        uint256 positionId = openPositionIds[idx];

        DamkeeperLockManager.LockPosition memory pos = manager.getLock(positionId);
        if (pos.withdrawn || block.timestamp < pos.unlockTime) return;

        vm.prank(pos.beneficiary);
        try manager.withdraw(positionId) {
            ghostLiability -= pos.amount;
            openPositionIds[idx] = openPositionIds[openPositionIds.length - 1];
            openPositionIds.pop();
        } catch {
            // already withdrawn by a previous fuzz call in this run — fine
        }
    }

    function warp(uint256 secondsForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 0, 30 days));
    }

    function adminSetCap(uint256 newCap) external {
        vm.prank(admin);
        manager.setTokenPolicy(address(token), true, bound(newCap, 0, type(uint128).max));
    }

    function adminTogglePause(bool paused) external {
        vm.prank(admin);
        manager.setCreationPaused(paused);
    }

    /// A donation must never be able to inflate any position's recorded amount or
    /// totalLiability — brief.md section 9.1.
    function directTransfer(uint256 amount) external {
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) return;
        amount = bound(amount, 0, balance);
        token.transfer(address(manager), amount);
    }

    function openPositionCount() external view returns (uint256) {
        return openPositionIds.length;
    }
}

contract DamkeeperLockManagerInvariantTest is StdInvariant, Test {
    DamkeeperLockManager manager;
    MockToken token;
    LockManagerHandler handler;
    address admin = address(0xA11CE);

    function setUp() public {
        manager = new DamkeeperLockManager(admin);
        token = new MockToken();

        vm.startPrank(admin);
        manager.setTokenPolicy(address(token), true, 50_000_000 ether);
        manager.setCreationPaused(false);
        vm.stopPrank();

        handler = new LockManagerHandler(manager, token, admin);
        token.transfer(address(handler), 10_000_000 ether);
        handler.fundActors();

        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = LockManagerHandler.createLock.selector;
        selectors[1] = LockManagerHandler.withdraw.selector;
        selectors[2] = LockManagerHandler.warp.selector;
        selectors[3] = LockManagerHandler.adminSetCap.selector;
        selectors[4] = LockManagerHandler.adminTogglePause.selector;
        selectors[5] = LockManagerHandler.directTransfer.selector;
        targetSelector(StdInvariant.FuzzSelector({addr: address(handler), selectors: selectors}));
        targetContract(address(handler));
    }

    /// brief.md 9.1: balanceOf(manager, token) >= totalLiability[token]
    function invariant_managerBalanceCoversLiability() public view {
        assertGe(token.balanceOf(address(manager)), manager.totalLiability(address(token)));
    }

    /// The handler's independently-tracked liability must match the contract's own
    /// bookkeeping — this is the "independent model" brief.md 14.2 asks for, not just
    /// the contract checking itself.
    function invariant_ghostLiabilityMatchesContract() public view {
        assertEq(handler.ghostLiability(), manager.totalLiability(address(token)));
    }
}
