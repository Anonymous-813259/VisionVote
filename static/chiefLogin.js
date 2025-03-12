let safeVoteABI;
let safeVoteContract;
let safeVoteAddress;
let chiefAadhaar;
let chiefAddress;
let chiefID;
let currentAccount;

async function initContract() {
    if(window.ethereum){
        web3 = new Web3(window.ethereum);
        // const res = await fetch('../build/contracts/SafeVote.json');
        const res = await fetch('/SafeVote.json');
        const data = await res.json();
        safeVoteABI = data['abi'];
        safeVoteAddress = data['networks']['5777']['address'];
        safeVoteContract = new web3.eth.Contract(safeVoteABI, safeVoteAddress);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        console.log('SafeVote Contract: ',safeVoteContract);
    }
    else{
        alert("MetaMask is not detected. Please install it.");
        window.location.href = '/index';
    }
    if(window.ethereum){
        window.ethereum.on('accountsChanged', function (accounts) {
            alert("Account change to: "+accounts[0]);
            currentAccount = accounts[0];
            console.log("Accounts changed:", accounts);
            window.location.href = '/category';
        });
    
        window.ethereum.on('chainChanged', function (chainId) {
            console.log("Network changed:", chainId);
        });
    }
}

document.querySelector('.login-form').addEventListener('submit', async function (e){
    e.preventDefault();
    const aadhaar = document.getElementById('aadhaar').value.trim();
    const id = document.getElementById('chief-id').value.trim();
    const errorMessage = document.getElementById('error-message-display');
    errorMessage.textContent = '';
    let valid = true;
    // Aadhaar validation
    if (!/^\d{12}$/.test(aadhaar)) {
        document.getElementById("aadhaar-error").style.display = "block";
        valid = false;
    } else {
        document.getElementById("aadhaar-error").style.display = "none";
    }
    // Chief ID validation
    if (!/^[A-Z0-9]+$/.test(id)) {
        document.getElementById("chief-id-error").style.display = "block";
        valid = false;
    } else {
        document.getElementById("chief-id-error").style.display = "none";
    }
    if(valid){
        chiefAadhaar = await safeVoteContract.methods.chiefAadhaar().call();
        chiefID = await safeVoteContract.methods.chiefID().call();
        if(chiefAadhaar == aadhaar && chiefID == id){
            chiefAddress = await safeVoteContract.methods.chief().call();
            console.log(chiefAddress.toLowerCase() == currentAccount.toLowerCase());
            if(chiefAddress == "0x0000000000000000000000000000000000000000"){
                // Preparing the transaction
                try {
                    // simulate the transaction
                    await web3.eth.call({
                        from: currentAccount,
                        to: safeVoteAddress,
                        data: safeVoteContract.methods.setChief(aadhaar, id).encodeABI(),
                    });
                    // Prepare the transaction object
                    const tx = {
                        from: currentAccount,
                        to: safeVoteAddress,
                        data: safeVoteContract.methods.setChief(aadhaar, id).encodeABI(),
                    };
                    const txHash = await web3.eth.sendTransaction(tx);
                    console.log('Transaction Hash: ',txHash);
                    errorMessage.textContent = '';
                    alert("Login Success");
                    window.location.href = '/chiefAction';
                } catch (error) {
                    const ind = error.message.indexOf('revert');
                    if(ind!=-1){
                        const msg = ((error.message.split('\n'))[2].split(':'));
                        console.log(msg[msg.length-1].slice(7,-2));
                        alert(msg[msg.length-1].slice(7,-2));
                    }
                    else{
                        console.log("Transaction Error: ",error);
                    }
                    return ;
                }
            }
            else if(chiefAddress.toLowerCase() != currentAccount.toLowerCase()){
                errorMessage.textContent = 'Invalid login address!';
            }
            else{
                errorMessage.textContent = '';
                alert("Login Success");
                window.location.href = '/chiefAction';
            }
        }
        else{
            errorMessage.textContent = 'Invalid Credentials!';
        }
    }
})

initContract();