import { useState, useContext, useEffect } from 'react';
import Web3Context from './Web3Context';
import ABI from './MyCollectibleABI.json'; // Make sure to save your contract ABI here

const contractAddress = "0x75bfc854AC6e5bCe2D9cDAd5534D68183E72a756";

const MintNFT = () => {
    const { web3, account } = useContext(Web3Context);
    const [mintedTokens, setMintedTokens] = useState([]);
    const [totalSupply, setTotalSupply] = useState(0);
    const [maxSupply, setMaxSupply] = useState(10);
    const [tokensMintedByUser, setTokensMintedByUser] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (web3 && account) {
            const initialize = async () => {
                await fetchTotalSupply();
                await fetchTokensMintedByUser();
                await fetchAllMintedTokens();
            };
            initialize();
        }
    }, [web3, account]);

    const fetchTotalSupply = async () => {
        try {
            const contract = new web3.eth.Contract(ABI, contractAddress);
            const supply = await contract.methods.totalSupply().call();
            setTotalSupply(Number(supply));
        } catch (error) {
            console.error("Error fetching total supply:", error);
        }
    };

    const fetchTokensMintedByUser = async () => {
        try {
            if (!account) return;
            const contract = new web3.eth.Contract(ABI, contractAddress);
            const mintedByUser = await contract.methods.tokensMinted(account).call();
            setTokensMintedByUser(Number(mintedByUser));
        } catch (error) {
            console.error("Error fetching tokens minted by user:", error);
        }
    };

    const fetchAllMintedTokens = async () => {
        try {
            const contract = new web3.eth.Contract(ABI, contractAddress);
            const baseURI = process.env.REACT_APP_BASE_URI;
            const mintedTokens = [];

            for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
                const response = await fetch(`${baseURI}${tokenId}`);
                if (response.ok) {
                    const metadata = await response.json();
                    const owner = await contract.methods.ownerOf(tokenId).call();
                    mintedTokens.push({ ...metadata, tokenId, owner });
                } else {
                    console.error(`Error fetching metadata for token ${tokenId}`);
                }
            }

            setMintedTokens(mintedTokens);
        } catch (error) {
            console.error("Error fetching all minted tokens:", error);
        }
    };

    const mint = async () => {
        if (!web3 || !account) {
            alert('Please connect to MetaMask');
            return;
        }

        const networkId = await web3.eth.net.getId();
        if (Number(networkId) !== 11155111) { // Sepolia network ID
            alert('Please switch to the Sepolia network');
            return;
        }

        if (tokensMintedByUser >= 2) {
            alert('You can only mint up to 2 NFTs');
            return;
        }

        const contract = new web3.eth.Contract(ABI, contractAddress);
        const mintPrice = web3.utils.toWei("0.01", "ether");

        try {
            setLoading(true);
            const receipt = await contract.methods.mint().send({ from: account, value: mintPrice });
            const tokenId = await contract.methods.totalSupply().call();
            await fetchTokenMetadata(Number(tokenId), receipt.transactionHash);
            await fetchTotalSupply();
            await fetchTokensMintedByUser();
            await fetchAllMintedTokens(); // Refresh the list of all minted tokens
        } catch (error) {
            console.error(error);
            alert('Minting failed');
        } finally {
            setLoading(false);
        }
    };

    const fetchTokenMetadata = async (tokenId, transactionHash) => {
        try {
            const baseURI = process.env.REACT_APP_BASE_URI;
            const response = await fetch(`${baseURI}${tokenId}`);
            if (response.ok) {
                const metadata = await response.json();
                setMintedTokens(prevTokens => [...prevTokens, { ...metadata, transactionHash, tokenId }]);
            } else {
                console.error(`Error fetching metadata for token ${tokenId}`);
            }
        } catch (error) {
            console.error("Error fetching token metadata:", error);
        }
    };

    const truncateAddress = (address) => {
        return `${address.substring(0, 10)}...`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-xl">
                <h1 className="text-3xl font-bold mb-4">NFT Artworks</h1>
                <p className="mb-4">Purchase unique NFTs by paying 0.01 ETH. Each user can purchase up to three times. See the total supply and already sold NFTs below.</p>
                <button
                    onClick={mint}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
                    disabled={loading}
                >
                    {loading ? 'Minting...' : 'Mint NFT'}
                </button>
                <div className="mt-4">
                    <h2 className="text-xl font-bold">Total Supply: {totalSupply}/{maxSupply}</h2>
                    <h2 className="text-xl font-bold">Your Mints: {tokensMintedByUser}/2</h2>
                </div>
                <div className="mt-4">
                    <h2 className="text-xl font-bold">Minted NFTs:</h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {mintedTokens.map((token, index) => (
                            <li key={index} className="mb-4 bg-gray-100 p-4 rounded-lg shadow-md">
                                <h3 className="font-bold">{token.name}</h3>
                                <p>{token.description}</p>
                                <img src={token.image} alt={token.name} className="w-full h-auto object-cover" />
                                <p className="mt-2">Owner: {truncateAddress(token.owner)}</p>
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${token.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500"
                                >
                                    View on Etherscan
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MintNFT;
