// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DamkeeperStakingPool} from "./DamkeeperStakingPool.sol";

/// @title DamkeeperStakingFactory
/// @notice Permissionless factory for deploying customizable community staking reward pools on Robinhood Chain Mainnet.
contract DamkeeperStakingFactory {
    address public admin;
    uint256 public creationFee;
    address payable public feeRecipient;

    address[] public allPools;
    mapping(address => address[]) public poolsByCreator;
    mapping(address => bool) public isPool;

    event PoolCreated(
        address indexed pool,
        address indexed stakingToken,
        address indexed rewardToken,
        address creator,
        uint256 lockDuration,
        string name
    );

    event CreationFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address indexed newRecipient);

    error InsufficientFee();
    error TransferFailed();
    error OnlyAdmin();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor(address _admin, uint256 _creationFee, address payable _feeRecipient) {
        admin = _admin == address(0) ? msg.sender : _admin;
        creationFee = _creationFee;
        feeRecipient = _feeRecipient == address(0) ? payable(msg.sender) : _feeRecipient;
    }

    function createPool(
        address stakingToken,
        address rewardToken,
        uint256 lockDuration,
        string calldata name
    ) external payable returns (address poolAddress) {
        if (creationFee > 0) {
            if (msg.value < creationFee) revert InsufficientFee();
            (bool success, ) = feeRecipient.call{value: msg.value}("");
            if (!success) revert TransferFailed();
        }

        DamkeeperStakingPool pool = new DamkeeperStakingPool(
            stakingToken,
            rewardToken,
            msg.sender,
            lockDuration,
            name
        );

        poolAddress = address(pool);
        allPools.push(poolAddress);
        poolsByCreator[msg.sender].push(poolAddress);
        isPool[poolAddress] = true;

        emit PoolCreated(poolAddress, stakingToken, rewardToken, msg.sender, lockDuration, name);
    }

    function poolCount() external view returns (uint256) {
        return allPools.length;
    }

    function getPoolsByCreator(address creator) external view returns (address[] memory) {
        return poolsByCreator[creator];
    }

    function setCreationFee(uint256 newFee) external onlyAdmin {
        creationFee = newFee;
        emit CreationFeeUpdated(newFee);
    }

    function setFeeRecipient(address payable newRecipient) external onlyAdmin {
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }
}
