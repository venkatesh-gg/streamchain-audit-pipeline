const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditLogger", function () {
  let AuditLogger;
  let auditLogger;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    AuditLogger = await ethers.getContractFactory("AuditLogger");
    auditLogger = await AuditLogger.deploy();
    await auditLogger.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await auditLogger.owner()).to.equal(owner.address);
    });

    it("Should start with zero entries", async function () {
      expect(await auditLogger.getTotalEntries()).to.equal(0);
    });
  });

  describe("Audit Entry Creation", function () {
    it("Should create an audit entry successfully", async function () {
      const eventType = "USER_LOGIN";
      const userId = "user123";
      const dataHash = "0x1234567890abcdef";
      const ipfsHash = "QmXoYpKmNaSkR3bXxvweCUJZvJ8H6yKmNaSkR3bXxvweC";

      const tx = await auditLogger.createAuditEntry(eventType, userId, dataHash, ipfsHash);
      const receipt = await tx.wait();

      expect(await auditLogger.getTotalEntries()).to.equal(1);

      const entry = await auditLogger.getAuditEntry(1);
      expect(entry.eventType).to.equal(eventType);
      expect(entry.userId).to.equal(userId);
      expect(entry.dataHash).to.equal(dataHash);
      expect(entry.ipfsHash).to.equal(ipfsHash);
      expect(entry.submitter).to.equal(owner.address);
      expect(entry.verified).to.be.false;
    });

    it("Should emit AuditEntryCreated event", async function () {
      const eventType = "USER_LOGIN";
      const userId = "user123";
      const dataHash = "0x1234567890abcdef";
      const ipfsHash = "QmXoYpKmNaSkR3bXxvweCUJZvJ8H6yKmNaSkR3bXxvweC";

      await expect(auditLogger.createAuditEntry(eventType, userId, dataHash, ipfsHash))
        .to.emit(auditLogger, "AuditEntryCreated")
        .withArgs(1, eventType, userId, dataHash, ipfsHash, owner.address);
    });

    it("Should revert with empty event type", async function () {
      await expect(
        auditLogger.createAuditEntry("", "user123", "0x1234", "QmXoYp")
      ).to.be.revertedWith("Event type cannot be empty");
    });

    it("Should revert with empty user ID", async function () {
      await expect(
        auditLogger.createAuditEntry("LOGIN", "", "0x1234", "QmXoYp")
      ).to.be.revertedWith("User ID cannot be empty");
    });
  });

  describe("Entry Verification", function () {
    beforeEach(async function () {
      await auditLogger.createAuditEntry("LOGIN", "user123", "0x1234", "QmXoYp");
    });

    it("Should verify entry successfully by owner", async function () {
      await auditLogger.verifyEntry(1);
      const entry = await auditLogger.getAuditEntry(1);
      expect(entry.verified).to.be.true;
    });

    it("Should emit AuditEntryVerified event", async function () {
      await expect(auditLogger.verifyEntry(1))
        .to.emit(auditLogger, "AuditEntryVerified")
        .withArgs(1, owner.address);
    });

    it("Should revert verification by non-owner", async function () {
      await expect(auditLogger.connect(addr1).verifyEntry(1))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert double verification", async function () {
      await auditLogger.verifyEntry(1);
      await expect(auditLogger.verifyEntry(1))
        .to.be.revertedWith("Entry already verified");
    });
  });

  describe("Data Retrieval", function () {
    beforeEach(async function () {
      await auditLogger.createAuditEntry("LOGIN", "user123", "0x1234", "QmXoYp1");
      await auditLogger.createAuditEntry("LOGOUT", "user123", "0x5678", "QmXoYp2");
      await auditLogger.createAuditEntry("LOGIN", "user456", "0x9abc", "QmXoYp3");
    });

    it("Should get entries by user ID", async function () {
      const userEntries = await auditLogger.getEntriesByUser("user123");
      expect(userEntries.length).to.equal(2);
      expect(userEntries[0]).to.equal(1);
      expect(userEntries[1]).to.equal(2);
    });

    it("Should get entries by event type", async function () {
      const loginEntries = await auditLogger.getEntriesByEventType("LOGIN");
      expect(loginEntries.length).to.equal(2);
      expect(loginEntries[0]).to.equal(1);
      expect(loginEntries[1]).to.equal(3);
    });

    it("Should get latest entries", async function () {
      const latestEntries = await auditLogger.getLatestEntries(2);
      expect(latestEntries.length).to.equal(2);
      expect(latestEntries[0].id).to.equal(3);
      expect(latestEntries[1].id).to.equal(2);
    });
  });

  describe("Data Integrity", function () {
    beforeEach(async function () {
      await auditLogger.createAuditEntry("LOGIN", "user123", "0x1234567890abcdef", "QmXoYp");
    });

    it("Should verify data integrity correctly", async function () {
      const isValid = await auditLogger.verifyDataIntegrity(1, "0x1234567890abcdef");
      expect(isValid).to.be.true;
    });

    it("Should detect data corruption", async function () {
      const isValid = await auditLogger.verifyDataIntegrity(1, "0x1234567890abcdff");
      expect(isValid).to.be.false;
    });
  });

  describe("Pause Functionality", function () {
    it("Should pause and unpause contract", async function () {
      await auditLogger.pause();
      expect(await auditLogger.paused()).to.be.true;

      await auditLogger.unpause();
      expect(await auditLogger.paused()).to.be.false;
    });

    it("Should only allow owner to pause", async function () {
      await expect(auditLogger.connect(addr1).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});