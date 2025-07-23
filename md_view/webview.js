// viewer/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");

const app = express();
const md = new markdownIt();

const docsDir = path.resolve(__dirname, "../docs");

app.get("/", (req, res) => {
  const files = fs.readdirSync(docsDir).filter((file) => file.endsWith(".md"));
  const listItems = files
    .map((file) => `<li><a href="/view?file=${file}">${file}</a></li>`)
    .join("");

  res.send(`
    <html>
      <head>
        <title>AutoDoc Viewer</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; }
          ul { list-style: none; padding: 0; }
          li { margin: 0.5rem 0; }
          a { text-decoration: none; color: blue; }
        </style>
      </head>
      <body>
        <h1>Available Docs</h1>
        <ul>${listItems}</ul>
      </body>
    </html>
  `);
});

app.get("/view", (req, res) => {
  const file = req.query.file;
  const filePath = path.join(docsDir, file);

  if (!file || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  const markdown = fs.readFileSync(filePath, "utf-8");
  const html = md.render(markdown);

  res.send(`
    <html>
      <head>
        <title>${file}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: sans-serif; padding: 2rem; max-width: 800px; margin: auto; line-height: 1.6; }
          pre { background: #f0f0f0; padding: 1rem; }
          code { background: #eee; padding: 2px 4px; border-radius: 4px; }
          h1, h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
        </style>
      </head>
      <body>
        <a href="/">← Back to all docs</a>
        ${html}
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("View your docs at http://localhost:3000");
});
