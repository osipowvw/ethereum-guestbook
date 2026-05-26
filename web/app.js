const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "author", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "text", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "MessageWritten",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "FundsWithdrawn",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "getAllMessages",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "author", "type": "address" },
                    { "internalType": "string", "name": "text", "type": "string" },
                    { "internalType": "uint256", "name": "amount", "type": "uint256" },
                    { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
                ],
                "internalType": "struct EthereumGuestbook.GuestMessage[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getBalance",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getMessagesCount",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "text", "type": "string" }
        ],
        "name": "writeMessage",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

let provider;
let signer;
let contract;
let account;

const elements = {
    connectButton: document.getElementById("connectButton"),
    saveAddressButton: document.getElementById("saveAddressButton"),
    sendButton: document.getElementById("sendButton"),
    refreshButton: document.getElementById("refreshButton"),
    withdrawButton: document.getElementById("withdrawButton"),
    contractAddress: document.getElementById("contractAddress"),
    accountValue: document.getElementById("accountValue"),
    networkValue: document.getElementById("networkValue"),
    balanceValue: document.getElementById("balanceValue"),
    messageText: document.getElementById("messageText"),
    ethAmount: document.getElementById("ethAmount"),
    status: document.getElementById("status"),
    messagesList: document.getElementById("messagesList")
};

function setStatus(message) {
    elements.status.textContent = message;
}

function getSavedAddress() {
    return localStorage.getItem("guestbookContractAddress") || "";
}

function saveAddress(address) {
    localStorage.setItem("guestbookContractAddress", address);
}

function shortenAddress(address) {
    if (!address) return "не подключен";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function connectWallet() {
    if (!window.ethereum) {
        setStatus("MetaMask не найден. Установите расширение и обновите страницу.");
        return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    account = await signer.getAddress();

    const network = await provider.getNetwork();
    elements.accountValue.textContent = account;
    elements.networkValue.textContent = `${network.name} (${network.chainId})`;
    elements.connectButton.textContent = `Подключено: ${shortenAddress(account)}`;

    initContract();
    await loadMessages();
}

function initContract() {
    const address = elements.contractAddress.value.trim();
    if (!address) {
        setStatus("Укажите адрес развернутого контракта.");
        return;
    }

    if (!ethers.isAddress(address)) {
        setStatus("Адрес контракта имеет неверный формат.");
        return;
    }

    if (!provider || !signer) {
        setStatus("Сначала подключите MetaMask.");
        return;
    }

    saveAddress(address);
    contract = new ethers.Contract(address, CONTRACT_ABI, signer);
    setStatus("Контракт подключен.");
}

async function loadMessages() {
    if (!contract) {
        return;
    }

    try {
        const balance = await contract.getBalance();
        elements.balanceValue.textContent = `${ethers.formatEther(balance)} ETH`;

        const messages = await contract.getAllMessages();
        elements.messagesList.innerHTML = "";

        if (messages.length === 0) {
            elements.messagesList.innerHTML = "<p class='hint'>Сообщений пока нет.</p>";
            return;
        }

        [...messages].reverse().forEach((message) => {
            const date = new Date(Number(message.timestamp) * 1000).toLocaleString("ru-RU");
            const amount = ethers.formatEther(message.amount);
            const item = document.createElement("article");
            item.className = "message";
            item.innerHTML = `
                <p>${escapeHtml(message.text)}</p>
                <footer>
                    Автор: ${message.author}<br>
                    Сумма: ${amount} ETH<br>
                    Время: ${date}
                </footer>
            `;
            elements.messagesList.appendChild(item);
        });
    } catch (error) {
        setStatus(`Ошибка загрузки данных: ${error.shortMessage || error.message}`);
    }
}

async function sendMessage() {
    if (!contract) {
        setStatus("Сначала подключите контракт.");
        return;
    }

    const text = elements.messageText.value.trim();
    const ethAmount = elements.ethAmount.value.trim();

    if (!text) {
        setStatus("Введите текст сообщения.");
        return;
    }

    try {
        elements.sendButton.disabled = true;
        setStatus("Ожидание подтверждения транзакции в MetaMask...");

        const tx = await contract.writeMessage(text, {
            value: ethAmount ? ethers.parseEther(ethAmount) : 0n
        });

        setStatus(`Транзакция отправлена: ${tx.hash}. Ожидание подтверждения...`);
        await tx.wait();

        elements.messageText.value = "";
        elements.ethAmount.value = "";
        setStatus("Сообщение успешно записано в блокчейн.");
        await loadMessages();
    } catch (error) {
        setStatus(`Ошибка отправки: ${error.shortMessage || error.message}`);
    } finally {
        elements.sendButton.disabled = false;
    }
}

async function withdraw() {
    if (!contract) {
        setStatus("Сначала подключите контракт.");
        return;
    }

    try {
        elements.withdrawButton.disabled = true;
        setStatus("Ожидание подтверждения вывода средств...");
        const tx = await contract.withdraw();
        await tx.wait();
        setStatus("Средства выведены владельцу контракта.");
        await loadMessages();
    } catch (error) {
        setStatus(`Ошибка вывода: ${error.shortMessage || error.message}`);
    } finally {
        elements.withdrawButton.disabled = false;
    }
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

window.addEventListener("load", () => {
    elements.contractAddress.value = getSavedAddress();
});

elements.connectButton.addEventListener("click", connectWallet);
elements.saveAddressButton.addEventListener("click", () => {
    initContract();
    loadMessages();
});
elements.sendButton.addEventListener("click", sendMessage);
elements.refreshButton.addEventListener("click", loadMessages);
elements.withdrawButton.addEventListener("click", withdraw);

if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
}
