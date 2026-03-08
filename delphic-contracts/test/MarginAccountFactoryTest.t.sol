// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {BaseTest} from "./BaseTest.t.sol";
import {MarginAccountFactory} from "../src/MarginAccountFactory.sol";
import {MarginAccount} from "../src/MarginAccount.sol";

contract MarginAccountFactoryTest is BaseTest {
    function setUp() public override {
        super.setUp();
    }

    function test_WhitelistToken() public withWhitelistedToken(address(WSTETH)) {
        assertTrue(factory.isWhitelisted(address(WSTETH)));
    }

    function test_RemoveTokenFromWhitelist() public withWhitelistedToken(address(WSTETH)) {
        vm.prank(admin);
        factory.removeTokenFromWhitelist(address(WSTETH));

        assertEq(factory.isWhitelisted(address(WSTETH)), false);
    }

    function test_InitializeMarginAccount() public {
        vm.expectEmit(true, false, false, false);
        emit MarginAccountFactory.MarginAccountCreated(user, address(0));
        address account = factory.initializeMarginAccount(user);
        MarginAccount marginAccount = MarginAccount(payable(account));

        assertEq(factory.getMarginAccount(user), account);
        assertEq(marginAccount.owner(), user);
        assertEq(address(marginAccount.factory()), address(factory));
    }

    function test_RevertWhen_MarginAccountIsInitialized() public withMarginAccount(user) {
        vm.expectRevert(abi.encodeWithSelector(MarginAccountFactory.AccountAlreadyExists.selector, user));
        factory.initializeMarginAccount(user);
    }

    function test_GetAavePool() public view {
        assertEq(factory.getAavePool(), AAVE_V3_POOL);
    }

    function test_GetCcipRouter() public view {
        assertEq(factory.getCcipRouter(), CCIP_ROUTER);
    }

    function test_SetReceiver() public {
        address newReceiver = makeAddr("newReceiver");

        vm.expectEmit(true, true, false, false);
        emit MarginAccountFactory.ReceiverUpdated(receiver, newReceiver);

        vm.prank(admin);
        factory.setReceiver(newReceiver);

        assertEq(factory.getReceiver(), newReceiver);
    }

    function test_RevertWhen_SetReceiverCallerIsNotAdmin() public {
        address newReceiver = makeAddr("newReceiver");

        vm.expectRevert();
        factory.setReceiver(newReceiver);
    }
}
