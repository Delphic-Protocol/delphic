// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MarginAccountFactory} from "../src/MarginAccountFactory.sol";
import {MarginAccount} from "../src/MarginAccount.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
abstract contract BaseTest is Test {
    address constant WSTETH  = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
    address constant AWSTETH = 0x0B925eD163218f6662a35e0f0371Ac234f9E9371;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant AAVE_V3_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address constant CCIP_ROUTER = 0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D;
    uint64 constant POLYGON_CHAIN_SELECTOR = 4051577828743386545;

    MarginAccountFactory factory;
    address admin = makeAddr("admin");
    address user = makeAddr("user");
    address receiver = makeAddr("receiver");

    IERC20 s_wstETH = IERC20(WSTETH);
    IERC20 s_usdc = IERC20(USDC);

    function setUp() public virtual {
        vm.createSelectFork(vm.envString("MAINNET_RPC_URL"));
        factory = new MarginAccountFactory(0, admin, AAVE_V3_POOL, USDC, CCIP_ROUTER, receiver, POLYGON_CHAIN_SELECTOR);
        deal(address(WSTETH), user, 1 ether);
        deal(user, 1 ether);
    }

    modifier withWhitelistedToken(address token) {
        vm.prank(admin);
        factory.whitelistToken(token);
        _;
    }

    modifier withMarginAccount(address _user) {
        factory.initializeMarginAccount(_user);
        _;
    }

    modifier withDeposit(address _user, address token, uint256 amount) {
        address account = factory.getMarginAccount(_user);
        vm.startPrank(_user);
        IERC20(token).approve(account, amount);
        MarginAccount(payable(account)).deposit(token, amount);
        vm.stopPrank();
        _;
    }
}
