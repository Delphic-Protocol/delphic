// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MarginAccount} from "../../src/MarginAccount.sol";
import {MarginAccountFactory} from "../../src/MarginAccountFactory.sol";
import {SettlementModule} from "../../src/SettlementModule.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

contract MockWithoutReceive {
    SettlementModule public settlementModule;

    function setup(MarginAccountFactory _factory, address token, uint256 amount) external {
        _factory.initializeMarginAccount(address(this));
        address account = _factory.getMarginAccount(address(this));
        IERC20(token).approve(account, amount);
        MarginAccount(payable(account)).deposit(token, amount);
    }

    function doBorrowAndBridge(MarginAccountFactory _factory, uint256 amount, address safe) external payable {
        address account = _factory.getMarginAccount(address(this));
        MarginAccount(payable(account)).borrowAndBridge{value: msg.value}(amount, safe);
    }

    function deploySettlementModule(
        address swapRouter,
        address ccipRouter,
        address usdc,
        address usdce,
        uint64 ethChainSelector,
        address cre
    ) external {
        settlementModule = new SettlementModule(swapRouter, ccipRouter, usdc, usdce, ethChainSelector, cre);
    }

    function withdrawMatic(uint256 amount) external {
        settlementModule.withdrawMatic(amount);
    }
}
