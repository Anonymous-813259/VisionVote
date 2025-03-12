let safeVoteABI;
let safeVoteAddress;
let safeVoteContract;
let currentAccount;
let hash;
let error;

async function initContract() {
    if(window.ethereum){
        web3 = new Web3(window.ethereum);
        const res = await fetch('/SafeVote.json');
        const data = await res.json();
        safeVoteABI = data['abi'];
        safeVoteAddress = data['networks']['5777']['address'];
        safeVoteContract = new web3.eth.Contract(safeVoteABI, safeVoteAddress);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
    }
    else{
        alert("MetaMask is not detected. Please install it.");
        window.location.href="/index";
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

document.querySelector('#loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const aadhaar = document.getElementById('aadhaar').value.trim();
    const id = document.getElementById('voterId').value.trim();
    let valid = true;

    if(valid){
        const res = await fetch('/generate_hash', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({value: aadhaar.concat(" ", id)}),
        });
        if(res.ok){
            data = await res.json();
            hash = data.result;
            const voteAddress = await safeVoteContract.methods.voterAddressMap(hash).call();
            currentAddress = await web3.utils.toChecksumAddress(currentAccount);
            console.log(hash, voteAddress, currentAddress);
            const proceed = await safeVoteContract.methods.votingOpen().call();
            if(proceed){
                const contractResponse = await safeVoteContract.methods.checkRegister(hash).call({from: currentAddress});
                if(contractResponse == 'VOTER NOT REGISTERED'){
                    alert(contractResponse);
                    window.location.href = '/category';
                }
                else if(contractResponse == 'VOTER REGISTERED WITH DIFFERENT ADDRESS'){
                    alert(contractResponse);
                }
                else{
                    // alert(contractResponse);
                    const voterDetails = await safeVoteContract.methods.voterDetailsMap(currentAddress).call();
                    if(voterDetails['hasVoted']==false){
                        window.location.href = '/vote/'+hash;
                    }
                    else{
                        alert("VOTER ALREADY VOTED");
                        window.location.href = '/category';
                    }
                }
            }
            else{
                alert('Still Voting is not opened!!');
                window.location.href = '/category';
            }
        }
        else{
            error = await res.json();
            alert("Got Error while generating hash");
            console.error("Error: ",error.message || 'Unkown Error - ',error);
        }
    }
    else{
        alert('Please fill all fields correctly.');
    }
})

initContract();
