const express = require("express");
const app = express();

// TODO: Currently serving static HTML for purpose of prototyping
app.use(express.static("public"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
