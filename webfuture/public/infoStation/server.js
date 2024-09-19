/* Server File */
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

function startServer(port) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
}

startServer(port);

// Route Table
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});
