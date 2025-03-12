// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SafeVote {
    // Variable Declaration
    struct Voter{
        bool isRegistered;
        bool hasVoted;
        string district;
        string state;
        string hash;
    }
    struct Candidate{
        string id;
        string name;
        string age;
        string partyName;
        string district;
        string state;
        uint voteCount;
    }
    // struct registerAadhaar{
    //     bool registered;
    // }
    // struct registerID{
    //     bool registered;
    // }
    mapping (string => bool) public registerAadhaar;
    mapping (string => bool) public registerID;
    string public chiefAadhaar="830676380906";
    string public chiefID="RJZ2607539";
    Voter[] voterList;
    Candidate[] public candidateList;
    address public chief;
    bool candidateRegistrationOpen;
    bool voterRegistrationOpen;
    bool public votingOpen;
    bool public resultViewOpen;
    mapping (string => address) public voterAddressMap;
    mapping (address => Voter) public voterDetailsMap;
    mapping (string => bool) public candidateRegister;
    mapping (string => uint) public candidateIdIndMap;

    // Modifiers
    modifier onlyElectionChief(){
        require((msg.sender==chief),"Only election chief can perform this action");
        _;
    }
    modifier duringCandidateRegistration(){
        require(candidateRegistrationOpen,"Candidate Registration Closed");
        _;
    }
    modifier duringVoterRegistration(){
        require(voterRegistrationOpen,"Voter Registration Closed");
        _;
    }
    modifier duringVoting(){
        require(votingOpen,"Voting Closed");
        _;
    }
    modifier duringResultView(){
        require(resultViewOpen,"Result Viewing Closed");
        _;
    }
    modifier ifChief(){
        require(chief!=address(0),"Set Chief First");
        _;
    }
    modifier aadhaarValidation(string memory aadhaar){
        require(keccak256(bytes(aadhaar))==keccak256(bytes(chiefAadhaar)),"Enter valid Aadhaar");
        _;
    }
    modifier idValidation(string memory id){
        require(keccak256(bytes(id))==keccak256(bytes(chiefID)),"Enter valid Id");
        _;
    }
    modifier checkChief(){
        require(msg.sender==chief,"You have no rights to change these details");
        _;
    }
    modifier isAadhaarRegistered(string memory aadhaar){
        require(!registerAadhaar[aadhaar], "Aadhaar already registered!");
        _;
    }
    modifier isIdRegistered(string memory id){
        require(!registerID[id], "ID already registered!");
        _;
    }

    // Functions
    function setChief(string memory aadhaar, string memory id) public aadhaarValidation(aadhaar) idValidation(id) {
        require(chief==address(0),"Chief already set with different address");
        chief=msg.sender;
    }
    function updateDetails(string memory aadhaar, string memory id) public ifChief checkChief {
        chiefAadhaar=aadhaar;
        chiefID=id;
        chief=address(0);
    }
    // function resetChief() public {
    //     chief = address(0);
    // }
    function setCandidateRegistration() public ifChief onlyElectionChief{
        candidateRegistrationOpen=true;
        voterRegistrationOpen=false;
        votingOpen=false;
        resultViewOpen=false;
    }
    function setVoterRegistration() public ifChief onlyElectionChief{
        candidateRegistrationOpen=false;
        voterRegistrationOpen=true;
        votingOpen=false;
        resultViewOpen=false;
    }
    function setVoting() public ifChief onlyElectionChief{
        candidateRegistrationOpen=false;
        voterRegistrationOpen=false;
        votingOpen=true;
        resultViewOpen=false;
    }
    function setResultView() public ifChief onlyElectionChief{
        candidateRegistrationOpen=false;
        voterRegistrationOpen=false;
        votingOpen=false;
        resultViewOpen=true;
    }
    function registerCandidate(string memory id,string memory name, string memory age, string memory partyName, string memory district, string memory state) public ifChief onlyElectionChief duringCandidateRegistration{
        require(!candidateRegister[id],"Candidate ID Already Registered");
        candidateList.push(Candidate(id, name, age, partyName, district, state, 0));
        candidateRegister[id]=true;
        candidateIdIndMap[id]=candidateList.length-1;
    }
    function registerVoter(string memory hash, string memory district, string memory state, string memory aadhaar, string memory id) public duringVoterRegistration isAadhaarRegistered(aadhaar) isIdRegistered(id){
        require(voterAddressMap[hash]==address(0),"Voter Already Registered with these Details");
        require(!voterDetailsMap[msg.sender].isRegistered,"Voter Already Registered with this Address");
        registerAadhaar[aadhaar]=true;
        registerID[id]=true;
        voterAddressMap[hash]=msg.sender;
        voterDetailsMap[msg.sender]=Voter(true,false,district,state,hash);
    }
    function checkRegister(string memory hash) public view returns (string memory){
        if(voterAddressMap[hash] == address(0)){
            return "VOTER NOT REGISTERED";
        }
        else if(voterAddressMap[hash] != msg.sender){
            return "VOTER REGISTERED WITH DIFFERENT ADDRESS";
        }
        else{
            return "VOTER REGISTERED SUCCESSFULLY";
        }
    }
    function vote(string memory id) public duringVoting{
        require(voterDetailsMap[msg.sender].isRegistered, "Voter not Registered");
        require(!voterDetailsMap[msg.sender].hasVoted,"Voter already Voted");
        candidateList[candidateIdIndMap[id]].voteCount+=1;
        voterDetailsMap[msg.sender].hasVoted=true;
    }
    function getCandidateList() public view returns (Candidate[] memory){
        return candidateList;
    }
}