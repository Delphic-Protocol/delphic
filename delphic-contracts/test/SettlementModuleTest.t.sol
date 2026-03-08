// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SettlementModule} from "../src/SettlementModule.sol";
import {ISafe} from "../src/interfaces/ISafe.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {MockWithoutReceive} from "./mocks/MockWithoutReceive.sol";

contract SettlementModuleTest is Test {
    address constant USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address constant USDCE = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant CCIP_ROUTER = 0x849c5ED5a80F5B408Dd4969b78c2C8fdf0565Bfe;
    uint64 constant ETH_CHAIN_SELECTOR = 5009297550715157269;
    address constant SAFE = 0xb43d48Ce350aebFCdE7C48e33dD6a49B6cE372aB;
    address constant SAFE_OWNER = 0x43FFc0CfdDA49e9Da05D29B55337e96C53ee804B;
    uint256 constant SAFE_OWNER_KEY = 0x7a979d4e687e846b033a5d344e7417217ed892924b39c2c1f2dd65359fbddddf;

    SettlementModule module;
    address cre = makeAddr("cre");
    address marginAccount = makeAddr("marginAccount");

    function setUp() public {
        vm.createSelectFork(vm.envString("POLYGON_RPC_URL"), 83374604);

        module = new SettlementModule(UNISWAP_V3_ROUTER, CCIP_ROUTER, USDC, USDCE, ETH_CHAIN_SELECTOR, cre);

        bytes memory enableModuleData = abi.encodeWithSignature("enableModule(address)", address(module));
        bytes32 txHash = ISafe(SAFE)
            .getTransactionHash(SAFE, 0, enableModuleData, 0, 0, 0, 0, address(0), address(0), ISafe(SAFE).nonce());

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SAFE_OWNER_KEY, txHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        ISafe(SAFE).execTransaction(SAFE, 0, enableModuleData, 0, 0, 0, 0, address(0), payable(address(0)), sig);

        vm.deal(address(module), 40 ether);
    }

    function test_ClosePosition() public {
        uint256 amount = 100e6;

        deal(USDCE, SAFE, amount);

        vm.prank(cre);
        module.onReport("", abi.encode(SAFE, uint256(1), marginAccount));

        assertEq(IERC20(USDCE).balanceOf(SAFE), 0);
        assertEq(IERC20(USDCE).balanceOf(address(module)), 0);
    }

    function test_RevertWhen_CallerIsNotRelayer() public {
        vm.expectRevert(abi.encodeWithSelector(SettlementModule.NotAuthorized.selector, address(this)));
        module.onReport("", abi.encode(SAFE, uint256(1), marginAccount));
    }

    function test_RevertWhen_SafeHasNoUsdce() public {
        deal(USDCE, SAFE, 0);
        vm.expectRevert(SettlementModule.ZeroAmount.selector);
        vm.prank(cre);
        module.onReport("", abi.encode(SAFE, uint256(1), marginAccount));
    }

    function test_RevertWhen_SafeExecFailed() public {
        deal(USDCE, SAFE, 100e6);

        vm.mockCall(SAFE, abi.encodeWithSelector(ISafe.execTransactionFromModule.selector), abi.encode(false));

        vm.prank(cre);
        vm.expectRevert(SettlementModule.SafeExecFailed.selector);
        module.onReport("", abi.encode(SAFE, uint256(1), marginAccount));
    }

    function test_SetRelayer() public {
        address newRelayer = makeAddr("newRelayer");

        vm.expectEmit(true, true, false, false);
        emit SettlementModule.CreUpdated(cre, newRelayer);

        module.setCre(newRelayer);

        assertEq(module.getCre(), newRelayer);
    }

    function test_RevertWhen_SetRelayerCallerIsNotOwner() public {
        vm.expectRevert(abi.encodeWithSelector(SettlementModule.NotOwner.selector, cre));
        vm.prank(cre);
        module.setCre(makeAddr("newRelayer"));
    }

    function test_GetOwner() public view {
        assertEq(module.getOwner(), address(this));
    }

    function test_SetSlippage() public {
        uint256 oldSlippage = module.getSlippageBps();
        uint256 newSlippage = 100;

        vm.expectEmit(true, true, true, true);
        emit SettlementModule.SlippageUpdated(oldSlippage, newSlippage);
        module.setSlippage(newSlippage);

        assertEq(module.getSlippageBps(), newSlippage);
    }

    function test_RevertWhen_SetSlippageCallerIsNotOwner() public {
        vm.prank(cre);
        vm.expectRevert(abi.encodeWithSelector(SettlementModule.NotOwner.selector, cre));
        module.setSlippage(100);
    }

    function test_WithdrawMatic() public {
        uint256 amount = 1 ether;
        uint256 ownerBalanceBefore = address(this).balance;

        module.withdrawMatic(amount);

        assertEq(address(this).balance, ownerBalanceBefore + amount);
        assertEq(address(module).balance, 40 ether - amount);
    }

    function test_RevertWhen_WithdrawMaticCallerIsNotOwner() public {
        vm.prank(cre);
        vm.expectRevert(abi.encodeWithSelector(SettlementModule.NotOwner.selector, cre));
        module.withdrawMatic(1 ether);
    }

    receive() external payable {}
}

/// No fork contract to avoid RPC issue
contract SettlementModuleNoForkTest is Test {
    address constant USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address constant USDCE = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant CCIP_ROUTER = 0x849c5ED5a80F5B408Dd4969b78c2C8fdf0565Bfe;
    uint64 constant ETH_CHAIN_SELECTOR = 5009297550715157269;

    function test_RevertWhen_WithdrawMaticRefundFails() public {
        address cre = makeAddr("cre");
        MockWithoutReceive mockOwner = new MockWithoutReceive();
        mockOwner.deploySettlementModule(UNISWAP_V3_ROUTER, CCIP_ROUTER, USDC, USDCE, ETH_CHAIN_SELECTOR, cre);
        deal(address(mockOwner.settlementModule()), 1 ether);

        vm.expectRevert();
        mockOwner.withdrawMatic(1 ether);
    }
}
