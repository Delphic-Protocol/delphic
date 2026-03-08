// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {IAToken} from "./interfaces/IAToken.sol";
import {MarginAccountFactory} from "./MarginAccountFactory.sol";
import {IPool} from "./interfaces/IPool.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract MarginAccount is IAny2EVMMessageReceiver, IERC165 {

    error NotOwner();
    error NotRouter();
    error ZeroAmount();
    error TokenIsNotSupported(address token);

    error AlreadyInitialized();

    address private s_owner;
    address private s_usdc;
    address private s_receiver;
    MarginAccountFactory private s_factory;
    IPool private s_aavePool;
    IRouterClient private s_ccipRouter;
    uint64 private s_destinationChainSelector;

    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event Borrowed(address indexed safe, uint256 borrowAmount);
    event PositionRepaid(uint256 amount);
    event PositionClosed(uint256 positionId);

    modifier onlyOwner() {
        if (msg.sender != s_owner) revert NotOwner();
        _;
    }

    modifier onlyRouter() {
        if (msg.sender != address(s_ccipRouter)) revert NotRouter();
        _;
    }

    function initialize(
        address _owner,
        address _factory,
        address _aavePool,
        address _ccipRouter,
        address _usdc,
        address _receiver,
        uint64 _destinationChainSelector
    ) external {
        if (s_owner != address(0)) revert AlreadyInitialized();
        s_owner = _owner;
        s_factory = MarginAccountFactory(_factory);
        s_aavePool = IPool(_aavePool);
        s_ccipRouter = IRouterClient(_ccipRouter);
        s_usdc = _usdc;
        s_receiver = _receiver;
        s_destinationChainSelector = _destinationChainSelector;
    }

    function deposit(address token, uint256 amount) external onlyOwner {
        if (!s_factory.isWhitelisted(token)) revert TokenIsNotSupported(token);
        if (amount == 0) revert ZeroAmount();
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        _supplyToAave(token, amount);
        emit Deposited(token, amount);
    }

    function enableCollateralToken(address token, bool enabled) external onlyOwner {
        _setCollateral(token, enabled);
    }

    function depositAToken(address aToken, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        address underlying = IAToken(aToken).UNDERLYING_ASSET_ADDRESS();
        if (!s_factory.isWhitelisted(underlying)) revert TokenIsNotSupported(underlying);
        IERC20(aToken).transferFrom(msg.sender, address(this), amount);
        _setCollateral(underlying, true);
        emit Deposited(aToken, amount);
    }

    function withdrawAToken(address aToken, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        IERC20(aToken).transfer(s_owner, amount);
        address underlying = IAToken(aToken).UNDERLYING_ASSET_ADDRESS();
        if (IERC20(aToken).balanceOf(address(this)) == 0) {
            _setCollateral(underlying, false);
        }
        emit Withdrawn(aToken, amount);
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        address aToken = s_aavePool.getReserveData(token).aTokenAddress;
        if (IERC20(aToken).balanceOf(address(this)) > 0) {
            s_aavePool.withdraw(token, amount, s_owner);
        } else {
            IERC20(token).transfer(s_owner, amount);
        }
        emit Withdrawn(token, amount);
    }

    function depositBorrowAndBridge(address token, uint256 depositAmount, uint256 borrowAmount, address safe)
        external
        payable
        onlyOwner
    {
        if (!s_factory.isWhitelisted(token)) revert TokenIsNotSupported(token);
        if (depositAmount == 0 || borrowAmount == 0) revert ZeroAmount();
        IERC20(token).transferFrom(msg.sender, address(this), depositAmount);
        _supplyToAave(token, depositAmount);
        emit Deposited(token, depositAmount);
        _borrowFromAave(s_usdc, borrowAmount);
        _sendToCcip(s_usdc, borrowAmount, abi.encode(safe));
        emit Borrowed(safe, borrowAmount);
    }

    function borrowAndBridge(uint256 amount, address safe) external payable onlyOwner {
        if (amount == 0) revert ZeroAmount();
        _borrowFromAave(s_usdc, amount);
        _sendToCcip(s_usdc, amount, abi.encode(safe));
        emit Borrowed(safe, amount);
    }

    function repayLoan(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        IERC20(s_usdc).transferFrom(msg.sender, address(this), amount);
        _repayLoan(amount);
    }

    function ccipReceive(Client.Any2EVMMessage calldata message) external override onlyRouter {
        uint256 positionId = abi.decode(message.data, (uint256));
        uint256 amount = message.destTokenAmounts[0].amount;
        _repayLoan(amount);
        emit PositionClosed(positionId);
    }

    function owner() external view returns (address) {
        return s_owner;
    }

    function factory() external view returns (address) {
        return address(s_factory);
    }

    function aavePool() external view returns (address) {
        return address(s_aavePool);
    }

    function ccipRouter() external view returns (address) {
        return address(s_ccipRouter);
    }

    function usdc() external view returns (address) {
        return s_usdc;
    }

    function receiver() external view returns (address) {
        return s_receiver;
    }

    function destinationChainSelector() external view returns (uint64) {
        return s_destinationChainSelector;
    }

    function _repayLoan(uint256 amount) internal {
        IERC20(s_usdc).approve(address(s_aavePool), amount);
        s_aavePool.repay(s_usdc, amount, 2, address(this));
        emit PositionRepaid(amount);
    }

    function _sendToCcip(address token, uint256 amount, bytes memory data) internal {
        IERC20(token).approve(address(s_ccipRouter), amount);

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: token, amount: amount});

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(s_receiver),
            data: data,
            tokenAmounts: tokenAmounts,
            feeToken: address(0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 400_000}))
        });

        uint256 fee = s_ccipRouter.getFee(s_destinationChainSelector, message);
        s_ccipRouter.ccipSend{value: fee}(s_destinationChainSelector, message);

        // Refund excess ETH to owner
        uint256 refund = address(this).balance;
        if (refund > 0) {
            (bool ok,) = s_owner.call{value: refund}("");
            require(ok);
        }
    }

    function _setCollateral(address token, bool enabled) internal {
        s_aavePool.setUserUseReserveAsCollateral(token, enabled);
    }

    function _supplyToAave(address token, uint256 amount) internal {
        IERC20(token).approve(address(s_aavePool), amount);
        s_aavePool.supply(token, amount, address(this), 0);
    }

    function _borrowFromAave(address token, uint256 amount) internal {
        s_aavePool.borrow(token, amount, 2, 0, address(this));
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
