const fs = require("fs");
const path = require("path");

function extractComment(lines, index) {
  const prevLine = lines[index - 1]?.trim();

  // Single-line comment just above the function
  if (prevLine?.startsWith("#")) {
    return prevLine.replace(/^#\s?/, "").trim();
  }

  // Multi-line docstring just above the function
  if (prevLine?.endsWith("'''") || prevLine?.endsWith('"""')) {
    const commentLines = [];
    let j = index - 1;
    const delimiter = prevLine.endsWith("'''") ? "'''" : '"""';

    // Find the opening docstring
    while (j >= 0 && !lines[j].includes(delimiter)) {
      commentLines.unshift(lines[j].trim());
      j--;
    }

    if (j >= 0) {
      commentLines.unshift(lines[j].trim());
      return commentLines.join(" ").replaceAll(delimiter, "").trim();
    }
  }

  return "No description provided.";
}

function generatePyDocs(filePath, outputDir = "output") {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const routeRegex = /@app\.route\(['"](.+?)['"],\s*methods=\['(.+?)'\]\)/;
  const defRegex = /def\s+(\w+)\(/;

  let result = `# API Documentation (Python Flask)\n\n`;

  for (let i = 0; i < lines.length; i++) {
    const routeMatch = routeRegex.exec(lines[i]);
    if (routeMatch && i + 1 < lines.length) {
      const method = routeMatch[2];
      const route = routeMatch[1];
      const defLine = lines[i + 1];
      const defMatch = defRegex.exec(defLine);

      const description = extractComment(lines, i);

      result += `## ${method.toUpperCase()} ${route}\n\n`;
      result += `**Function**: ${defMatch ? defMatch[1] : "unknown"}\n\n`;
      result += `**Description**: ${description}\n\n`;
      result += `**Sample Response**:\n\n\`\`\`json\n{\n  "status": "ok"\n}\n\`\`\`\n\n`;
    }
  }

  const outputDirectory = path.join(process.cwd(), outputDir);
  fs.mkdirSync(outputDirectory, { recursive: true });

  const outputName =
    path.basename(filePath, path.extname(filePath)) + "-docs.md";
  const outputPath = path.join(outputDirectory, outputName);
  fs.writeFileSync(outputPath, result);
  console.log(`Flask docs generated at ${outputPath}`);
}

module.exports = { generatePyDocs };
