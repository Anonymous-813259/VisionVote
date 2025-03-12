async function connect() {
    if(window.ethereum){
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
    }
    else{
        alert("MetaMask is not detected. Please install it.");
        return ;
    }
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', function (accounts) {
            alert("Account change to: "+accounts[0]);
            console.log("Accounts changed:", accounts);
        });
    
        window.ethereum.on('chainChanged', function (chainId) {
            console.log("Network changed:", chainId);
        });
    }
    window.location.href="/category";
}