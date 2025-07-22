const fs = require("fs");
const path = require("path");

function generatePyDocs(filePath) {
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

      let defLine = lines[i + 1];
      let defMatch = defRegex.exec(defLine);

      result += `## ${method.toUpperCase()} ${route}\n\n`;
      result += `**Function**: ${defMatch ? defMatch[1] : "unknown"}\n\n`;
      result += `**Description**: _Add description here._\n\n`;
      result += `**Sample Response**:\n\n\`\`\`json\n{\n  "status": "ok"\n}\n\`\`\`\n\n`;
    }
  }

  const outputPath = path.join(__dirname, "../output/api-docs.md");

  fs.writeFileSync(outputPath, result);
  console.log(`Flask docs generated at ${outputPath}`);
}

module.exports = { generatePyDocs };
