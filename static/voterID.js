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

initContract();



// Disable all buttons
async function disableAll() {
    document.getElementById("refresh-captcha-1").disabled = true;
    document.getElementById("verify-voter").disabled = true;
}

// Enable all buttons
async function enableAll() {
    document.getElementById("refresh-captcha-1").disabled = false;
    document.getElementById("verify-voter").disabled = false;
}

var navigation = false;

// Setup refresh captcha button
document.getElementById("refresh-captcha-1").addEventListener("click", async function () {
    // Disable all buttons
    await disableAll();

    // Setup loading animation
    document.getElementById("refresh").classList.add("hidden");
    document.getElementById("refresh-spinner").classList.remove("hidden");

    // Trigger the get_voter_captcha method
    try{
        const response = await fetch('/getVoterCaptcha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if(data.success == 'true'){
            // Set up the fresh captcha
            imageElement = document.getElementById("captcha");
            imageElement.src = '../static/'+data.folder_id+'/captcha/voter_captcha_img.png' + '?t=' + new Date().getTime(); // Add timestamp to prevent caching

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Enable all buttons
            await enableAll();
        }
        else{
            alert(`Error while refreshing captcha . . . . !
                Try Refreshing the Page . . . .`);
            console.error('Error:', error);
        }
    }
    catch(error){
        alert(`Error while refreshing captcha . . . . !
            Try Refreshing the Page . . . .`);
        console.error('Error:', error);
    }

    //Stop the animation
    document.getElementById("refresh").classList.remove("hidden");
    document.getElementById("refresh-spinner").classList.add("hidden");
});

// Handle the details submission
document.getElementById("verify-voter").addEventListener("click", async function () {
    // Disable all buttons
    await disableAll();

    // Start Loading animation
    document.getElementById("verify-voter-text").classList.add("hidden");
    document.getElementById("verify-spinner").classList.remove("hidden");

    // Get the details
    const id = document.getElementById("voter-id").value;
    const state = document.getElementById("location").value;
    const captcha = document.getElementById("captcha-value").value;

    // Send those detials to the server
    try {
        const response = await fetch('/voterVerification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                voterID: id,
                stateInd: state,
                captcha: captcha,
            })
        });
        const data = await response.json();
        if(data.Status == 'Done'){
            navigation = true;
            alert("Voter ID Verified Succeddfully");
            // document.cookie = "voterID="+ id +"; path=/";
            const stateSelect = document.getElementById("location");
            const districtSelect = document.getElementById("district");
            document.cookie = `state=${stateSelect.options[stateSelect.selectedIndex].text}; path=/`;
            document.cookie = `district=${districtSelect.value}; path=/`;
            window.location.href = '/aadhaarVerification';
            await enableAll();
        }
        else{
            alert("Got error while fetching details . . . . !\n\tTry Refreshing the Page . . . .");
        }
    } catch (error) {
        alert("Got error while fetching details . . . . !\n\tTry Refreshing the Page . . . .");
        console.log("Error: - ",error);
    }

    // Stop Loading animation
    document.getElementById("verify-spinner").classList.add("hidden");
    document.getElementById("verify-voter-text").classList.remove("hidden");
});

// Detect page unload or tab closure
window.addEventListener('beforeunload', async function (event) {
    alert("Navigation =", navigation);
    if(navigation == false){
        await fetch('/close_session', { method: 'POST', credentials: 'include' })
            .then(response => response.json())
            .then(data => console.log('Session closed:', data))
            .catch(err => console.error('Error closing session:', err));
    }
});
