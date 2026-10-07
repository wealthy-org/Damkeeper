// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamkeeperAirdrop} from "../src/DamkeeperAirdrop.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MCK") {
        _mint(msg.sender, 1_000_000 * 1e18);
    }
}

contract DamkeeperAirdropTest is Test {
    DamkeeperAirdrop public airdrop;
    MockToken public token;

    address public creator = address(0xAA);
    address public alice = address(0x11);
    address public bob = address(0x22);

    bytes32 public root;
    bytes32[] public aliceProof;
    bytes32[] public bobProof;

    function setUp() public {
        airdrop = new DamkeeperAirdrop();
        token = new MockToken();

        token.transfer(creator, 100_000 * 1e18);

        // Build 2-leaf Merkle Tree:
        // Leaf Alice: (alice, 1000 * 1e18)
        // Leaf Bob: (bob, 500 * 1e18)
        bytes32 leafAlice = keccak256(bytes.concat(keccak256(abi.encode(alice, 1000 * 1e18))));
        bytes32 leafBob = keccak256(bytes.concat(keccak256(abi.encode(bob, 500 * 1e18))));

        // In OpenZeppelin Hashes / MerkleTree: commutative parent hash
        if (leafAlice < leafBob) {
            root = keccak256(abi.encodePacked(leafAlice, leafBob));
        } else {
            root = keccak256(abi.encodePacked(leafBob, leafAlice));
        }

        aliceProof = new bytes32[](1);
        aliceProof[0] = leafBob;

        bobProof = new bytes32[](1);
        bobProof[0] = leafAlice;
    }

    function test_CreateCampaignAndClaim() public {
        vm.startPrank(creator);
        token.approve(address(airdrop), 1500 * 1e18);
        uint256 campaignId = airdrop.createCampaign(
            IERC20(address(token)),
            1500 * 1e18,
            2,
            root,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            0,
            "Test Airdrop"
        );
        vm.stopPrank();

        assertEq(campaignId, 1);
        assertEq(token.balanceOf(address(airdrop)), 1500 * 1e18);

        // Alice claims
        vm.prank(alice);
        airdrop.claim(campaignId, 1000 * 1e18, aliceProof);

        assertEq(token.balanceOf(alice), 1000 * 1e18);
        assertTrue(airdrop.hasClaimed(campaignId, alice));

        // Alice cannot claim again
        vm.prank(alice);
        vm.expectRevert(DamkeeperAirdrop.AlreadyClaimed.selector);
        airdrop.claim(campaignId, 1000 * 1e18, aliceProof);

        // Bob claims
        vm.prank(bob);
        airdrop.claim(campaignId, 500 * 1e18, bobProof);

        assertEq(token.balanceOf(bob), 500 * 1e18);
        assertEq(token.balanceOf(address(airdrop)), 0);
    }

    function test_SweepUnclaimedAfterExpiry() public {
        vm.startPrank(creator);
        token.approve(address(airdrop), 1500 * 1e18);
        uint256 campaignId = airdrop.createCampaign(
            IERC20(address(token)),
            1500 * 1e18,
            2,
            root,
            uint64(block.timestamp),
            uint64(block.timestamp + 7 days),
            0,
            "Expiry Airdrop"
        );
        vm.stopPrank();

        // Alice claims 1000
        vm.prank(alice);
        airdrop.claim(campaignId, 1000 * 1e18, aliceProof);

        // Warp past end time
        vm.warp(block.timestamp + 8 days);

        // Creator sweeps leftover 500 tokens
        uint256 balanceBefore = token.balanceOf(creator);
        vm.prank(creator);
        airdrop.sweepUnclaimed(campaignId);

        assertEq(token.balanceOf(creator), balanceBefore + 500 * 1e18);
    }
}
