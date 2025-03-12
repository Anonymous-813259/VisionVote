let safeVoteABI;
let safeVoteAddress;
let safeVoteContract;
let currentAccount;
let accounts;
let chiefAadhaar;
let chiefID;
let statesAndDistricts;

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
    const res = await fetch('/state-district.json');
    if(res.ok){
        statesAndDistricts = await res.json();
        const stateSelect = document.getElementById('state');
        Object.keys(statesAndDistricts).forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.text = state;
            stateSelect.appendChild(option);
        })
    }
    else{
        error = await res.json();
        alert("Got Error while generating hash");
        console.error("Error: ",error.message || 'Unkown Error - ',error);
    }
}

async function populateDistrict() {
    const districtSelect = document.getElementById('district');
    const stateSelect = document.getElementById('state');
    const selectedState = stateSelect.value;
    // Clear any existing districts
    districtSelect.innerHTML = '<option value="">--Select District--</option>';
    if (selectedState) {
        // Enable the district select
        districtSelect.disabled = false;

        // Get the districts for the selected state
        const districts = statesAndDistricts[selectedState];

        // Populate the district dropdown
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.text = district;
            districtSelect.appendChild(option);
        });
    } else {
        // If no state is selected, disable the district select
        districtSelect.disabled = true;
    }
}

document.querySelector(".registration-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    // Get all details from web page
    const id = document.getElementById('candidate-id').value;
    const name = document.getElementById('candidate-name').value;
    const age = document.getElementById('candidate-age').value;
    const party = document.getElementById('party-affiliation').value;
    const district = document.getElementById('district').value;
    const state = document.getElementById('state').value;

    var formData = new FormData(this);

    console.log(formData);

    console.log(formData.has('image'));  // Should log 'true' if 'image' is included
    console.log(formData.get('image'));
    console.log(formData.has('partyName'));

    // var formData = new FormData();
    // var photoFile = $('#image')[0].files[0];
    // formData.append("photo", e.target.photo.files[0]);
    // formData.append("partyName", party);

    const res = await fetch('/upload', {
        method: 'POST',
        body: formData
    });
    if(res.ok){
        // Initiate Transaction
        try {
            // Simulate the transaction
            await web3.eth.call({
                from: currentAccount,
                to: safeVoteAddress,
                data: safeVoteContract.methods.registerCandidate(id, name, age, party, district, state).encodeABI(),
            });
            // If call succeeds, proceed to send the transaction.
            const tx = {
                from: currentAccount,
                to: safeVoteAddress,
                data: safeVoteContract.methods.registerCandidate(id, name, age, party, district, state).encodeABI(),
            };
            const txHash = await web3.eth.sendTransaction(tx);
            console.log("Transaction Receipt: ",txHash);
            alert("Candidate "+id+" Registered Successfully");
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

    }
    else{
        error = await res.json();
        alert("Got Error while generating hash");
        console.error("Error: ",error.message || 'Unkown Error - ',error);
    }
})

document.querySelector('.update-chief').addEventListener('submit', async function (e) {
    e.preventDefault();
    // Get the details from the web page
    const newAadhaar = document.getElementById('new-aadhaar').value;
    const newID = document.getElementById('new-id').value;

    chiefAadhaar = await safeVoteContract.methods.chiefAadhaar().call();
    chiefID = await safeVoteContract.methods.chiefID().call();
    if(newAadhaar == chiefAadhaar || newID == chiefID){
        alert("New details are similar to the past details");
        return ;
    }

    // Initiate the transaction
    try {
        // Simulate the transaction
        await web3.eth.call({
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.updateDetails(newAadhaar, newID).encodeABI(),
        });
        // If call succeeds, then proceed with the transaction
        const tx = {
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.updateDetails(newAadhaar, newID).encodeABI(),
        };
        const txHash = await web3.eth.sendTransaction(tx);
        console.log("Transaction Receipt: ",txHash);
        alert("Chief Details Updated Successfully");
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
})

async function startCandidateRegistration() {
    // Initiate the transaction
    try {
        // Simulate the transaction
        await web3.eth.call({
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setCandidateRegistration().encodeABI(),
        });
        // If call succeeds, then proceed with the transaction
        const tx = {
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setCandidateRegistration().encodeABI(),
        };
        const txHash = await web3.eth.sendTransaction(tx);
        console.log("Transaction Receipt: ",txHash);
        let receipt = null;
        alert("Candidate Registration Time Started!");
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
}

async function startVoterRegistration() {
    // Initiate the transaction
    try {
        // Simulate the transaction
        await web3.eth.call({
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setVoterRegistration().encodeABI(),
        });
        // If call succeeds, then proceed with the transaction
        const tx = {
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setVoterRegistration().encodeABI(),
        };
        const txHash = await web3.eth.sendTransaction(tx);
        console.log("Transaction Receipt: ",txHash);
        alert("Voter Registration Time Started!");
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
}

async function startVoting() {
    // Initiate the transaction
    try {
        // Simulate the transaction
        await web3.eth.call({
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setVoting().encodeABI(),
        });
        // If call succeeds, then proceed with the transaction
        const tx = {
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setVoting().encodeABI(),
        };
        const txHash = await web3.eth.sendTransaction(tx);
        console.log("Transaction Receipt: ",txHash);
        alert("Voting Time Started!");
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
}

async function startResultView() {
    // Initiate the transaction
    try {
        // Simulate the transaction
        await web3.eth.call({
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setResultView().encodeABI(),
        });
        // If call succeeds, then proceed with the transaction
        const tx = {
            from: currentAccount,
            to: safeVoteAddress,
            data: safeVoteContract.methods.setResultView().encodeABI(),
        };
        const txHash = await web3.eth.sendTransaction(tx);
        console.log("Transaction Receipt: ",txHash);
        alert("Election ended successfully!\nYou can view the results");
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
}

async function goBack() {
    window.location.href = "/category";
}

initContract();

document.getElementById('state').addEventListener('change', populateDistrict);
