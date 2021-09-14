const { server } = require("./rpc-server");

// First parameter is a method name.
// Second parameter is a method itself.
// A method takes JSON-RPC params and returns a result.
// It can also return a promise of the result.
server.addMethod("echo", ({ text }) => text);
server.addMethod("log", ({ message }) => console.log(message));
server.addMethod("double", ({ x }) => x * 2);

server.addMethod("getSnapshots", ({ userID,  videoID}) => {
    return ["x", "y"];
});