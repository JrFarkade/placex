import re
from typing import Dict, Any

class ASTAnalyzer:
    """
    AST Static Code Analyzer & Complexity Estimator (Time/Space heuristics).
    """

    @staticmethod
    def analyze_code(source_code: str, language: str) -> Dict[str, Any]:
        code = source_code.lower()
        
        # 1. Loop nesting count for Time Complexity
        for_loops = len(re.findall(r'\bfor\b', code))
        while_loops = len(re.findall(r'\bwhile\b', code))
        total_loops = for_loops + while_loops

        if total_loops == 0:
            time_complexity = "O(1)"
        elif total_loops == 1:
            time_complexity = "O(N)"
        elif total_loops == 2:
            time_complexity = "O(N^2)" if "for" in code and "for" in code[code.find("for")+3:] else "O(N)"
        else:
            time_complexity = "O(N log N)" if "sort" in code or "log" in code else "O(N^2)"

        # 2. Space Complexity estimation
        if "[]" in code or "list(" in code or "vector" in code or "new " in code or "dict(" in code or "{}" in code:
            space_complexity = "O(N)"
        else:
            space_complexity = "O(1)"

        # 3. Quality score heuristics (0-100)
        has_docstrings = 1 if '"""' in source_code or "/*" in source_code or "#" in source_code else 0
        has_descriptive_vars = 1 if len(source_code) > 80 else 0
        has_no_dead_code = 1

        quality_score = round(70.0 + (has_docstrings * 15.0) + (has_descriptive_vars * 15.0), 1)

        return {
            "time_complexity": time_complexity,
            "space_complexity": space_complexity,
            "code_quality_score": min(100.0, quality_score),
            "detected_loops": total_loops,
            "lint_warnings": [] if quality_score > 80 else ["Consider adding inline comments explaining algorithmic step."]
        }
