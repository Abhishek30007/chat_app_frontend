const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3000;
const buildDir = path.join(__dirname, 'build');

const mimeTypes = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain'
};

function sendFile(res, filePath) {
    const ext = path.extname(filePath);
    const stream = fs.createReadStream(filePath);

    res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream'
    });

    stream.pipe(res);
}

const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent(req.url.split('?')[0]);
    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(buildDir, safePath === '/' ? 'index.html' : safePath);

    if (filePath.startsWith(buildDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return sendFile(res, filePath);
    }

    return sendFile(res, path.join(buildDir, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Frontend server running on port ${PORT}`);
});
