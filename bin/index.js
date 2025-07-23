#!/usr/bin/env node

const { program } = require("commander");
const fs = require("fs");
const path = require("path");

program
  .version("1.0.0")
  .description("Generate API documentation from Express.js or Flask code")
  .requiredOption("-f, --file <file>", "Path to the source file or directory")
  .option("--lang <lang>", "Language (js or py)", "js")
  .parse(process.argv);

const options = program.opts();

const isJS = options.lang === "js";
const isPY = options.lang === "py";

if (!isJS && !isPY) {
  console.error("Unsupported language. Use 'js' or 'py'.");
  process.exit(1);
}

const { generateDocs } = isJS ? require("../parser/expressParser") : {};
const { generatePyDocs } = isPY ? require("../parser/flaskParser") : {};

// Recursively traverse directory and process files
function processPath(inputPath) {
  const stat = fs.statSync(inputPath);

  if (stat.isFile()) {
    if (
      (isJS && inputPath.endsWith(".js")) ||
      (isPY && inputPath.endsWith(".py"))
    ) {
      if (isJS) generateDocs(inputPath);
      else generatePyDocs(inputPath);
    }
  } else if (stat.isDirectory()) {
    const entries = fs.readdirSync(inputPath);
    for (const entry of entries) {
      processPath(path.join(inputPath, entry));
    }
  }
}

processPath(path.resolve(options.file));
