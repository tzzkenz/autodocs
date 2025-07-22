#!/usr/bin/env node

const { program } = require("commander");
const { generateDocs } = require("../parser/expressParser");

program
  .version("1.0.0")
  .description("Generate API documentation from Express.js code")
  .requiredOption("-f, --file <file>", "Path to the Express.js file")
  .parse(process.argv);

generateDocs(program.opts().file);
