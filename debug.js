const utils = require("util");

module.exports = function debug(objectName, object) {
  console.log(`${objectName}:`, utils.inspect(object, { depth: 10 }));
};
