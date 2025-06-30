// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AuditLogger
 * @dev Smart contract for immutable audit trail logging with IPFS integration
 */
contract AuditLogger is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    struct AuditEntry {
        uint256 id;
        string eventType;
        string userId;
        string dataHash;
        string ipfsHash;
        uint256 timestamp;
        address submitter;
        bool verified;
    }

    Counters.Counter private _entryIds;
    
    mapping(uint256 => AuditEntry) public auditEntries;
    mapping(string => uint256[]) public userEntries;
    mapping(string => uint256[]) public eventTypeEntries;
    
    // Events
    event AuditEntryCreated(
        uint256 indexed entryId,
        string indexed eventType,
        string indexed userId,
        string dataHash,
        string ipfsHash,
        address submitter
    );
    
    event AuditEntryVerified(uint256 indexed entryId, address verifier);
    
    // Modifiers
    modifier validEntry(uint256 entryId) {
        require(entryId <= _entryIds.current() && entryId > 0, "Invalid entry ID");
        _;
    }

    constructor() {}

    /**
     * @dev Create a new audit entry
     * @param eventType Type of the event being logged
     * @param userId User ID associated with the event
     * @param dataHash Hash of the event data
     * @param ipfsHash IPFS hash where detailed data is stored
     */
    function createAuditEntry(
        string memory eventType,
        string memory userId,
        string memory dataHash,
        string memory ipfsHash
    ) external nonReentrant returns (uint256) {
        require(bytes(eventType).length > 0, "Event type cannot be empty");
        require(bytes(userId).length > 0, "User ID cannot be empty");
        require(bytes(dataHash).length > 0, "Data hash cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        _entryIds.increment();
        uint256 newEntryId = _entryIds.current();

        AuditEntry memory newEntry = AuditEntry({
            id: newEntryId,
            eventType: eventType,
            userId: userId,
            dataHash: dataHash,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            submitter: msg.sender,
            verified: false
        });

        auditEntries[newEntryId] = newEntry;
        userEntries[userId].push(newEntryId);
        eventTypeEntries[eventType].push(newEntryId);

        emit AuditEntryCreated(
            newEntryId,
            eventType,
            userId,
            dataHash,
            ipfsHash,
            msg.sender
        );

        return newEntryId;
    }

    /**
     * @dev Verify an audit entry (only owner)
     * @param entryId ID of the entry to verify
     */
    function verifyEntry(uint256 entryId) external onlyOwner validEntry(entryId) {
        require(!auditEntries[entryId].verified, "Entry already verified");
        
        auditEntries[entryId].verified = true;
        emit AuditEntryVerified(entryId, msg.sender);
    }

    /**
     * @dev Get audit entry by ID
     * @param entryId ID of the entry to retrieve
     */
    function getAuditEntry(uint256 entryId) 
        external 
        view 
        validEntry(entryId) 
        returns (AuditEntry memory) 
    {
        return auditEntries[entryId];
    }

    /**
     * @dev Get entries by user ID
     * @param userId User ID to search for
     */
    function getEntriesByUser(string memory userId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userEntries[userId];
    }

    /**
     * @dev Get entries by event type
     * @param eventType Event type to search for
     */
    function getEntriesByEventType(string memory eventType) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return eventTypeEntries[eventType];
    }

    /**
     * @dev Get total number of entries
     */
    function getTotalEntries() external view returns (uint256) {
        return _entryIds.current();
    }

    /**
     * @dev Get latest entries
     * @param count Number of latest entries to retrieve
     */
    function getLatestEntries(uint256 count) 
        external 
        view 
        returns (AuditEntry[] memory) 
    {
        uint256 totalEntries = _entryIds.current();
        uint256 actualCount = count > totalEntries ? totalEntries : count;
        
        AuditEntry[] memory entries = new AuditEntry[](actualCount);
        
        for (uint256 i = 0; i < actualCount; i++) {
            entries[i] = auditEntries[totalEntries - i];
        }
        
        return entries;
    }

    /**
     * @dev Verify data integrity
     * @param entryId Entry ID to verify
     * @param dataHash Expected data hash
     */
    function verifyDataIntegrity(uint256 entryId, string memory dataHash) 
        external 
        view 
        validEntry(entryId) 
        returns (bool) 
    {
        return keccak256(abi.encodePacked(auditEntries[entryId].dataHash)) == 
               keccak256(abi.encodePacked(dataHash));
    }

    /**
     * @dev Emergency pause functionality (in case of discovered vulnerabilities)
     */
    bool public paused = false;
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
}