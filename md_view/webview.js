const express = require("express");
const fs = require("fs");
const markdownIt = require("markdown-it");

const app = express();
const md = new markdownIt();

app.get("/", (req, res) => {
  const markdown = fs.readFileSync("./output/api-docs.md", "utf-8");
  const html = md.render(markdown);

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>API Docs</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: sans-serif; padding: 2rem; max-width: 800px; margin: auto; line-height: 1.6; }
        pre { background: #f0f0f0; padding: 1rem; }
        code { background: #eee; padding: 2px 4px; border-radius: 4px; }
        h1, h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("View your docs at http://localhost:3000");
});
