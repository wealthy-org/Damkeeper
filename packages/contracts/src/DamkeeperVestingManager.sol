// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Baseline implementation of the vesting manager described in brief.md section 8.4-8.5.
/// @dev Fixed beneficiary, fixed deposit, linear-by-second vesting with an optional cliff.
/// Not a fork of OpenZeppelin VestingWallet — semantics differ (see brief 8.2). Not audited.
contract DamkeeperVestingManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct VestingPosition {
        address token;
        address creator;
        address beneficiary;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint64 createdAt;
        uint64 startTime;
        uint64 cliffTime;
        uint64 endTime;
    }

    address public admin;
    address public pendingAdmin;
    bool public creationPaused = true;

    mapping(uint256 => VestingPosition) private _vestings;
    uint256 private _nextId = 1;

    mapping(address => bool) public tokenEnabled;
    mapping(address => uint256) public liabilityCap;
    mapping(address => uint256) public totalLiability;

    event VestingCreated(
        uint256 indexed id,
        address indexed token,
        address indexed creator,
        address beneficiary,
        uint256 amount,
        uint64 startTime,
        uint64 cliffTime,
        uint64 endTime,
        uint64 createdAt
    );
    event VestingClaimed(uint256 indexed id, address beneficiary, uint256 amount, uint256 cumulativeClaimed);
    event CreationPauseChanged(bool paused, address actor);
    event TokenPolicyChanged(address indexed token, bool enabled, uint256 liabilityCap, address actor);
    event AdminTransferInitiated(address indexed previousAdmin, address indexed pendingAdmin);
    event AdminTransferAccepted(address indexed previousAdmin, address indexed newAdmin);

    error NotAdmin();
    error CreationIsPaused();
    error TokenNotEnabled();
    error CapExceeded();
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidSchedule();
    error DepositMismatch();
    error PositionNotFound();
    error NotBeneficiary();
    error NothingClaimable();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address initialAdmin) {
        admin = initialAdmin;
    }

    function setCreationPaused(bool paused) external onlyAdmin {
        creationPaused = paused;
        emit CreationPauseChanged(paused, msg.sender);
    }

    function setTokenPolicy(address token, bool enabled, uint256 cap) external onlyAdmin {
        tokenEnabled[token] = enabled;
        liabilityCap[token] = cap;
        emit TokenPolicyChanged(token, enabled, cap, msg.sender);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }

    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NotAdmin();
        emit AdminTransferAccepted(admin, msg.sender);
        admin = msg.sender;
        pendingAdmin = address(0);
    }

    function createVesting(
        address token,
        address beneficiary,
        uint256 amount,
        uint64 startTime,
        uint64 cliffTime,
        uint64 endTime
    ) external nonReentrant returns (uint256 positionId) {
        if (creationPaused) revert CreationIsPaused();
        if (!tokenEnabled[token]) revert TokenNotEnabled();
        if (beneficiary == address(0) || beneficiary == address(this)) revert InvalidBeneficiary();
        if (amount == 0) revert InvalidAmount();

        uint64 resolvedStart = startTime == 0 ? uint64(block.timestamp) : startTime;
        if (startTime != 0 && startTime <= block.timestamp) revert InvalidSchedule();
        if (endTime <= resolvedStart) revert InvalidSchedule();
        if (cliffTime != 0 && (cliffTime <= resolvedStart || cliffTime >= endTime)) revert InvalidSchedule();
        if (totalLiability[token] + amount > liabilityCap[token]) revert CapExceeded();

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
        if (received != amount) revert DepositMismatch();

        positionId = _nextId++;
        _vestings[positionId] = VestingPosition({
            token: token,
            creator: msg.sender,
            beneficiary: beneficiary,
            totalAmount: amount,
            claimedAmount: 0,
            createdAt: uint64(block.timestamp),
            startTime: resolvedStart,
            cliffTime: cliffTime,
            endTime: endTime
        });
        totalLiability[token] += amount;

        emit VestingCreated(positionId, token, msg.sender, beneficiary, amount, resolvedStart, cliffTime, endTime, uint64(block.timestamp));
    }

    function claim(uint256 positionId) external nonReentrant returns (uint256 amount) {
        VestingPosition storage position = _vestings[positionId];
        if (position.beneficiary == address(0)) revert PositionNotFound();
        if (msg.sender != position.beneficiary) revert NotBeneficiary();

        amount = _claimable(position);
        if (amount == 0) revert NothingClaimable();

        position.claimedAmount += amount;
        totalLiability[position.token] -= amount;

        emit VestingClaimed(positionId, position.beneficiary, amount, position.claimedAmount);
        IERC20(position.token).safeTransfer(position.beneficiary, amount);
    }

    // ---- Formula: brief.md section 8.5. Must match the frontend/API implementation exactly. ----

    function vestedAmount(uint256 positionId) public view returns (uint256) {
        return _vestedAmount(_vestings[positionId]);
    }

    function claimable(uint256 positionId) external view returns (uint256) {
        return _claimable(_vestings[positionId]);
    }

    function getVesting(uint256 positionId) external view returns (VestingPosition memory) {
        return _vestings[positionId];
    }

    function _vestedAmount(VestingPosition storage position) private view returns (uint256) {
        uint256 t = block.timestamp;
        if (t < position.startTime) return 0;
        if (position.cliffTime != 0 && t < position.cliffTime) return 0;
        if (t >= position.endTime) return position.totalAmount;
        return Math.mulDiv(position.totalAmount, t - position.startTime, position.endTime - position.startTime);
    }

    function _claimable(VestingPosition storage position) private view returns (uint256) {
        return _vestedAmount(position) - position.claimedAmount;
    }
}
