// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {MarginAccountFactory} from "../src/MarginAccountFactory.sol";

contract DeployMarginAccountFactory is Script {
    function run() external returns (MarginAccountFactory) {
        uint48 initialDelay = uint48(vm.envUint("INITIAL_DELAY"));
        address admin = vm.envAddress("ADMIN");
        address aavePool = vm.envAddress("AAVE_POOL");
        address usdc = vm.envAddress("USDC");
        address ccipRouter = vm.envAddress("CCIP_ROUTER");
        address receiver = vm.envAddress("RECEIVER");
        uint64 destinationChainSelector = uint64(vm.envUint("DESTINATION_CHAIN_SELECTOR"));

        vm.startBroadcast();

        MarginAccountFactory factory = new MarginAccountFactory(
            initialDelay,
            admin,
            aavePool,
            usdc,
            ccipRouter,
            receiver,
            destinationChainSelector
        );

        vm.stopBroadcast();

        return factory;
    }
}