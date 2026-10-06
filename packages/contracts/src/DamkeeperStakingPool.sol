// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DamkeeperStakingPool
/// @notice Synthetix-style O(1) mathematical reward distribution staking pool on Robinhood Chain Mainnet.
/// @dev Supports both flexible unstake (lockDuration = 0) and timelocked unstake (lockDuration > 0).
contract DamkeeperStakingPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;
    address public immutable creator;
    uint256 public immutable lockDuration; // in seconds. 0 = flexible (unstake anytime)
    string public poolName;

    uint256 public rewardRate;
    uint256 public periodFinish;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    uint256 public totalStaked;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public stakeTimestamp;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward, uint256 duration);
    event EmergencyWithdrawn(address indexed user, uint256 amount);

    error ZeroAmount();
    error ZeroAddress();
    error LockNotElapsed(uint256 unlockTime);
    error InsufficientBalance();
    error OnlyCreator();
    error ZeroDuration();
    error RewardRateZero();

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(
        address _stakingToken,
        address _rewardToken,
        address _creator,
        uint256 _lockDuration,
        string memory _poolName
    ) {
        if (_stakingToken == address(0) || _rewardToken == address(0) || _creator == address(0)) {
            revert ZeroAddress();
        }
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        creator = _creator;
        lockDuration = _lockDuration;
        poolName = _poolName;
    }

    /// @notice Returns the timestamp up to which rewards are applicable (current time or periodFinish)
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /// @notice Calculates the accumulated reward per unit of staked token (scaled by 1e18)
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        uint256 timeElapsed = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + ((timeElapsed * rewardRate * 1e18) / totalStaked);
    }

    /// @notice Calculates the total earned unclaimed reward for an account
    function earned(address account) public view returns (uint256) {
        return ((balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) + rewards[account];
    }

    /// @notice Stake tokens into the pool to earn continuous rewards
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();

        uint256 balBefore = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = stakingToken.balanceOf(address(this)) - balBefore;

        totalStaked += received;
        balanceOf[msg.sender] += received;
        stakeTimestamp[msg.sender] = block.timestamp;

        emit Staked(msg.sender, received);
    }

    /// @notice Withdraw staked tokens from the pool
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();

        if (lockDuration > 0) {
            uint256 unlockTime = stakeTimestamp[msg.sender] + lockDuration;
            if (block.timestamp < unlockTime) {
                revert LockNotElapsed(unlockTime);
            }
        }

        totalStaked -= amount;
        balanceOf[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Claim all earned rewards without withdrawing principal
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Withdraw all staked tokens and harvest all earned rewards in one transaction
    function exit() external {
        withdraw(balanceOf[msg.sender]);
        getReward();
    }

    /// @notice Emergency withdrawal of principal tokens without calculating rewards (safety valve)
    function emergencyWithdraw() external nonReentrant {
        uint256 amount = balanceOf[msg.sender];
        if (amount == 0) revert InsufficientBalance();

        totalStaked -= amount;
        balanceOf[msg.sender] = 0;
        rewards[msg.sender] = 0;
        userRewardPerTokenPaid[msg.sender] = 0;

        stakingToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdrawn(msg.sender, amount);
    }

    /// @notice Fund or extend the reward pool with new tokens
    /// @dev Only creator or anyone can notify if transferred directly
    function notifyRewardAmount(uint256 reward, uint256 duration) external nonReentrant updateReward(address(0)) {
        if (msg.sender != creator) revert OnlyCreator();
        if (duration == 0) revert ZeroDuration();
        if (reward == 0) revert ZeroAmount();

        rewardToken.safeTransferFrom(msg.sender, address(this), reward);

        if (block.timestamp >= periodFinish) {
            rewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / duration;
        }

        if (rewardRate == 0) revert RewardRateZero();

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;

        emit RewardAdded(reward, duration);
    }
}
