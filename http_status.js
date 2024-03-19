const http2 = require("http2");

// https://stackoverflow.com/a/73544835
const HTTP_STATUS = Object.fromEntries(
    Object.entries(http2.constants)
        .filter(([key]) => key.startsWith('HTTP_STATUS_'))
        .map(([key, value]) => [key.replace('HTTP_STATUS_', ''), value])
)

module.exports = HTTP_STATUS;
