// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";

contract PositionManager is IAny2EVMMessageReceiver, IERC165 {
    struct Order {
        bytes32 orderHash;
        uint256 positionId;
    }

    uint24 private constant POOL_FEE = 100;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    address private immutable i_ccipRouter;
    address private immutable i_usdce;
    address private immutable i_owner;
    ISwapRouter private immutable i_swapRouter;

    uint256 private s_nextPositionId = 1;
    uint256 private s_slippageBps = 50;
    address private s_cre;

    mapping(bytes32 => uint256) private s_orderPositionId;
    mapping(uint256 => bytes32) private s_positionOrderHash;
    mapping(uint256 => address) private s_positionOwner;
    bytes32[] private s_orderQueue;
    mapping(bytes32 => uint256) private s_orderQueueIndex; // 1-indexed; 0 = not in queue

    error NotRouter(address caller);
    error NotOwner(address caller);
    error NotAuthorized(address caller);
    error OrderNotFound(bytes32 orderHash);
    error NotPositionOwner(uint256 positionId, address caller);

    event OpenPositionRequested(address indexed onBehalfOf, uint256 indexed positionId, bytes signature);
    event ClosePositionRequested(address indexed onBehalfOf, uint256 indexed positionId, bytes signature);
    event SlippageUpdated(uint256 oldSlippageBps, uint256 newSlippageBps);
    event CreUpdated(address indexed oldCre, address indexed newCre);

    modifier onlyRouter() {
        if (msg.sender != i_ccipRouter) revert NotRouter(msg.sender);
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != i_owner) revert NotOwner(msg.sender);
        _;
    }

    modifier onlyCre() {
        if (msg.sender != s_cre) revert NotAuthorized(msg.sender);
        _;
    }

    constructor(address _ccipRouter, address _swapRouter, address _usdce, address _cre) {
        i_owner = msg.sender;
        i_ccipRouter = _ccipRouter;
        i_swapRouter = ISwapRouter(_swapRouter);
        i_usdce = _usdce;
        s_cre = _cre;
    }

    function ccipReceive(Client.Any2EVMMessage calldata message) external override onlyRouter {
        address safe = abi.decode(message.data, (address));

        Client.EVMTokenAmount memory tokenAmount = message.destTokenAmounts[0];
        address usdc = tokenAmount.token;
        uint256 amount = tokenAmount.amount;

        IERC20(usdc).approve(address(i_swapRouter), amount);
        i_swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: usdc,
                tokenOut: i_usdce,
                fee: POOL_FEE,
                recipient: safe,
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: amount * (BPS_DENOMINATOR - s_slippageBps) / BPS_DENOMINATOR,
                sqrtPriceLimitX96: 0
            })
        );
    }

    function openPosition(address onBehalfOf, bytes calldata signature) external returns (uint256 positionId) {
        positionId = s_nextPositionId++;
        s_positionOwner[positionId] = onBehalfOf;
        emit OpenPositionRequested(onBehalfOf, positionId, signature);
    }

    function closePosition(address onBehalfOf, uint256 positionId, bytes calldata signature) external {
        if (s_positionOwner[positionId] != onBehalfOf) revert NotPositionOwner(positionId, onBehalfOf);
        emit ClosePositionRequested(onBehalfOf, positionId, signature);
    }

    // action == 1: recordOrder — ClosePosition workflow
    // action == 2: removeOrder — OrderMonitor workflow
    function onReport(bytes calldata, bytes calldata report) external onlyCre {
        (uint8 action, bytes memory data) = abi.decode(report, (uint8, bytes));
        if (action == 1) {
            _recordOrders(abi.decode(data, (Order[])));
        } else if (action == 2) {
            _removeOrder(abi.decode(data, (bytes32)));
        }
    }

    function _recordOrders(Order[] memory orders) private {
        for (uint256 i = 0; i < orders.length; i++) {
            bytes32 orderHash = orders[i].orderHash;
            uint256 positionId = orders[i].positionId;
            s_orderPositionId[orderHash] = positionId;
            s_positionOrderHash[positionId] = orderHash;
            if (s_orderQueueIndex[orderHash] == 0) {
                s_orderQueue.push(orderHash);
                s_orderQueueIndex[orderHash] = s_orderQueue.length; // 1-indexed
            }
        }
    }

    function _removeOrder(bytes32 orderHash) private {
        uint256 idx = s_orderQueueIndex[orderHash];
        if (idx == 0) revert OrderNotFound(orderHash);

        uint256 lastIdx = s_orderQueue.length;
        if (idx != lastIdx) {
            bytes32 lastHash = s_orderQueue[lastIdx - 1];
            s_orderQueue[idx - 1] = lastHash;
            s_orderQueueIndex[lastHash] = idx;
        }
        s_orderQueue.pop();

        uint256 positionId = s_orderPositionId[orderHash];
        delete s_orderQueueIndex[orderHash];
        delete s_orderPositionId[orderHash];
        delete s_positionOrderHash[positionId];
        delete s_positionOwner[positionId];
    }

    function setCre(address newCre) external onlyOwner {
        emit CreUpdated(s_cre, newCre);
        s_cre = newCre;
    }

    function setSlippage(uint256 newSlippageBps) external onlyOwner {
        emit SlippageUpdated(s_slippageBps, newSlippageBps);
        s_slippageBps = newSlippageBps;
    }

    function getOwner() external view returns (address) {
        return i_owner;
    }

    function getSlippageBps() external view returns (uint256) {
        return s_slippageBps;
    }

    function getCre() external view returns (address) {
        return s_cre;
    }

    function getOrderQueue() external view returns (bytes32[] memory) {
        return s_orderQueue;
    }

    function getOrderPositionId(bytes32 orderHash) external view returns (uint256) {
        return s_orderPositionId[orderHash];
    }

    function getPositionOrderHash(uint256 positionId) external view returns (bytes32) {
        return s_positionOrderHash[positionId];
    }

    function getPositionOwner(uint256 positionId) external view returns (address) {
        return s_positionOwner[positionId];
    }

    function getNextPositionId() external view returns (uint256) {
        return s_nextPositionId;
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
