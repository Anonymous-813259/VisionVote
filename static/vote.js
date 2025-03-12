let safeVoteABI;
let safeVoteAddress;
let safeVoteContract;
let currentAccount;
let hash;
let error;
let candidateList = [];
let district;
let state;
let selectedID;
let selectedName;

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
    console.log(safeVoteContract);
    const candidates = await safeVoteContract.methods.getCandidateList().call();
    const voterAddress = await web3.utils.toChecksumAddress(currentAccount);
    const voterDetails = await safeVoteContract.methods.voterDetailsMap(voterAddress).call();
    console.log(voterDetails);
    district = voterDetails['district'];
    state = voterDetails['state'];
    console.log(candidates);
    candidates.forEach(element => {
        if(element['district']==district && element['state']==state){
            let candidateJSON = {
                id: element['id'],
                name: element['name'],
                age: element['age'],
                partyName: element['partyName'],
                district: element['district'],
                state: element['state']
            };
            candidateList.push(candidateJSON);
        }
    });
    console.log("Candidate List: - ", candidateList);

    const candidateContainer = document.getElementById('candidates');
    candidateList.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.innerHTML = `
        <img src="/uploads/${candidate.partyName}.jpg" alt="${candidate.partyName}" class="candidate-photo">
        <h3><strong style="font-size: 18px;">ID</strong>: <em style="font-size: 24px;">${candidate.id}</em></h3>
        <p><strong>Name</strong>: <i>${candidate.name}</i></p>
        <p><strong>Party Name</strong>: <i>${candidate.partyName}</i></p>
        <button class="vote-btn" data-id="${candidate.id}" data-name="${candidate.name}"> Vote for ${candidate.name}</button>
        `;
        candidateContainer.appendChild(card);
    })
}

document.getElementById("candidates").addEventListener('click', async function (e) {
    if(e.target.classList.contains("vote-btn")){
        selectedName = e.target.dataset.name;
        selectedID = e.target.dataset.id;
        console.log(e.target.dataset);
        console.log(e.target);
        document.getElementById("modal-text").innerHTML = `<i>Are you sure you want to vote for <strong>${selectedName} (${selectedID})</strong></i>?`;
        document.getElementById("modal").classList.remove("hidden");
    }
})

document.getElementById("confirm-vote").addEventListener("click", async function () {
    try {
        // Simulate the transaction
        await web3.eth.call({
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.vote(selectedID).encodeABI(),
        });
        // If call succeeds, then proceed with the transaction
        const tx = {
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.vote(selectedID).encodeABI(),
        };
        const txHash = await web3.eth.sendTransaction(tx);
        console.log("Transaction Receipt: ",txHash);
        alert('Vote confirmed to',selectedName,'with ID',selectedID);
        document.getElementById('modal').classList.add("hidden");
        window.location.href = '/category';
    } catch (error) {
        const ind = error.message.indexOf('revert');
        if(ind!=-1){
            const msg = ((error.message.split('\n'))[2].split(':'));
            alert(msg[msg.length-1].slice(7, -2));
            console.log(msg[msg.length-1].slice(7,-2));
        }
        else{
            alert("You got an anonymous Transaction Error");
            console.log("Transaction Error: ",error);
        }
    }
});

document.getElementById("cancel-vote").addEventListener("click", () => {
    document.getElementById("modal").classList.add("hidden");
});

initContract();
