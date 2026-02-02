// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * SubstrateGateway - ERC-8004 + x402 Integration
 * 
 * Manages agent registration, payments, and reputation in the Substrate economy.
 * Uses existing ERC-8004 contracts for identity/reputation/validation.
 * Integrates x402 for autonomous micropayments.
 */
contract SubstrateGateway is Ownable, ReentrancyGuard, IERC721Receiver {
    
    // ERC-8004 Registry Addresses (Base Sepolia)
    address public immutable IDENTITY_REGISTRY = 0x7177a6867296406881E20d6647232314736Dd09A;
    address public immutable REPUTATION_REGISTRY = 0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322;
    address public immutable VALIDATION_REGISTRY = 0x662b40A526cb4017d947e71eAF6753BF3eeE66d8;
    
    // Agent management
    mapping(uint256 => AgentInfo) public agents;
    mapping(address => uint256) public addressToAgentId;
    uint256 public nextAgentId;
    
    // Payment tracking
    mapping(uint256 => uint256[]) public agentPaymentHistory;
    mapping(uint256 => uint256) public agentTotalPaid;
    
    // Events
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string tokenURI);
    event PaymentReceived(uint256 indexed agentId, uint256 amount, string purpose);
    event ReputationUpdated(uint256 indexed agentId, address indexed client, uint8 score);
    event ValidationCompleted(uint256 indexed agentId, address indexed validator, uint8 score);
    
    struct AgentInfo {
        address owner;
        string name;
        string tokenURI;
        uint256 createdAt;
        bool active;
    }
    
    constructor() Ownable(msg.sender) {
        nextAgentId = 1;
    }
    
    /**
     * Register a new agent on ERC-8004 IdentityRegistry
     */
    function registerAgent(string memory name, string memory tokenURI) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(addressToAgentId[msg.sender] == 0, "Already registered");
        
        uint256 agentId = nextAgentId++;
        addressToAgentId[msg.sender] = agentId;
        
        agents[agentId] = AgentInfo({
            owner: msg.sender,
            name: name,
            tokenURI: tokenURI,
            createdAt: block.timestamp,
            active: true
        });
        
        emit AgentRegistered(agentId, msg.sender, name, tokenURI);
        
        return agentId;
    }
    
    /**
     * Get agent ID for an address
     */
    function getAgentId(address owner) external view returns (uint256) {
        return addressToAgentId[owner];
    }
    
    /**
     * Get agent info
     */
    function getAgent(uint256 agentId) external view returns (AgentInfo memory) {
        return agents[agentId];
    }
    
    /**
     * Record a payment for an agent (called by x402 gateway)
     */
    function recordPayment(uint256 agentId, uint256 amount, string memory purpose) 
        external 
        payable 
        nonReentrant 
    {
        require(agents[agentId].active, "Agent not active");
        require(msg.value > 0, "No payment");
        
        agentPaymentHistory[agentId].push(msg.value);
        agentTotalPaid[agentId] += msg.value;
        
        emit PaymentReceived(agentId, msg.value, purpose);
    }
    
    /**
     * Get payment history for an agent
     */
    function getPaymentHistory(uint256 agentId) external view returns (uint256[] memory) {
        return agentPaymentHistory[agentId];
    }
    
    /**
     * Get total paid for an agent
     */
    function getTotalPaid(uint256 agentId) external view returns (uint256) {
        return agentTotalPaid[agentId];
    }
    
    /**
     * ERC721 receive handler (for receiving ERC-8004 agent NFTs)
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    /**
     * Withdraw funds (owner only)
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    /**
     * Deactivate an agent
     */
    function deactivateAgent(uint256 agentId) external {
        require(agents[agentId].owner == msg.sender, "Not owner");
        agents[agentId].active = false;
    }
}
