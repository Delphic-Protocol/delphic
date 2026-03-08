// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {ISafe} from "./interfaces/ISafe.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract SettlementModule {
    uint24 private constant POOL_FEE = 100;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    ISwapRouter private immutable i_swapRouter;
    IRouterClient private immutable i_ccipRouter;
    address private immutable i_usdc;
    address private immutable i_usdce;
    uint64 private immutable i_ethChainSelector;
    address private immutable i_owner;

    address private s_cre;
    uint256 private s_slippageBps = 50;

    error NotAuthorized(address caller);
    error NotOwner(address caller);
    error SafeExecFailed();
    error ZeroAmount();

    event PositionClosed(uint256 indexed positionId, uint256 usdcAmount);
    event CreUpdated(address indexed oldCre, address indexed newCre);
    event SlippageUpdated(uint256 oldSlippageBps, uint256 newSlippageBps);

    constructor(
        address swapRouter,
        address ccipRouter,
        address usdc,
        address usdce,
        uint64 ethChainSelector,
        address cre
    ) {
        i_owner = msg.sender;
        i_swapRouter = ISwapRouter(swapRouter);
        i_ccipRouter = IRouterClient(ccipRouter);
        i_usdc = usdc;
        i_usdce = usdce;
        i_ethChainSelector = ethChainSelector;
        s_cre = cre;
    }

    function onReport(bytes calldata, bytes calldata report) external onlyCre {
        (address safe, uint256 positionId, address marginAccount) =
            abi.decode(report, (address, uint256, address));
        _settle(safe, positionId, marginAccount);
    }

    function _settle(address safe, uint256 positionId, address marginAccount) private {
        uint256 amount = IERC20(i_usdce).balanceOf(safe);
        if (amount == 0) revert ZeroAmount();
        bool ok = ISafe(safe)
            .execTransactionFromModule(
                i_usdce, 0, abi.encodeCall(IERC20.transfer, (address(this), amount)), ISafe.Operation.Call
            );
        if (!ok) revert SafeExecFailed();

        IERC20(i_usdce).approve(address(i_swapRouter), amount);
        uint256 usdcAmount = i_swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: i_usdce,
                tokenOut: i_usdc,
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: amount * (BPS_DENOMINATOR - s_slippageBps) / BPS_DENOMINATOR,
                sqrtPriceLimitX96: 0
            })
        );

        IERC20(i_usdc).approve(address(i_ccipRouter), usdcAmount);

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: i_usdc, amount: usdcAmount});

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(marginAccount),
            data: abi.encode(positionId),
            tokenAmounts: tokenAmounts,
            feeToken: address(0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 500_000}))
        });

        uint256 fee = i_ccipRouter.getFee(i_ethChainSelector, message);
        i_ccipRouter.ccipSend{value: fee}(i_ethChainSelector, message);

        emit PositionClosed(positionId, usdcAmount);
    }

    function setCre(address newCre) external onlyOwner {
        emit CreUpdated(s_cre, newCre);
        s_cre = newCre;
    }

    function withdrawMatic(uint256 amount) external onlyOwner {
        (bool ok,) = i_owner.call{value: amount}("");
        require(ok);
    }

    function getOwner() external view returns (address) {
        return i_owner;
    }

    function getCre() external view returns (address) {
        return s_cre;
    }

    function setSlippage(uint256 newSlippageBps) external onlyOwner {
        emit SlippageUpdated(s_slippageBps, newSlippageBps);
        s_slippageBps = newSlippageBps;
    }

    function getSlippageBps() external view returns (uint256) {
        return s_slippageBps;
    }

    modifier onlyCre() {
        if (msg.sender != s_cre) revert NotAuthorized(msg.sender);
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != i_owner) revert NotOwner(msg.sender);
        _;
    }

    receive() external payable {}
}
