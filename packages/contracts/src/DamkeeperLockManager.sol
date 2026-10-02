// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Baseline implementation of the lock manager described in brief.md section 8.
/// @dev Two-step admin transfer, no proxy/upgrade path, pull-payment only. Not audited.
contract DamkeeperLockManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LockPosition {
        address token;
        address creator;
        address beneficiary;
        uint256 amount;
        uint64 createdAt;
        uint64 unlockTime;
        bool withdrawn;
    }

    address public admin;
    address public pendingAdmin;
    bool public creationPaused = true;

    mapping(uint256 => LockPosition) private _locks;
    uint256 private _nextId = 1;

    mapping(address => bool) public tokenEnabled;
    mapping(address => uint256) public liabilityCap;
    mapping(address => uint256) public totalLiability;

    uint256 public lockFee = 0.0007 ether;
    address payable public feeRecipient;

    event LockCreated(
        uint256 indexed id,
        address indexed token,
        address indexed creator,
        address beneficiary,
        uint256 amount,
        uint64 createdAt,
        uint64 unlockTime
    );
    event LockWithdrawn(uint256 indexed id, address beneficiary, uint256 amount);
    event CreationPauseChanged(bool paused, address actor);
    event TokenPolicyChanged(address indexed token, bool enabled, uint256 liabilityCap, address actor);
    event LockFeeChanged(uint256 newFee, address actor);
    event FeeRecipientChanged(address indexed newRecipient, address actor);
    event AdminTransferInitiated(address indexed previousAdmin, address indexed pendingAdmin);
    event AdminTransferAccepted(address indexed previousAdmin, address indexed newAdmin);

    error NotAdmin();
    error CreationIsPaused();
    error TokenNotEnabled();
    error CapExceeded();
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidUnlockTime();
    error DepositMismatch();
    error PositionNotFound();
    error NotBeneficiary();
    error NotYetUnlocked();
    error AlreadyWithdrawn();
    error InsufficientFee();
    error FeeTransferFailed();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address initialAdmin) {
        admin = initialAdmin;
        feeRecipient = payable(initialAdmin);
    }

    // ---- Admin: creation policy & fee management. No sweep, no privileged claim, no schedule edits. ----

    function setCreationPaused(bool paused) external onlyAdmin {
        creationPaused = paused;
        emit CreationPauseChanged(paused, msg.sender);
    }

    function setTokenPolicy(address token, bool enabled, uint256 cap) external onlyAdmin {
        tokenEnabled[token] = enabled;
        liabilityCap[token] = cap;
        emit TokenPolicyChanged(token, enabled, cap, msg.sender);
    }

    function setLockFee(uint256 newFee) external onlyAdmin {
        lockFee = newFee;
        emit LockFeeChanged(newFee, msg.sender);
    }

    function setFeeRecipient(address payable newRecipient) external onlyAdmin {
        if (newRecipient == address(0)) revert InvalidBeneficiary();
        feeRecipient = newRecipient;
        emit FeeRecipientChanged(newRecipient, msg.sender);
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

    // ---- Create ----

    function createLock(
        address token,
        address beneficiary,
        uint256 amount,
        uint64 unlockTime
    ) external payable nonReentrant returns (uint256 positionId) {
        if (creationPaused) revert CreationIsPaused();
        if (!tokenEnabled[token]) revert TokenNotEnabled();
        if (msg.value < lockFee) revert InsufficientFee();
        if (beneficiary == address(0) || beneficiary == address(this)) revert InvalidBeneficiary();
        if (amount == 0) revert InvalidAmount();
        if (unlockTime <= block.timestamp) revert InvalidUnlockTime();
        if (totalLiability[token] + amount > liabilityCap[token]) revert CapExceeded();

        positionId = _nextId++;
        _locks[positionId] = LockPosition({
            token: token,
            creator: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            createdAt: uint64(block.timestamp),
            unlockTime: unlockTime,
            withdrawn: false
        });
        totalLiability[token] += amount;

        emit LockCreated(positionId, token, msg.sender, beneficiary, amount, uint64(block.timestamp), unlockTime);

        if (msg.value > 0) {
            address payable recipient = feeRecipient != address(0) ? feeRecipient : payable(admin);
            (bool sent, ) = recipient.call{value: msg.value}("");
            if (!sent) revert FeeTransferFailed();
        }

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
        if (received != amount) revert DepositMismatch();
    }

    // ---- Withdraw: pull model, full amount, once. Never blocked by creationPaused. ----

    function withdraw(uint256 positionId) external nonReentrant {
        LockPosition storage position = _locks[positionId];
        if (position.beneficiary == address(0)) revert PositionNotFound();
        if (msg.sender != position.beneficiary) revert NotBeneficiary();
        if (block.timestamp < position.unlockTime) revert NotYetUnlocked();
        if (position.withdrawn) revert AlreadyWithdrawn();

        position.withdrawn = true;
        totalLiability[position.token] -= position.amount;

        emit LockWithdrawn(positionId, position.beneficiary, position.amount);
        IERC20(position.token).safeTransfer(position.beneficiary, position.amount);
    }

    // ---- Views ----

    function getLock(uint256 positionId) external view returns (LockPosition memory) {
        return _locks[positionId];
    }

    function withdrawable(uint256 positionId) external view returns (uint256) {
        LockPosition storage position = _locks[positionId];
        if (position.withdrawn || block.timestamp < position.unlockTime) return 0;
        return position.amount;
    }
}
