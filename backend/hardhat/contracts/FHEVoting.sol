// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";

contract FHEVotingCreatorFinalizer {
    struct Proposal {
        string title;
        uint256 endTime;
        euint8[] votes; // encrypted vote handles (0-3)
        bool finalized;
        uint256[4] results; // plaintext results (set after creator decrypts)
        address creator;
    }

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed proposalId, string title, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bytes32 handle);
    event ResultsFinalized(uint256 indexed proposalId, uint256[4] results, address finalizedBy);

    modifier onlyOpen(uint256 proposalId) {
        require(block.timestamp < proposals[proposalId].endTime, "voting closed");
        _;
    }

    modifier onlyEnded(uint256 proposalId) {
        require(block.timestamp >= proposals[proposalId].endTime, "voting not ended");
        _;
    }

    modifier onlyCreator(uint256 proposalId) {
        require(msg.sender == proposals[proposalId].creator, "only creator");
        _;
    }

    /// Create a proposal with `durationSeconds` countdown
    function createProposal(string calldata title, uint256 durationSeconds) external returns (uint256) {
        require(durationSeconds > 0, "duration must be > 0");
        Proposal storage p = proposals.push();
        uint256 pid = proposals.length - 1;
        p.title = title;
        p.endTime = block.timestamp + durationSeconds;
        p.creator = msg.sender;
        emit ProposalCreated(pid, title, p.endTime);
        return pid;
    }

    /// Cast an encrypted vote (0-3 as external euint8). Records the handle for later decryption.
    function castVote(uint256 proposalId, externalEuint8 voteExternal, bytes calldata attestation) 
        external 
        onlyOpen(proposalId) 
    {
        require(!hasVoted[proposalId][msg.sender], "already voted");
        
        // Convert external input to internal euint8 handle
        euint8 voteHandle = FHE.fromExternal(voteExternal, attestation);
        
        // Mark as voted
        hasVoted[proposalId][msg.sender] = true;
        
        // Store encrypted vote
        proposals[proposalId].votes.push(voteHandle);
        
        emit VoteCast(proposalId, msg.sender, FHE.toBytes32(voteHandle));
    }

    /// Get encrypted votes for creator to decrypt off-chain
    /// Only creator can access, only after voting ends
    function getEncryptedVotes(uint256 proposalId) 
        external 
        onlyEnded(proposalId) 
        onlyCreator(proposalId)
        returns (bytes32[] memory) 
    {
        Proposal storage p = proposals[proposalId];
        uint256 n = p.votes.length;
        
        bytes32[] memory handles = new bytes32[](n);
        for (uint256 i = 0; i < n; ++i) {
            // Allow creator to access encrypted votes
            FHE.allowThis(p.votes[i]);
            FHE.allow(p.votes[i], msg.sender);
            handles[i] = FHE.toBytes32(p.votes[i]);
        }
        
        return handles;
    }

    /// Creator submits plaintext results after off-chain decryption
    /// Results array should be [count_option0, count_option1, count_option2, count_option3]
    function finalizeResults(uint256 proposalId, uint256[4] calldata results) 
        external 
        onlyEnded(proposalId) 
        onlyCreator(proposalId)
    {
        Proposal storage p = proposals[proposalId];
        require(!p.finalized, "already finalized");
        require(p.votes.length > 0, "no votes cast");

        // Verify results add up to total votes
        uint256 totalVotes = results[0] + results[1] + results[2] + results[3];
        require(totalVotes == p.votes.length, "results total mismatch");

        // Store results
        p.results = results;
        p.finalized = true;

        emit ResultsFinalized(proposalId, results, msg.sender);
    }

    /// Get finalized results
    function getResults(uint256 proposalId) external view returns (uint256[4] memory) {
        require(proposals[proposalId].finalized, "not finalized yet");
        return proposals[proposalId].results;
    }

    /// Get proposal metadata
    function getProposal(uint256 proposalId) 
        external 
        view 
        returns (string memory title, uint256 endTime, uint256 voteCount, bool finalized) 
    {
        Proposal storage p = proposals[proposalId];
        return (p.title, p.endTime, p.votes.length, p.finalized);
    }

    /// Get total proposal count
    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }
}
