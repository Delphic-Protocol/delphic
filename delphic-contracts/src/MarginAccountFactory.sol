// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {MarginAccount} from "./MarginAccount.sol";

contract MarginAccountFactory is AccessControlDefaultAdminRules {
    error AccountAlreadyExists(address user);

    address public immutable i_implementation;

    address private immutable i_aavePool;
    address private immutable i_usdc;
    address private immutable i_ccipRouter;
    uint64 private immutable i_destinationChainSelector;
    address private s_receiver;

    mapping(address => address) private s_marginAccounts;
    mapping(address => bool) private s_whitelistedTokens;

    event MarginAccountCreated(address indexed user, address indexed account);
    event TokenWhitelisted(address indexed token);
    event TokenRemovedFromWhitelist(address indexed token);
    event ReceiverUpdated(
        address indexed oldReceiver,
        address indexed newReceiver
    );

    constructor(
        uint48 initialDelay,
        address admin,
        address aavePool,
        address usdc,
        address ccipRouter,
        address receiver,
        uint64 destinationChainSelector
    ) AccessControlDefaultAdminRules(initialDelay, admin) {
        i_aavePool = aavePool;
        i_usdc = usdc;
        i_ccipRouter = ccipRouter;
        s_receiver = receiver;
        i_destinationChainSelector = destinationChainSelector;
        i_implementation = address(new MarginAccount());
    }

    function whitelistToken(
        address token
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        s_whitelistedTokens[token] = true;
        emit TokenWhitelisted(token);
    }

    function removeTokenFromWhitelist(
        address token
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        s_whitelistedTokens[token] = false;
        emit TokenRemovedFromWhitelist(token);
    }

    function setReceiver(
        address newReceiver
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        s_receiver = newReceiver;
        emit ReceiverUpdated(s_receiver, newReceiver);
    }

    function initializeMarginAccount(address user) external returns (address) {
        if (s_marginAccounts[user] != address(0))
            revert AccountAlreadyExists(user);

        address marginAccount = Clones.clone(i_implementation);
        MarginAccount(marginAccount).initialize(
            user,
            address(this),
            i_aavePool,
            i_ccipRouter,
            i_usdc,
            s_receiver,
            i_destinationChainSelector
        );

        s_marginAccounts[user] = marginAccount;

        emit MarginAccountCreated(user, marginAccount);

        return marginAccount;
    }

    function getMarginAccount(address user) external view returns (address) {
        return s_marginAccounts[user];
    }

    function getAavePool() external view returns (address) {
        return i_aavePool;
    }

    function getUsdc() external view returns (address) {
        return i_usdc;
    }

    function getCcipRouter() external view returns (address) {
        return i_ccipRouter;
    }

    function getReceiver() external view returns (address) {
        return s_receiver;
    }

    function getDestinationChainSelector() external view returns (uint64) {
        return i_destinationChainSelector;
    }

    function isWhitelisted(address token) external view returns (bool) {
        return s_whitelistedTokens[token];
    }
}
