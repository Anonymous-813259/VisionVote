let safeVoteABI;
let safeVoteAddress;
let safeVoteContract;
let currentAccount;
let accounts;
let district;
let state;
let hash;
let error;
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

document.querySelector('#voter-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const aadhaar = document.getElementById('aadhaar').value.trim();
    const voterID = document.getElementById('voter-id').value.trim();
    district = document.getElementById('district').value.trim();
    state = document.getElementById('state').value.trim();
    const successMessage = document.querySelector(".success-message");
    const errorMessage = document.querySelector('.error-message');
    let valid = true;
    // Aadhaar validation
    // if (!/^\d{12}$/.test(aadhaar)) {
    //     valid = false;
    //     showError(aadhaarInput, "Aadhaar number must be 12 digits");
    // } else {
    //     removeError(aadhaarInput);
    // }

    // Voter ID validation
    // if (!/^[a-zA-Z0-9]+$/.test(voterID)) {
    //     valid = false;
    //     showError(voterIdInput, "Voter ID must be alphanumeric");
    // } else {
    //     removeError(voterIdInput);
    // }

    // District validation
    // if (!district) {
    //     valid = false;
    //     showError(districtSelect, "Please select your district");
    // } else {
    //     removeError(districtSelect);
    // }

    // State validation
    // if (!state) {
    //     valid = false;
    //     showError(stateSelect, "Please select your state");
    // } else {
    //     removeError(stateSelect);
    // }

    if(valid){
        const res = await fetch('/generate_hash', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({value: aadhaar.concat(" ", voterID)})
        });
        if(res.ok){
            const data = await res.json();
            hash = data.result;
            console.log(hash,district,state);
            try {
                // Simulate the transaction
                await web3.eth.call({
                    from: currentAccount,
                    to: safeVoteAddress,
                    data: safeVoteContract.methods.registerVoter(hash, district, state, aadhaar, voterID).encodeABI(),
                });
                // If call succeeds, then proceed with the transaction
                const tx = {
                    from: currentAccount,
                    to: safeVoteAddress,
                    data: safeVoteContract.methods.registerVoter(hash, district, state, aadhaar, voterID).encodeABI(),
                };
                const txHash = await web3.eth.sendTransaction(tx);
                console.log("Transaction Receipt: ",txHash);
                alert("Voter Registered Successfully");
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

document.getElementById('state').addEventListener('change', populateDistrict);
