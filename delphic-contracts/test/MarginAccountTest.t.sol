// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseTest} from "./BaseTest.t.sol";
import {MarginAccount} from "../src/MarginAccount.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IPool} from "../src/interfaces/IPool.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {MarginAccountFactory} from "../src/MarginAccountFactory.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {MockWithoutReceive} from "./mocks/MockWithoutReceive.sol";

contract MarginAccountTest is BaseTest {
    uint256 DEPOSIT_AMOUNT = 1 ether;

    address safe = makeAddr("safe");

    function _ccipFee(address _safe, uint256 positionSize) internal view returns (uint256) {
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: USDC, amount: positionSize});
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(_safe),
            tokenAmounts: tokenAmounts,
            feeToken: address(0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 400_000}))
        });
        return IRouterClient(CCIP_ROUTER).getFee(POLYGON_CHAIN_SELECTOR, message);
    }

    function test_Deposit() public withWhitelistedToken(address(WSTETH)) withMarginAccount(user) {
        address account = factory.getMarginAccount(user);

        vm.startPrank(user);
        s_wstETH.approve(account, DEPOSIT_AMOUNT);
        MarginAccount(payable(account)).deposit(address(WSTETH), DEPOSIT_AMOUNT);
        vm.stopPrank();

        (uint256 totalCollateralBase,,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertEq(s_wstETH.balanceOf(account), 0);
        assertGt(totalCollateralBase, 0);
    }

    function test_RevertWhen_DepositedTokenIsNotWhitelisted() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);

        vm.startPrank(user);
        s_wstETH.approve(account, DEPOSIT_AMOUNT);
        vm.expectRevert(abi.encodeWithSelector(MarginAccount.TokenIsNotSupported.selector, address(WSTETH)));
        MarginAccount(payable(account)).deposit(address(WSTETH), DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function test_RevertWhen_DepositorIsNotOwner()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address other = makeAddr("stranger");
        deal(address(WSTETH), other, DEPOSIT_AMOUNT);

        vm.startPrank(other);
        s_wstETH.approve(account, DEPOSIT_AMOUNT);
        vm.expectRevert(MarginAccount.NotOwner.selector);
        MarginAccount(payable(account)).deposit(address(WSTETH), DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function test_Withdraw() public withWhitelistedToken(address(WSTETH)) withMarginAccount(user) {
        address account = factory.getMarginAccount(user);

        vm.startPrank(user);
        s_wstETH.approve(account, DEPOSIT_AMOUNT);
        MarginAccount(payable(account)).deposit(address(WSTETH), DEPOSIT_AMOUNT);
        MarginAccount(payable(account)).withdraw(address(WSTETH), type(uint256).max);
        vm.stopPrank();

        assertEq(s_wstETH.balanceOf(account), 0);
        assertApproxEqRel(s_wstETH.balanceOf(user), DEPOSIT_AMOUNT, 0.0001 ether);
    }

    function test_WithdrawDirectToken()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);
        uint256 positionSize = 100e6;
        uint256 excess = 1e6;

        uint256 fee = _ccipFee(safe, positionSize);
        vm.prank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee}(positionSize, safe);

        deal(USDC, user, positionSize + excess);
        vm.startPrank(user);
        s_usdc.approve(account, positionSize + excess);
        MarginAccount(payable(account)).repayLoan(positionSize + excess);
        vm.stopPrank();

        uint256 excessInContract = s_usdc.balanceOf(account);
        assertGt(excessInContract, 0);

        uint256 ownerUsdcBefore = s_usdc.balanceOf(user);
        vm.prank(user);
        MarginAccount(payable(account)).withdraw(USDC, excessInContract);

        assertEq(s_usdc.balanceOf(account), 0);
        assertEq(s_usdc.balanceOf(user), ownerUsdcBefore + excessInContract);
    }

    function test_RevertWhen_WithdrawAmountIsZero()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).withdraw(address(WSTETH), 0);
    }

    function test_RevertWhen_WithdrawAmountExceedsBalance()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert();
        MarginAccount(payable(account)).withdraw(address(WSTETH), DEPOSIT_AMOUNT);
    }

    function test_RevertWhen_WithdrawerIsNotOwner()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);

        address other = makeAddr("stranger");
        vm.prank(other);
        vm.expectRevert(MarginAccount.NotOwner.selector);
        MarginAccount(payable(account)).withdraw(address(WSTETH), DEPOSIT_AMOUNT);
    }

    function test_RevertWhen_DepositAmountIsZero()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).deposit(address(WSTETH), 0);
    }

    function test_BorrowAndBridge()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);
        uint256 positionSize = 100e6;

        uint256 fee = _ccipFee(safe, positionSize);
        uint256 userEthBefore = user.balance;

        vm.prank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee}(positionSize, safe);

        (, uint256 totalDebtBase,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);

        assertEq(s_wstETH.balanceOf(account), 0);
        assertEq(s_usdc.balanceOf(account), 0);
        assertEq(account.balance, 0);
        assertEq(user.balance, userEthBefore - fee);
        assertGt(totalDebtBase, 0);
    }

    function test_RevertWhen_BorrowAndBridgeAmountIsZero()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).borrowAndBridge(0, safe);
    }

    function test_RevertWhen_BorrowAndBridgeCallerIsNotOwner()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(makeAddr("stranger"));
        vm.expectRevert(MarginAccount.NotOwner.selector);
        MarginAccount(payable(account)).borrowAndBridge(100e6, safe);
    }

    function test_RevertWhen_BorrowAndBridgeWithoutDeposit()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert();
        MarginAccount(payable(account)).borrowAndBridge(100e6, safe);
    }

    function test_DepositBorrowAndBridge() public withWhitelistedToken(address(WSTETH)) withMarginAccount(user) {
        address account = factory.getMarginAccount(user);
        uint256 positionSize = 100e6;

        uint256 fee = _ccipFee(safe, positionSize);
        uint256 userEthBefore = user.balance;

        vm.startPrank(user);
        s_wstETH.approve(account, DEPOSIT_AMOUNT);
        MarginAccount(payable(account)).depositBorrowAndBridge{value: fee}(
            address(WSTETH), DEPOSIT_AMOUNT, positionSize, safe
        );
        vm.stopPrank();

        (uint256 totalCollateralBase, uint256 totalDebtBase,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);

        assertEq(s_wstETH.balanceOf(account), 0);
        assertEq(s_usdc.balanceOf(account), 0);
        assertEq(account.balance, 0);
        assertEq(user.balance, userEthBefore - fee);
        assertGt(totalCollateralBase, 0);
        assertGt(totalDebtBase, 0);
    }

    function test_RevertWhen_DepositBorrowAndBridgeTokenIsNotWhitelisted() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);

        vm.startPrank(user);
        s_wstETH.approve(account, DEPOSIT_AMOUNT);
        vm.expectRevert(abi.encodeWithSelector(MarginAccount.TokenIsNotSupported.selector, address(WSTETH)));
        MarginAccount(payable(account)).depositBorrowAndBridge(address(WSTETH), DEPOSIT_AMOUNT, 100e6, safe);
        vm.stopPrank();
    }

    function test_RevertWhen_DepositBorrowAndBridgeDepositAmountIsZero()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).depositBorrowAndBridge(address(WSTETH), 0, 100e6, safe);
    }

    function test_RevertWhen_DepositBorrowAndBridgeBorrowAmountIsZero()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).depositBorrowAndBridge(address(WSTETH), DEPOSIT_AMOUNT, 0, safe);
    }

    function test_RevertWhen_DepositBorrowAndBridgeCallerIsNotOwner()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address stranger = makeAddr("stranger");
        deal(address(WSTETH), stranger, DEPOSIT_AMOUNT);

        vm.startPrank(stranger);
        s_wstETH.approve(account, DEPOSIT_AMOUNT);
        vm.expectRevert(MarginAccount.NotOwner.selector);
        MarginAccount(payable(account)).depositBorrowAndBridge(address(WSTETH), DEPOSIT_AMOUNT, 100e6, safe);
        vm.stopPrank();
    }

    function test_Repay()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);
        uint256 positionSize = 100e6;

        address proxyWallet = makeAddr("ProxyWallet");
        uint256 fee = _ccipFee(proxyWallet, positionSize);

        vm.startPrank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee}(positionSize, proxyWallet);
        vm.stopPrank();

        deal(USDC, user, positionSize);
        vm.startPrank(user);
        s_usdc.approve(account, positionSize);
        MarginAccount(payable(account)).repayLoan(positionSize);
        vm.stopPrank();

        (, uint256 totalDebt,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertEq(s_usdc.balanceOf(account), 0);
        assertEq(s_usdc.balanceOf(user), 0);
        assertApproxEqAbs(totalDebt, 0, 1e4);
    }

    function test_RevertWhen_RepayAmountIsZero() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);

        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).repayLoan(0);
    }

    function test_CcipReceive()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);
        uint256 positionSize = 100e6;
        uint256 positionId = 1;

        address proxyWallet = makeAddr("ProxyWallet");
        uint256 fee = _ccipFee(proxyWallet, positionSize);

        vm.startPrank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee}(positionSize, proxyWallet);
        vm.stopPrank();

        deal(USDC, account, positionSize);

        Client.EVMTokenAmount[] memory destTokenAmounts = new Client.EVMTokenAmount[](1);
        destTokenAmounts[0] = Client.EVMTokenAmount({token: USDC, amount: positionSize});

        Client.Any2EVMMessage memory inboundMessage = Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: POLYGON_CHAIN_SELECTOR,
            sender: abi.encode(receiver),
            data: abi.encode(positionId),
            destTokenAmounts: destTokenAmounts
        });

        vm.expectEmit(true, true, true, true);
        emit MarginAccount.PositionClosed(positionId);

        vm.prank(CCIP_ROUTER);
        MarginAccount(payable(account)).ccipReceive(inboundMessage);

        (, uint256 totalDebt,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertEq(s_usdc.balanceOf(account), 0);
        assertApproxEqAbs(totalDebt, 0, 1e4);
    }

    function test_CollateralNotWithdrawnOnPartialRepay()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);
        uint256 positionSize = 100e6;

        uint256 fee = _ccipFee(safe, positionSize);

        vm.startPrank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee}(positionSize, safe);
        vm.stopPrank();

        uint256 partialRepay = positionSize / 2;
        deal(USDC, user, partialRepay);
        vm.startPrank(user);
        s_usdc.approve(account, partialRepay);
        MarginAccount(payable(account)).repayLoan(partialRepay);
        vm.stopPrank();

        (uint256 totalCollateralBase, uint256 totalDebtBase,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertEq(s_wstETH.balanceOf(account), 0);
        assertGt(totalCollateralBase, 0);
        assertGt(totalDebtBase, 0);
    }

    function test_RevertWhen_InitializeCalledTwice() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);

        vm.expectRevert(MarginAccount.AlreadyInitialized.selector);
        MarginAccount(payable(account)).initialize(
            user, address(factory), AAVE_V3_POOL, CCIP_ROUTER, USDC, receiver, POLYGON_CHAIN_SELECTOR
        );
    }

    function test_RevertWhen_CcipReceiveCallerIsNotRouter() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);

        Client.EVMTokenAmount[] memory destTokenAmounts = new Client.EVMTokenAmount[](0);
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: POLYGON_CHAIN_SELECTOR,
            sender: abi.encode(receiver),
            data: abi.encode(uint256(1)),
            destTokenAmounts: destTokenAmounts
        });

        vm.expectRevert(MarginAccount.NotRouter.selector);
        MarginAccount(payable(account)).ccipReceive(message);
    }

    function test_AavePoolGetter() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);
        assertEq(MarginAccount(payable(account)).aavePool(), AAVE_V3_POOL);
    }

    function test_CcipRouterGetter() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);
        assertEq(MarginAccount(payable(account)).ccipRouter(), CCIP_ROUTER);
    }

    function test_SupportsInterface() public withMarginAccount(user) {
        MarginAccount account = MarginAccount(payable(factory.getMarginAccount(user)));
        assertTrue(account.supportsInterface(type(IAny2EVMMessageReceiver).interfaceId));
        assertTrue(account.supportsInterface(type(IERC165).interfaceId));
        assertFalse(account.supportsInterface(bytes4(0xdeadbeef)));
    }

    function test_BorrowAndBridgeRefundsExcessEth()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
        withDeposit(user, address(WSTETH), DEPOSIT_AMOUNT)
    {
        address account = factory.getMarginAccount(user);
        uint256 positionSize = 100e6;

        uint256 fee = _ccipFee(safe, positionSize);
        uint256 excess = 0.1 ether;
        uint256 userEthBefore = user.balance;

        vm.prank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee + excess}(positionSize, safe);

        assertEq(account.balance, 0);
        assertEq(user.balance, userEthBefore - fee);
    }

    function test_DepositAToken() public withWhitelistedToken(address(WSTETH)) withMarginAccount(user) {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        _supplyToAave(user, DEPOSIT_AMOUNT);
        uint256 aTokenBal = IERC20(aToken).balanceOf(user);

        vm.startPrank(user);
        IERC20(aToken).approve(account, aTokenBal);
        MarginAccount(payable(account)).depositAToken(aToken, aTokenBal);
        vm.stopPrank();

        (uint256 totalCollateralBase,,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertEq(IERC20(aToken).balanceOf(user), 0);
        assertGt(totalCollateralBase, 0);
    }

    function test_DepositAToken_ThenBorrow() public withWhitelistedToken(address(WSTETH)) withMarginAccount(user) {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        _supplyToAave(user, DEPOSIT_AMOUNT);
        uint256 aTokenBal = IERC20(aToken).balanceOf(user);

        vm.startPrank(user);
        IERC20(aToken).approve(account, aTokenBal);
        MarginAccount(payable(account)).depositAToken(aToken, aTokenBal);
        vm.stopPrank();

        uint256 positionSize = 100e6;
        uint256 fee = _ccipFee(safe, positionSize);
        vm.prank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee}(positionSize, safe);

        (, uint256 totalDebtBase,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertGt(totalDebtBase, 0);
    }

    function test_RevertWhen_DepositATokenNotWhitelisted() public withMarginAccount(user) {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        _supplyToAave(user, DEPOSIT_AMOUNT);
        uint256 aTokenBal = IERC20(aToken).balanceOf(user);

        vm.startPrank(user);
        IERC20(aToken).approve(account, aTokenBal);
        vm.expectRevert(abi.encodeWithSelector(MarginAccount.TokenIsNotSupported.selector, address(WSTETH)));
        MarginAccount(payable(account)).depositAToken(aToken, aTokenBal);
        vm.stopPrank();
    }

    function test_RevertWhen_DepositATokenZeroAmount()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).depositAToken(aToken, 0);
    }

    function test_RevertWhen_DepositATokenNotOwner()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        _supplyToAave(user, DEPOSIT_AMOUNT);
        uint256 aTokenBal = IERC20(aToken).balanceOf(user);

        address stranger = makeAddr("stranger");
        vm.prank(user);
        IERC20(aToken).transfer(stranger, aTokenBal);

        vm.startPrank(stranger);
        IERC20(aToken).approve(account, aTokenBal);
        vm.expectRevert(MarginAccount.NotOwner.selector);
        MarginAccount(payable(account)).depositAToken(aToken, aTokenBal);
        vm.stopPrank();
    }

    function test_WithdrawAToken() public withWhitelistedToken(address(WSTETH)) withMarginAccount(user) {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        _supplyToAave(user, DEPOSIT_AMOUNT);
        uint256 aTokenBal = IERC20(aToken).balanceOf(user);

        vm.startPrank(user);
        IERC20(aToken).approve(account, aTokenBal);
        MarginAccount(payable(account)).depositAToken(aToken, aTokenBal);
        vm.stopPrank();

        uint256 accountATokenBal = IERC20(aToken).balanceOf(account);
        vm.prank(user);
        MarginAccount(payable(account)).withdrawAToken(aToken, accountATokenBal);

        assertApproxEqRel(IERC20(aToken).balanceOf(user), DEPOSIT_AMOUNT, 0.001 ether);
    }

    function test_WithdrawAToken_FullWithdrawDisablesCollateral()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        _supplyToAave(user, DEPOSIT_AMOUNT);
        uint256 aTokenBal = IERC20(aToken).balanceOf(user);

        vm.startPrank(user);
        IERC20(aToken).approve(account, aTokenBal);
        MarginAccount(payable(account)).depositAToken(aToken, aTokenBal);
        vm.stopPrank();

        uint256 accountATokenBal = IERC20(aToken).balanceOf(account);
        vm.prank(user);
        MarginAccount(payable(account)).withdrawAToken(aToken, accountATokenBal);

        (uint256 totalCollateralBase,,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertApproxEqAbs(totalCollateralBase, 0, 1e4);
    }

    function test_RevertWhen_WithdrawATokenZeroAmount()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        vm.prank(user);
        vm.expectRevert(MarginAccount.ZeroAmount.selector);
        MarginAccount(payable(account)).withdrawAToken(aToken, 0);
    }

    function test_RevertWhen_WithdrawATokenNotOwner()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(MarginAccount.NotOwner.selector);
        MarginAccount(payable(account)).withdrawAToken(aToken, 1e18);
    }

    function test_DirectATokenSend_AlwaysRequiresEnableCollateral()
        public
        withWhitelistedToken(address(WSTETH))
        withMarginAccount(user)
    {
        address account = factory.getMarginAccount(user);
        address aToken = AWSTETH;
        _supplyToAave(user, DEPOSIT_AMOUNT);

        uint256 aTokenBal = IERC20(aToken).balanceOf(user);
        vm.prank(user);
        IERC20(aToken).transfer(account, aTokenBal);

        uint256 positionSize = 100e6;
        uint256 fee = _ccipFee(safe, positionSize);

        vm.prank(user);
        MarginAccount(payable(account)).enableCollateralToken(address(WSTETH), true);

        (uint256 collateral,,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertGt(collateral, 0);

        vm.prank(user);
        MarginAccount(payable(account)).borrowAndBridge{value: fee}(positionSize, safe);

        (, uint256 totalDebt,,,,) = IPool(AAVE_V3_POOL).getUserAccountData(account);
        assertGt(totalDebt, 0);
    }

    function test_RevertWhen_EthRefundFails() public withWhitelistedToken(address(WSTETH)) {
        MockWithoutReceive rejector = new MockWithoutReceive();
        deal(address(WSTETH), address(rejector), DEPOSIT_AMOUNT);
        deal(address(rejector), 1 ether);

        rejector.setup(factory, address(WSTETH), DEPOSIT_AMOUNT);

        uint256 positionSize = 100e6;
        uint256 fee = _ccipFee(safe, positionSize);
        uint256 excess = 0.1 ether;

        vm.expectRevert();
        rejector.doBorrowAndBridge{value: fee + excess}(factory, positionSize, safe);
    }

    function _supplyToAave(address _user, uint256 amount) internal {
        vm.startPrank(_user);
        IERC20(WSTETH).approve(AAVE_V3_POOL, amount);
        IPool(AAVE_V3_POOL).supply(WSTETH, amount, _user, 0);
        vm.stopPrank();
    }
}
