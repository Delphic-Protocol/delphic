// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract PositionManagerTest is Test {
    // Polygon addresses
    address constant USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // USDC
    address constant USDCE = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174; // USDC.e
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    uint64 constant ETH_CHAIN_SELECTOR = 5009297550715157269;

    PositionManager positionManager;
    address router = makeAddr("router");
    address proxyWallet = makeAddr("proxyWallet");
    address cre = makeAddr("cre");

    function setUp() public {
        vm.createSelectFork(vm.envString("POLYGON_RPC_URL"));
        positionManager = new PositionManager(router, UNISWAP_V3_ROUTER, USDCE, cre);
    }

    function test_CcipReceive() public {
        uint256 amount = 100e6;
        deal(USDC, address(positionManager), amount);

        vm.prank(router);
        positionManager.ccipReceive(_buildMessage(proxyWallet, amount));

        assertApproxEqRel(IERC20(USDCE).balanceOf(proxyWallet), amount, 0.01 ether);
        assertEq(IERC20(USDC).balanceOf(address(positionManager)), 0);
    }

    function test_RevertWhen_CcipReceiveCallerIsNotRouter() public {
        Client.EVMTokenAmount[] memory destTokenAmounts = new Client.EVMTokenAmount[](0);
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: ETH_CHAIN_SELECTOR,
            sender: abi.encode(address(0)),
            data: "",
            destTokenAmounts: destTokenAmounts
        });

        vm.expectRevert(abi.encodeWithSelector(PositionManager.NotRouter.selector, address(this)));
        positionManager.ccipReceive(message);
    }

    function test_OpenPosition() public {
        bytes memory sig = "openPositionSignature";
        address owner = positionManager.getOwner();

        vm.expectEmit(true, true, true, true);
        emit PositionManager.OpenPositionRequested(owner, 1, sig);

        uint256 positionId = positionManager.openPosition(owner, sig);
        assertEq(positionId, 1);
        assertEq(positionManager.getPositionOwner(1), owner);
        assertEq(positionManager.getNextPositionId(), 2);
    }

    function test_ClosePosition() public {
        address onBehalfOf = makeAddr("marginAccount");
        bytes memory openSig = "openPositionSignature";
        bytes memory closeSig = "closePositionSignature";

        uint256 positionId = positionManager.openPosition(onBehalfOf, openSig);

        vm.expectEmit(true, true, true, true);
        emit PositionManager.ClosePositionRequested(onBehalfOf, positionId, closeSig);

        positionManager.closePosition(onBehalfOf, positionId, closeSig);
    }

    function test_RevertWhen_ClosePositionNotOwner() public {
        address onBehalfOf = makeAddr("marginAccount");
        address attacker = makeAddr("attacker");
        bytes memory sig = "sig";

        uint256 positionId = positionManager.openPosition(onBehalfOf, sig);

        vm.expectRevert(abi.encodeWithSelector(PositionManager.NotPositionOwner.selector, positionId, attacker));
        positionManager.closePosition(attacker, positionId, sig);
    }

    function test_RecordOrder() public {
        PositionManager.Order[] memory orders = new PositionManager.Order[](2);
        orders[0] = PositionManager.Order({orderHash: keccak256("order1"), positionId: 1});
        orders[1] = PositionManager.Order({orderHash: keccak256("order2"), positionId: 2});

        vm.prank(cre);
        positionManager.onReport("", abi.encode(uint8(1), abi.encode(orders)));

        assertEq(positionManager.getOrderPositionId(orders[0].orderHash), 1);
        assertEq(positionManager.getOrderPositionId(orders[1].orderHash), 2);
        assertEq(positionManager.getPositionOrderHash(1), orders[0].orderHash);
        assertEq(positionManager.getPositionOrderHash(2), orders[1].orderHash);

        bytes32[] memory queue = positionManager.getOrderQueue();
        assertEq(queue.length, 2);
        assertEq(queue[0], orders[0].orderHash);
        assertEq(queue[1], orders[1].orderHash);
    }

    function test_RecordOrder_SkipsDuplicate() public {
        PositionManager.Order[] memory orders = new PositionManager.Order[](1);
        orders[0] = PositionManager.Order({orderHash: keccak256("order1"), positionId: 1});

        vm.startPrank(cre);
        positionManager.onReport("", abi.encode(uint8(1), abi.encode(orders)));
        positionManager.onReport("", abi.encode(uint8(1), abi.encode(orders))); // same hash
        vm.stopPrank();

        assertEq(positionManager.getOrderQueue().length, 1);
    }

    function test_RemoveOrder() public {
        PositionManager.Order[] memory orders = new PositionManager.Order[](3);
        orders[0] = PositionManager.Order({orderHash: keccak256("order1"), positionId: 1});
        orders[1] = PositionManager.Order({orderHash: keccak256("order2"), positionId: 2});
        orders[2] = PositionManager.Order({orderHash: keccak256("order3"), positionId: 3});

        vm.startPrank(cre);
        positionManager.onReport("", abi.encode(uint8(1), abi.encode(orders)));

        positionManager.onReport("", abi.encode(uint8(2), abi.encode(orders[1].orderHash)));
        vm.stopPrank();

        bytes32[] memory queue = positionManager.getOrderQueue();
        assertEq(queue.length, 2);

        assertEq(positionManager.getOrderPositionId(orders[1].orderHash), 0);
        assertEq(positionManager.getPositionOrderHash(2), bytes32(0));
    }

    function test_RevertWhen_RemoveOrderNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(PositionManager.OrderNotFound.selector, keccak256("missing")));
        vm.prank(cre);
        positionManager.onReport("", abi.encode(uint8(2), abi.encode(keccak256("missing"))));
    }

    function test_RevertWhen_RecordOrderCallerIsNotCre() public {
        PositionManager.Order[] memory orders = new PositionManager.Order[](1);
        orders[0] = PositionManager.Order({orderHash: keccak256("order1"), positionId: 1});

        vm.expectRevert(abi.encodeWithSelector(PositionManager.NotAuthorized.selector, address(this)));
        positionManager.onReport("", abi.encode(uint8(1), abi.encode(orders)));
    }

    function test_SetCre() public {
        address newCre = makeAddr("newCre");

        vm.expectEmit(true, true, true, true);
        emit PositionManager.CreUpdated(cre, newCre);
        positionManager.setCre(newCre);

        assertEq(positionManager.getCre(), newCre);
    }

    function test_RevertWhen_SetCreCallerIsNotOwner() public {
        address newCre = makeAddr("newCre");

        vm.prank(makeAddr("stranger"));
        vm.expectRevert(abi.encodeWithSelector(PositionManager.NotOwner.selector, makeAddr("stranger")));
        positionManager.setCre(newCre);
    }

    function test_SetSlippage() public {
        uint256 oldSlippage = positionManager.getSlippageBps();
        uint256 newSlippage = 100;

        vm.expectEmit(true, true, true, true);
        emit PositionManager.SlippageUpdated(oldSlippage, newSlippage);
        positionManager.setSlippage(newSlippage);

        assertEq(positionManager.getSlippageBps(), newSlippage);
    }

    function test_SupportsInterface() public view {
        assertTrue(positionManager.supportsInterface(type(IAny2EVMMessageReceiver).interfaceId));
        assertTrue(positionManager.supportsInterface(type(IERC165).interfaceId));
        assertFalse(positionManager.supportsInterface(bytes4(0xdeadbeef)));
    }

    function test_RevertWhen_SetSlippageCallerIsNotOwner() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(abi.encodeWithSelector(PositionManager.NotOwner.selector, makeAddr("stranger")));
        positionManager.setSlippage(100);
    }

    function _buildMessage(address wallet, uint256 amount) internal pure returns (Client.Any2EVMMessage memory) {
        Client.EVMTokenAmount[] memory destTokenAmounts = new Client.EVMTokenAmount[](1);
        destTokenAmounts[0] = Client.EVMTokenAmount({token: USDC, amount: amount});
        return Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: ETH_CHAIN_SELECTOR,
            sender: abi.encode(address(0)),
            data: abi.encode(wallet),
            destTokenAmounts: destTokenAmounts
        });
    }
}
