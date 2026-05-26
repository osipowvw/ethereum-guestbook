// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EthereumGuestbook
/// @notice Simple decentralized guestbook. Users can publish messages and optionally attach ETH.
contract EthereumGuestbook {
    struct GuestMessage {
        address author;
        string text;
        uint256 amount;
        uint256 timestamp;
    }

    address public owner;
    GuestMessage[] private messages;

    event MessageWritten(
        address indexed author,
        string text,
        uint256 amount,
        uint256 timestamp
    );

    event FundsWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Adds a new message to the guestbook.
    /// @dev The message is limited to 280 bytes for predictable gas usage.
    /// @param text Message text entered by the user.
    function writeMessage(string calldata text) external payable {
        uint256 length = bytes(text).length;
        require(length > 0, "Message cannot be empty");
        require(length <= 280, "Message is too long");

        messages.push(
            GuestMessage({
                author: msg.sender,
                text: text,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );

        emit MessageWritten(msg.sender, text, msg.value, block.timestamp);
    }

    /// @notice Returns the total number of stored messages.
    function getMessagesCount() external view returns (uint256) {
        return messages.length;
    }

    /// @notice Returns all messages. Suitable for a small educational project.
    function getAllMessages() external view returns (GuestMessage[] memory) {
        return messages;
    }

    /// @notice Returns the contract balance in wei.
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Transfers accumulated ETH to the contract owner.
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(owner, balance);
    }
}
