// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script, console2 } from "forge-std/Script.sol";
import { SubstrateEconomy } from "../src/SubstrateEconomy.sol";
import { SubstrateGateway } from "../src/SubstrateGateway.sol";

contract DeploySubstrate is Script {
    
    // Base mainnet addresses
    address public constant ERC_8004_REGISTRY = 0x7177a6867296406881E20d6647232314736Dd09A;
    
    function run() public {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
    uint256 deployerPrivateKey = vm.parseUint(privateKeyStr);
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying Substrate to Base mainnet...");
        console2.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SubstrateEconomy
        console2.log("Deploying SubstrateEconomy...");
        SubstrateEconomy economy = new SubstrateEconomy();
        console2.log("SubstrateEconomy deployed at:", address(economy));
        
        // Deploy SubstrateGateway (no constructor args)
        console2.log("Deploying SubstrateGateway...");
        SubstrateGateway gateway = new SubstrateGateway();
        console2.log("SubstrateGateway deployed at:", address(gateway));
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("========================================");
        console2.log("DEPLOYMENT COMPLETE");
        console2.log("========================================");
        console2.log("SubstrateEconomy:", address(economy));
        console2.log("SubstrateGateway:", address(gateway));
        console2.log("ERC-8004 Registry:", ERC_8004_REGISTRY);
        console2.log("");
        console2.log("Next steps:");
        console2.log("1. Verify contracts on Basescan");
        console2.log("2. Launch $SUBSTRATE token via @bankrbot");
        console2.log("3. Register agents on SubstrateEconomy");
    }
}
