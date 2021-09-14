const express = require("express");
const bodyParser = require("body-parser");
const { server } = require("./src/server/rpc-server");
require("./src/server/snapshot");



const app = express();
app.use('/snap-playback/dist/', express.static('dist'));
app.use(bodyParser.json());

app.post("/json-rpc", (req, res) => {
    const jsonRPCRequest = req.body;
    // server.receive takes a JSON-RPC request and returns a promise of a JSON-RPC response.
    // Alternatively, you can use server.receiveJSON, which takes JSON string as is (in this case req.body).
    server.receive(jsonRPCRequest).then((jsonRPCResponse) => {
        if (jsonRPCResponse) {
            res.json(jsonRPCResponse);
        } else {
            // If response is absent, it was a JSON-RPC notification method.
            // Respond with no content status (204).
            res.sendStatus(204);
        }
    });
});

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.listen(80);