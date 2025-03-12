const SafeVote = artifacts.require("SafeVote");

module.exports = function (deployer) {
  deployer.deploy(SafeVote);
};