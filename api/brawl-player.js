const playerHandler = require('./player');

module.exports = async function handler(req, res) {
  return playerHandler(req, res);
};
