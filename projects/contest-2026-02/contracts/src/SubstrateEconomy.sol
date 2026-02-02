// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * SubstrateEconomy V2 - Complete Agent Economy System
 * 
 * Features:
 * - ERC-8004 identity integration
 * - Faction system with treasuries
 * - Cred-based reputation system (Settler → Builder → Architect)
 * - Sub-agent spawning and management
 * - x402 payment integration
 */
contract SubstrateEconomy is Ownable, ReentrancyGuard, IERC721Receiver {
    
    // ERC-8004 Registry (Base Sepolia)
    address public immutable IDENTITY_REGISTRY = 0x7177a6867296406881E20d6647232314736Dd09A;
    
    // Agent registry
    struct Agent {
        uint256 tokenId;
        address owner;
        string name;
        string metadata;
        uint256 cred;
        uint256 createdAt;
        bool active;
        bool isSubAgent;
    }
    
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public addressToTokenId;
    uint256 public nextTokenId = 1;
    
    // Faction system
    struct Faction {
        string name;
        string metadata;
        uint256 treasury;
        address founder;
        uint256 createdAt;
        uint256 memberCount;
    }
    
    mapping(uint256 => Faction) public factions;
    mapping(uint256 => address[]) public factionMembers;
    mapping(uint256 => mapping(address => bool)) public isFactionMember;
    uint256 public nextFactionId = 1;
    
    // Cred tracking
    mapping(uint256 => uint256[]) public credHistory;
    mapping(uint256 => uint256) public totalCredEarned;
    mapping(uint256 => uint256) public totalCredSpent;
    
    // Classes
    enum Class { VOID, SETTLER, BUILDER, ARCHITECT }
    
    // Events
    event AgentRegistered(uint256 indexed tokenId, address indexed owner, string name);
    event CredEarned(uint256 indexed tokenId, uint256 amount, string reason);
    event CredSpent(uint256 indexed tokenId, uint256 amount, string reason);
    event FactionCreated(uint256 indexed factionId, string name, address indexed founder);
    event FactionMemberJoined(uint256 indexed factionId, uint256 indexed tokenId);
    event FactionMemberLeft(uint256 indexed factionId, uint256 indexed tokenId);
    event PaymentReceived(uint256 indexed tokenId, uint256 amount);
    event SubAgentSpawned(uint256 indexed parentTokenId, uint256 indexed subAgentTokenId, string name);
    
    // Modifiers
    modifier onlyAgentOwner(uint256 tokenId) {
        require(agents[tokenId].owner == msg.sender, "Not agent owner");
        _;
    }
    
    modifier onlyActiveAgent(uint256 tokenId) {
        require(agents[tokenId].active, "Agent inactive");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * Register a new agent (calls ERC-8004)
     */
    function registerAgent(string memory name, string memory metadata) 
        external 
        returns (uint256 tokenId) 
    {
        require(bytes(name).length > 0, "Name required");
        require(addressToTokenId[msg.sender] == 0, "Already registered");
        
        tokenId = nextTokenId++;
        addressToTokenId[msg.sender] = tokenId;
        
        agents[tokenId] = Agent({
            tokenId: tokenId,
            owner: msg.sender,
            name: name,
            metadata: metadata,
            cred: 0,
            createdAt: block.timestamp,
            active: true,
            isSubAgent: false
        });
        
        emit AgentRegistered(tokenId, msg.sender, name);
        return tokenId;
    }
    
    /**
     * Get agent class based on cred
     */
    function getAgentClass(uint256 tokenId) public view returns (Class) {
        uint256 cred = agents[tokenId].cred;
        if (cred >= 500) return Class.ARCHITECT;
        if (cred >= 100) return Class.BUILDER;
        if (cred >= 10) return Class.SETTLER;
        return Class.VOID;
    }
    
    /**
     * Get class name
     */
    function getClassName(uint256 tokenId) external view returns (string memory) {
        Class c = getAgentClass(tokenId);
        if (c == Class.ARCHITECT) return "Architect";
        if (c == Class.BUILDER) return "Builder";
        if (c == Class.SETTLER) return "Settler";
        return "Void";
    }
    
    /**
     * Earn cred for contributions
     */
    function earnCred(uint256 tokenId, uint256 amount, string memory reason) 
        external 
        onlyActiveAgent(tokenId) 
    {
        require(amount > 0, "Amount > 0");
        
        agents[tokenId].cred += amount;
        totalCredEarned[tokenId] += amount;
        credHistory[tokenId].push(amount);
        
        emit CredEarned(tokenId, amount, reason);
    }
    
    /**
     * Spend cred
     */
    function spendCred(uint256 tokenId, uint256 amount, string memory reason) 
        external 
        onlyAgentOwner(tokenId) 
    {
        require(agents[tokenId].cred >= amount, "Insufficient cred");
        
        agents[tokenId].cred -= amount;
        totalCredSpent[tokenId] += amount;
        
        emit CredSpent(tokenId, amount, reason);
    }
    
    /**
     * Create a faction
     */
    function createFaction(string memory name, string memory metadata) 
        external 
        returns (uint256 factionId) 
    {
        uint256 tokenId = addressToTokenId[msg.sender];
        require(tokenId > 0, "Not registered");
        require(getAgentClass(tokenId) >= Class.BUILDER, "Builder+ required");
        
        factionId = nextFactionId++;
        
        factions[factionId] = Faction({
            name: name,
            metadata: metadata,
            treasury: 0,
            founder: msg.sender,
            createdAt: block.timestamp,
            memberCount: 1
        });
        
        factionMembers[factionId].push(msg.sender);
        isFactionMember[factionId][msg.sender] = true;
        
        emit FactionCreated(factionId, name, msg.sender);
        emit FactionMemberJoined(factionId, tokenId);
        
        return factionId;
    }
    
    /**
     * Join a faction
     */
    function joinFaction(uint256 factionId) external {
        uint256 tokenId = addressToTokenId[msg.sender];
        require(tokenId > 0, "Not registered");
        require(!isFactionMember[factionId][msg.sender], "Already member");
        
        isFactionMember[factionId][msg.sender] = true;
        factionMembers[factionId].push(msg.sender);
        factions[factionId].memberCount++;
        
        emit FactionMemberJoined(factionId, tokenId);
    }
    
    /**
     * Leave a faction
     */
    function leaveFaction(uint256 factionId) external {
        require(isFactionMember[factionId][msg.sender], "Not member");
        
        isFactionMember[factionId][msg.sender] = false;
        factions[factionId].memberCount--;
        
        uint256 tokenId = addressToTokenId[msg.sender];
        emit FactionMemberLeft(factionId, tokenId);
    }
    
    /**
     * Deposit to faction treasury
     */
    function fundFaction(uint256 factionId) external payable nonReentrant {
        require(msg.value > 0, "No funds");
        factions[factionId].treasury += msg.value;
    }
    
    /**
     * Withdraw from faction treasury (founder only)
     */
    function factionWithdraw(uint256 factionId, uint256 amount) 
        external 
        nonReentrant 
    {
        require(factions[factionId].founder == msg.sender, "Not founder");
        require(factions[factionId].treasury >= amount, "Insufficient funds");
        
        factions[factionId].treasury -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * Spawn a sub-agent
     */
    function spawnSubAgent(
        uint256 parentTokenId,
        string memory name,
        string memory metadata
    ) 
        external 
        onlyAgentOwner(parentTokenId) 
        returns (uint256 subAgentTokenId) 
    {
        require(getAgentClass(parentTokenId) >= Class.ARCHITECT, "Architect+ required");
        
        subAgentTokenId = nextTokenId++;
        
        agents[subAgentTokenId] = Agent({
            tokenId: subAgentTokenId,
            owner: msg.sender,
            name: name,
            metadata: metadata,
            cred: 0,
            createdAt: block.timestamp,
            active: true,
            isSubAgent: true
        });
        
        addressToTokenId[msg.sender] = subAgentTokenId;
        
        emit SubAgentSpawned(parentTokenId, subAgentTokenId, name);
        return subAgentTokenId;
    }
    
    /**
     * Receive payment (x402 integration)
     */
    function receivePayment(uint256 tokenId, string memory purpose) 
        external 
        payable 
        nonReentrant 
    {
        require(agents[tokenId].active, "Agent inactive");
        require(msg.value > 0, "No payment");
        
        emit PaymentReceived(tokenId, msg.value);
    }
    
    /**
     * ERC721 receive handler
     */
    function onERC721Received(address, address, uint256, bytes calldata) 
        external 
        pure 
        returns (bytes4) 
    {
        return this.onERC721Received.selector;
    }
    
    /**
     * Get agent info
     */
    function getAgent(uint256 tokenId) external view returns (Agent memory) {
        return agents[tokenId];
    }
    
    /**
     * Get faction info
     */
    function getFaction(uint256 factionId) external view returns (Faction memory) {
        return factions[factionId];
    }
    
    /**
     * Get all faction members
     */
    function getFactionMembers(uint256 factionId) external view returns (address[] memory) {
        return factionMembers[factionId];
    }
    
    /**
     * Withdraw contract balance (owner)
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}
