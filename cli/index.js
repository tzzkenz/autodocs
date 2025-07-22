#!/usr/bin/env node

const { program } = require("commander");

program
  .version("1.0.0")
  .description("Generate API documentation from Express.js or Flask code")
  .requiredOption("-f, --file <file>", "Path to the source file")
  .option("--lang <lang>", "Language (js or py)", "js")
  .parse(process.argv);

const options = program.opts();

if (options.lang === "js") {
  const { generateDocs } = require("../parser/expressParser");
  generateDocs(options.file);
} else if (options.lang === "py") {
  const { generatePyDocs } = require("../parser/flaskParser");
  generatePyDocs(options.file);
} else {
  console.error("Unsupported language. Use 'js' or 'py'.");
  process.exit(1);
}
