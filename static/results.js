let safeVoteABI;
let safeVoteAddress;
let safeVoteContract;
let currentAccount;
let results = [];

document.addEventListener("DOMContentLoaded", async () => {

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
    console.log(candidates);
    candidates.forEach(element => {
        let candidateJSON = {
            id: element['id'],
            name: element['name'],
            age: parseInt(element['age']),
            partyName: element['partyName'],
            district: element['district'],
            state: element['state'],
            voteCount: parseInt(element['voteCount']),
        };
        results.push(candidateJSON);
    });
    console.log("Candidate List: - ", results);
  
    const resultsBody = document.getElementById("results-body");
    const totalVotes = document.getElementById("total-votes");
    const winnerPercentage = document.getElementById("winner-percentage");
    const totalCandidates = document.getElementById("total-candidates");
  
    // Sort results by votes (descending)
    results.sort((a, b) => b.voteCount - a.voteCount);
  
    // Populate results table
    results.forEach((candidate, index) => {
      const row = document.createElement("tr");
      row.className = index === 0 ? "winner" : "";
      row.innerHTML = `
        <td>${candidate.id}</td>
        <td>${candidate.name}</td>
        <td>${candidate.partyName}</td>
        <td>${candidate.district}, ${candidate.state}</td>
        <td>${candidate.voteCount}</td>
      `;
      resultsBody.appendChild(row);
    });
  
    // Populate stats
    const totalVotesCount = results.reduce((acc, candidate) => acc + candidate.voteCount, 0);
    totalVotes.textContent = totalVotesCount;
    winnerPercentage.textContent = ((results[0].voteCount / totalVotesCount) * 100).toFixed(2);
    totalCandidates.textContent = results.length;

    // Generate dynamic colors
    const generateColors = (count) => {
        const colors = [];
        for (let i = 0; i < count; i++) {
        // Generate random colors
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        colors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
        }
        return colors;
    };

    const candidateNames = results.map((candidate) => candidate.name);
    const candidateVotes = results.map((candidate) => candidate.voteCount);
    const dynamicColors = generateColors(results.length);

    // Pie Chart for Votes
  const votesPieChart = new Chart(document.getElementById("votesPieChart").getContext("2d"), {
    type: "pie",
    data: {
      labels: candidateNames,
      datasets: [
        {
          data: candidateVotes,
          backgroundColor: dynamicColors,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
    },
  });

  // Bar Chart for Votes
  const votesBarChart = new Chart(document.getElementById("votesBarChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: candidateNames,
      datasets: [
        {
          label: "Vote Count",
          data: candidateVotes,
          backgroundColor: dynamicColors,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    },
  });
});