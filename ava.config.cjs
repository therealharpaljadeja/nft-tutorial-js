require("util").inspect.defaultOptions.depth = 5; // Increase AVA's printing depth

module.exports = {
    timeout: "300000",
    files: ["__tests__/nft.ava.js"],
    failWithoutAssertions: false,
    extensions: ["js"],
};
