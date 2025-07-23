const fs = require("fs");
const path = require("path");

function extractQueryParams(lines, functionStartIndex) {
  const queryParams = [];

  // Look for request.args.get() patterns in the function body
  const requestArgsRegex =
    /request\.args\.get\(['"]([^'"]+)['"](?:,\s*([^)]+))?\)/g;

  // Search through the function body (next 20 lines or until next function)
  let endIndex = functionStartIndex + 1;
  while (endIndex < lines.length && !lines[endIndex].match(/^def\s+\w+\(/)) {
    endIndex++;
    if (endIndex - functionStartIndex > 20) break; // Reasonable limit
  }

  for (let i = functionStartIndex; i < endIndex; i++) {
    const line = lines[i];
    let match;

    while ((match = requestArgsRegex.exec(line)) !== null) {
      const paramName = match[1];
      const defaultValue = match[2] ? match[2].trim() : null;

      // Try to determine if it's required (no default value or default is None)
      const isRequired = !defaultValue || defaultValue === "None";

      queryParams.push({
        name: paramName,
        required: isRequired,
        defaultValue:
          defaultValue && defaultValue !== "None" ? defaultValue : null,
        type: inferParamType(defaultValue),
      });
    }
  }

  return queryParams;
}

function inferParamType(defaultValue) {
  if (!defaultValue || defaultValue === "None") return "string";

  // Remove quotes and check the value
  const cleanValue = defaultValue.replace(/['"]/g, "");

  if (/^\d+$/.test(cleanValue)) return "integer";
  if (/^\d*\.\d+$/.test(cleanValue)) return "number";
  if (cleanValue === "True" || cleanValue === "False") return "boolean";

  return "string";
}

function parseDocstringParams(docstring) {
  const params = [];

  // Look for Google-style docstring parameters
  const googleParamRegex = /Args?:\s*\n((?:\s+\w+.*\n?)*)/i;
  const paramLineRegex = /^\s+(\w+)\s*\(([^)]+)\):\s*(.+)$/;

  const argsMatch = googleParamRegex.exec(docstring);
  if (argsMatch) {
    const argsSection = argsMatch[1];
    const lines = argsSection.split("\n");

    for (const line of lines) {
      const paramMatch = paramLineRegex.exec(line);
      if (paramMatch) {
        params.push({
          name: paramMatch[1],
          type: paramMatch[2].toLowerCase(),
          description: paramMatch[3].trim(),
          fromDocstring: true,
        });
      }
    }
  }

  // Look for Sphinx-style parameters
  const sphinxParamRegex = /:param\s+(\w+)\s+(\w+):\s*(.+)/g;
  let match;
  while ((match = sphinxParamRegex.exec(docstring)) !== null) {
    params.push({
      name: match[2],
      type: match[1],
      description: match[3].trim(),
      fromDocstring: true,
    });
  }

  return params;
}

function extractComment(lines, index) {
  const prevLine = lines[index - 1]?.trim();

  // Single-line comment just above the function
  if (prevLine?.startsWith("#")) {
    return {
      description: prevLine.replace(/^#\s?/, "").trim(),
      fullDocstring: prevLine,
    };
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
      const fullDocstring = commentLines.join("\n");
      const cleanDescription = commentLines
        .join(" ")
        .replaceAll(delimiter, "")
        .trim();

      return {
        description: cleanDescription,
        fullDocstring: fullDocstring,
      };
    }
  }

  return {
    description: "No description provided.",
    fullDocstring: "",
  };
}

function formatQueryParams(queryParams, docstringParams) {
  if (queryParams.length === 0 && docstringParams.length === 0) {
    return "";
  }

  let result = "**Query Parameters**:\n\n";

  // Merge parameters from code analysis and docstring
  const allParams = new Map();

  // Add parameters found in code
  queryParams.forEach((param) => {
    allParams.set(param.name, {
      ...param,
      source: "code",
    });
  });

  // Enhance with docstring information
  docstringParams.forEach((param) => {
    if (allParams.has(param.name)) {
      // Merge with existing param
      const existing = allParams.get(param.name);
      allParams.set(param.name, {
        ...existing,
        ...param,
        description:
          param.description || existing.description || "No description",
      });
    } else {
      // Add new param from docstring
      allParams.set(param.name, {
        ...param,
        required: false, // Assume optional if only in docstring
        source: "docstring",
      });
    }
  });

  // Format the parameters
  allParams.forEach((param) => {
    const requiredText = param.required ? " *(required)*" : " *(optional)*";
    const typeText = param.type || "string";
    const defaultText = param.defaultValue
      ? ` (default: \`${param.defaultValue}\`)`
      : "";
    const description = param.description || "No description";

    result += `- **${param.name}** (\`${typeText}\`)${requiredText}${defaultText}: ${description}\n`;
  });

  result += "\n";
  return result;
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

      const commentData = extractComment(lines, i);
      const queryParams = extractQueryParams(lines, i + 1);
      const docstringParams = parseDocstringParams(commentData.fullDocstring);

      result += `## ${method.toUpperCase()} ${route}\n\n`;
      result += `**Function**: ${defMatch ? defMatch[1] : "unknown"}\n\n`;
      result += `**Description**: ${commentData.description}\n\n`;

      // Add query parameters section
      result += formatQueryParams(queryParams, docstringParams);

      result += `**Sample Request**:\n\n`;
      if (queryParams.length > 0) {
        const sampleParams = queryParams
          .map((p) => `${p.name}=${p.defaultValue || "value"}`)
          .join("&");
        result += `\`\`\`\nGET ${route}?${sampleParams}\n\`\`\`\n\n`;
      } else {
        result += `\`\`\`\nGET ${route}\n\`\`\`\n\n`;
      }

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
