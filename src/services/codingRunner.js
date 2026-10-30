// PlaceX Coding Engine & Safe Execution Simulator
// Faithful port of backend/app/coding_service/

export function evalPythonExpr(expr, vars = {}) {
  expr = expr.trim();
  if (!expr) return "";

  // String literal
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }

  // Number literal
  if (/^-?\d+(?:\.\d+)?$/.test(expr)) {
    return Number(expr);
  }

  if (expr === 'True') return true;
  if (expr === 'False') return false;
  if (expr === 'None') return null;

  // Binary operations (+ -)
  for (let i = expr.length - 1; i >= 0; i--) {
    const ch = expr[i];
    if (ch === '+' || ch === '-') {
      const leftStr = expr.slice(0, i).trim();
      const rightStr = expr.slice(i + 1).trim();
      if (leftStr && rightStr) {
        const left = evalPythonExpr(leftStr, vars);
        const right = evalPythonExpr(rightStr, vars);
        return ch === '+' ? (typeof left === 'string' || typeof right === 'string' ? String(left) + String(right) : left + right) : (left - right);
      }
    }
  }

  // Binary operations (* / %)
  for (let i = expr.length - 1; i >= 0; i--) {
    const ch = expr[i];
    if (ch === '*' || ch === '/' || ch === '%') {
      const leftStr = expr.slice(0, i).trim();
      const rightStr = expr.slice(i + 1).trim();
      if (leftStr && rightStr) {
        const left = evalPythonExpr(leftStr, vars);
        const right = evalPythonExpr(rightStr, vars);
        if (ch === '/' || ch === '%') {
          if (right === 0) {
            throw new Error("ZeroDivisionError: division by zero");
          }
          return ch === '/' ? left / right : left % right;
        }
        return left * right;
      }
    }
  }

  // Variable lookup
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
    if (vars[expr] !== undefined) return vars[expr];
    throw new Error(`NameError: name '${expr}' is not defined`);
  }

  return expr;
}

export function runPythonCode(sourceCode, stdinInput = "") {
  if (!sourceCode || !sourceCode.trim()) {
    return {
      status: "Compilation Error",
      stdout: "",
      stderr: "SyntaxError: No source code provided for execution.\n  File \"<stdin>\", line 1",
      compile_output: "SyntaxError: No source code provided for execution.",
      runtime_ms: 0,
      memory_kb: 0,
      time_complexity: "O(1)",
      space_complexity: "O(1)",
      code_quality_score: 0
    };
  }

  const lines = sourceCode.split('\n');

  // 1. Syntax Check: Check for unmatched brackets and quotes
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Check colons on control statements
    const controlKeywords = ['def ', 'class ', 'if ', 'elif ', 'else:', 'for ', 'while ', 'try:', 'except', 'finally:'];
    for (const kw of controlKeywords) {
      if (trimmed.startsWith(kw) && !trimmed.endsWith(':') && !trimmed.includes('#')) {
        return {
          status: "Compilation Error",
          stdout: "",
          stderr: `  File "<stdin>", line ${lineNum}\n    ${line}\nSyntaxError: expected ':'`,
          compile_output: `SyntaxError: expected ':' at line ${lineNum}`,
          runtime_ms: 5,
          memory_kb: 12000,
          time_complexity: "O(1)",
          space_complexity: "O(1)",
          code_quality_score: 30
        };
      }
    }

    // Scan chars
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (!inDouble && !inSingle) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
        else if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth--;
        else if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
      }
    }

    if (parenDepth < 0) {
      return {
        status: "Compilation Error",
        stdout: "",
        stderr: `  File "<stdin>", line ${lineNum}\n    ${line}\nSyntaxError: unmatched ')'`,
        compile_output: `SyntaxError: unmatched ')' at line ${lineNum}`,
        runtime_ms: 4,
        memory_kb: 12000
      };
    }
  }

  if (inDouble || inSingle || parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0) {
    return {
      status: "Compilation Error",
      stdout: "",
      stderr: `  File "<stdin>", line ${lines.length}\n    ${lines[lines.length - 1]}\nSyntaxError: unexpected EOF while parsing (unclosed brackets or quotes)`,
      compile_output: "SyntaxError: unexpected EOF while parsing",
      runtime_ms: 5,
      memory_kb: 12000,
      time_complexity: "O(1)",
      space_complexity: "O(1)",
      code_quality_score: 35
    };
  }

  // 2. Runtime Error Simulation: EOFError
  if (/input\s*\(/.test(sourceCode) && (!stdinInput || !stdinInput.trim())) {
    return {
      status: "Input / EOF Error",
      stdout: "",
      stderr: "Traceback (most recent call last):\n  File \"<stdin>\", line 1, in <module>\nEOFError: EOF when reading a line",
      compile_output: "",
      runtime_ms: 6,
      memory_kb: 12100
    };
  }

  // 3. Safe Python Statement Evaluator
  let stdout = "";
  const vars = {};
  const stdinLines = stdinInput.split('\n').filter(Boolean);
  let stdinIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    try {
      // Handle simple print(...)
      if (line.startsWith('print(') && line.endsWith(')')) {
        const inner = line.slice(6, -1).trim();
        if (inner === "") {
          stdout += "\n";
        } else if ((inner.startsWith('"') && inner.endsWith('"')) || (inner.startsWith("'") && inner.endsWith("'"))) {
          stdout += inner.slice(1, -1) + "\n";
        } else if (inner.startsWith('f"') || inner.startsWith("f'")) {
          // f-string support
          const template = inner.slice(2, -1);
          let evaluatedStr = "";
          let lastIndex = 0;
          const regex = /\{([^}]+)\}/g;
          let match;

          while ((match = regex.exec(template)) !== null) {
            evaluatedStr += template.slice(lastIndex, match.index);
            const expr = match[1];
            const val = evalPythonExpr(expr, vars);
            evaluatedStr += (val === null ? 'None' : val === true ? 'True' : val === false ? 'False' : String(val));
            lastIndex = regex.lastIndex;
          }
          evaluatedStr += template.slice(lastIndex);
          stdout += evaluatedStr + "\n";
        } else {
          const val = evalPythonExpr(inner, vars);
          stdout += (val === null ? 'None' : val === true ? 'True' : val === false ? 'False' : String(val)) + "\n";
        }
      } else if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*/.test(line)) {
        // Variable assignment
        const eqIdx = line.indexOf('=');
        const varName = line.slice(0, eqIdx).trim();
        const rhs = line.slice(eqIdx + 1).trim();

        if (rhs.startsWith('input(')) {
          vars[varName] = stdinIdx < stdinLines.length ? stdinLines[stdinIdx++] : "";
        } else if (rhs.startsWith('int(input(')) {
          vars[varName] = parseInt(stdinIdx < stdinLines.length ? stdinLines[stdinIdx++] : "0", 10);
        } else {
          vars[varName] = evalPythonExpr(rhs, vars);
        }
      }
    } catch (err) {
      const errName = err.message.split(':')[0].trim();
      return {
        status: "Runtime Error",
        stdout: stdout,
        stderr: `Traceback (most recent call last):\n  File "<stdin>", line ${i + 1}, in <module>\n    ${line}\n${err.message}`,
        runtime_ms: 10,
        memory_kb: 12400,
        time_complexity: "O(1)",
        space_complexity: "O(1)",
        code_quality_score: 40
      };
    }
  }

  // Estimate complexity from code structure
  let timeComplexity = "O(1)";
  let spaceComplexity = "O(1)";
  const loopCount = (sourceCode.match(/\bfor\b|\bwhile\b/g) || []).length;
  if (loopCount === 1) timeComplexity = "O(n)";
  else if (loopCount === 2) timeComplexity = "O(n^2)";
  else if (loopCount > 2) timeComplexity = "O(n^3)";

  if (sourceCode.includes('[') || sourceCode.includes('append') || sourceCode.includes('dict()')) {
    spaceComplexity = "O(n)";
  }

  return {
    status: "Accepted",
    stdout: stdout || "Program executed successfully with no output.\n",
    stderr: "",
    compile_output: "",
    runtime_ms: Math.floor(Math.random() * 15) + 20,
    memory_kb: 12400,
    time_complexity: timeComplexity,
    space_complexity: spaceComplexity,
    code_quality_score: 92
  };
}

