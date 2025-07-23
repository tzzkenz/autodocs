#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { program } = require("commander");

const CONFIG_FILE = "autodocs.config.json";

// CLI setup
program
  .version("1.0.0")
  .description("Generate API documentation from Express.js or Flask code")
  .option("-f, --file <file>", "Path to the source file or directory")
  .option("--lang <lang>", "Language (js or py)")
  .option("-o, --output <dir>", "Output directory for generated docs")
  .parse(process.argv);

const options = program.opts();

// Load config if option not provided via CLI
function loadConfig() {
  const configPath = path.join(process.cwd(), CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red(`❌ Config file '${CONFIG_FILE}' not found.`));
    return {};
  }

  try {
    const configData = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(configData);
  } catch (err) {
    console.error(
      chalk.red(`❌ Failed to parse '${CONFIG_FILE}': ${err.message}`)
    );
    process.exit(1);
  }
}

const config = loadConfig();
const filePath = options.file || config.file;
const lang = options.lang || config.lang || "js";
const outputDir = options.output || config.output || "output";

const isJS = lang === "js";
const isPY = lang === "py";

if (!isJS && !isPY) {
  console.error("Unsupported language. Use 'js' or 'py'.");
  process.exit(1);
}

const { generateDocs } = isJS ? require("../parser/expressParser") : {};
const { generatePyDocs } = isPY ? require("../parser/flaskParser") : {};

// Recursive processor
function processPath(inputPath) {
  const stat = fs.statSync(inputPath);

  if (stat.isFile()) {
    if (
      (isJS && inputPath.endsWith(".js")) ||
      (isPY && inputPath.endsWith(".py"))
    ) {
      if (isJS) generateDocs(inputPath, outputDir);
      else if (isPY) generatePyDocs(inputPath, outputDir);
      else console.error(chalk.red(`Unsupported file type: ${inputPath}`));
    }
  } else if (stat.isDirectory()) {
    const entries = fs.readdirSync(inputPath);
    for (const entry of entries) {
      processPath(path.join(inputPath, entry));
    }
  }
}

processPath(path.resolve(filePath));
