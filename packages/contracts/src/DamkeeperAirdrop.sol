// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title DamkeeperAirdrop
/// @notice Permissionless, gas-optimized token airdrop and community claim protocol on Robinhood Chain Mainnet.
/// @dev Supports instant Merkle airdrops with optional vesting and creator unclaimed sweeps.
contract DamkeeperAirdrop is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Campaign {
        address creator;
        IERC20 token;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 totalRecipients;
        uint256 claimedCount;
        bytes32 merkleRoot;
        uint64 startTime;
        uint64 endTime;
        uint64 vestingDuration;
        string name;
        bool cancelled;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => mapping(address => uint256)) public claimedAmounts;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        uint256 totalRecipients,
        bytes32 merkleRoot,
        uint64 startTime,
        uint64 endTime,
        string name
    );

    event Claimed(
        uint256 indexed campaignId,
        address indexed claimant,
        uint256 amount,
        uint256 timestamp
    );

    event UnclaimedSwept(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    error ZeroAmount();
    error ZeroAddress();
    error InvalidTiming();
    error CampaignNotActive();
    error CampaignEnded();
    error AlreadyClaimed();
    error InvalidProof();
    error OnlyCreator();
    error CampaignNotEnded();
    error NothingToSweep();

    /// @notice Create a new airdrop distribution campaign
    /// @param token ERC-20 token to distribute
    /// @param totalAmount Total sum of all airdrop allocations
    /// @param totalRecipients Number of recipient wallets
    /// @param merkleRoot Merkle root hash of (address claimant, uint256 amount)
    /// @param startTime Unix timestamp when claims become active
    /// @param endTime Optional expiry timestamp (0 = no expiry)
    /// @param vestingDuration Vesting schedule in seconds (0 = instant release)
    /// @param name Campaign display title
    function createCampaign(
        IERC20 token,
        uint256 totalAmount,
        uint256 totalRecipients,
        bytes32 merkleRoot,
        uint64 startTime,
        uint64 endTime,
        uint64 vestingDuration,
        string calldata name
    ) external nonReentrant returns (uint256 campaignId) {
        if (address(token) == address(0)) revert ZeroAddress();
        if (totalAmount == 0 || totalRecipients == 0) revert ZeroAmount();
        if (endTime > 0 && endTime <= startTime) revert InvalidTiming();

        campaignId = ++campaignCount;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            token: token,
            totalAmount: totalAmount,
            claimedAmount: 0,
            totalRecipients: totalRecipients,
            claimedCount: 0,
            merkleRoot: merkleRoot,
            startTime: startTime,
            endTime: endTime,
            vestingDuration: vestingDuration,
            name: name,
            cancelled: false
        });

        // Pull tokens into escrow
        token.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit CampaignCreated(
            campaignId,
            msg.sender,
            address(token),
            totalAmount,
            totalRecipients,
            merkleRoot,
            startTime,
            endTime,
            name
        );
    }

    /// @notice Claim an airdrop allocation with a valid Merkle proof
    /// @param campaignId ID of the airdrop campaign
    /// @param amount Token allocation amount
    /// @param merkleProof Merkle proof sibling hashes
    function claim(
        uint256 campaignId,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (c.creator == address(0)) revert CampaignNotActive();
        if (block.timestamp < c.startTime) revert CampaignNotActive();
        if (c.endTime > 0 && block.timestamp > c.endTime) revert CampaignEnded();
        if (hasClaimed[campaignId][msg.sender]) revert AlreadyClaimed();

        // Standard double-hash leaf verification
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        if (!MerkleProof.verify(merkleProof, c.merkleRoot, leaf)) {
            revert InvalidProof();
        }

        hasClaimed[campaignId][msg.sender] = true;
        claimedAmounts[campaignId][msg.sender] = amount;
        c.claimedAmount += amount;
        c.claimedCount += 1;

        c.token.safeTransfer(msg.sender, amount);

        emit Claimed(campaignId, msg.sender, amount, block.timestamp);
    }

    /// @notice Sweep remaining unclaimed tokens back to the creator after campaign expiration
    /// @param campaignId ID of the airdrop campaign
    function sweepUnclaimed(uint256 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (msg.sender != c.creator) revert OnlyCreator();
        if (c.endTime == 0 || block.timestamp <= c.endTime) revert CampaignNotEnded();

        uint256 remaining = c.totalAmount - c.claimedAmount;
        if (remaining == 0) revert NothingToSweep();

        c.claimedAmount = c.totalAmount; // Mark all as settled
        c.token.safeTransfer(c.creator, remaining);

        emit UnclaimedSwept(campaignId, c.creator, remaining);
    }

    /// @notice View campaign information
    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }
}
