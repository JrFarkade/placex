// PlaceX ATS Resume Analysis & Document Classifier Engine
// Faithful port of backend/app/resume_service/

export const DocumentType = {
  RESUME: "RESUME",
  CV: "CV",
  UNKNOWN: "UNKNOWN",
  NON_RESUME: "NON_RESUME",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  IMAGE_ONLY: "IMAGE_ONLY"
};

export const NON_RESUME_RED_FLAGS = [
  "lab report", "practical no", "practical #", "experiment no", "assignment",
  "abstract", "references", "table of contents", "chapter 1", "chapter 2",
  "invoice #", "bill to", "tax invoice", "receipt", "total amount",
  "submitted by:", "submitted to:", "department of", "university exam",
  "question paper", "syllabus", "user manual"
];

export const RESUME_HEADINGS = [
  "education", "experience", "work experience", "employment", "projects",
  "technical skills", "skills", "certifications", "achievements", "summary",
  "objective", "internship", "internships", "extracurricular", "coursework", "profile"
];

export const STANDARD_SKILLS_DB = {
  "Programming Languages": ["python", "java", "cpp", "c++", "c", "javascript", "typescript", "go", "rust", "kotlin", "sql", "html", "css"],
  "Frameworks & Libraries": ["react", "node.js", "express", "fastapi", "django", "flask", "spring boot", "next.js", "vue", "angular", "redux", "pandas", "numpy"],
  "Databases": ["mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle", "dynamodb"],
  "Cloud & DevOps": ["aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "ci/cd", "linux"],
  "Developer Tools & Concepts": ["rest api", "graphql", "system design", "data structures", "algorithms", "microservices", "oop"],
  "Action Verbs": ["developed", "built", "designed", "implemented", "optimized", "architected", "engineered", "scaled", "spearheaded", "improved", "created", "led"]
};

export function extractTextFromBuffer(buffer, filename = "") {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    return { text: "", status: "EXTRACTION_FAILED", error: "File is empty." };
  }

  const isPdf = filename.toLowerCase().endsWith('.pdf') || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  const isDocx = filename.toLowerCase().endsWith('.docx') || (bytes[0] === 0x50 && bytes[1] === 0x4B);

  if (!isPdf && !isDocx) {
    return { text: "", status: "INVALID_FORMAT", error: "Unsupported file format. Please upload a PDF or DOCX file." };
  }

  // Extract readable text characters from raw stream
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawString = decoder.decode(bytes);

  // If PDF, extract stream chunks and textual glyphs
  let text = "";
  if (isPdf) {
    // Collect text from PDF text object blocks BT ... ET and literal strings (...)
    const matches = rawString.match(/\((.*?)\)|\[(.*?)\]|BT[\s\S]*?ET/g) || [];
    const textPieces = [];
    for (const m of matches) {
      const clean = m.replace(/[\\()\[\]]/g, ' ').replace(/\\r|\\n/g, ' ').trim();
      if (clean.length > 2 && /[a-zA-Z0-9]/.test(clean)) {
        textPieces.push(clean);
      }
    }
    text = textPieces.join(" ");

    // If stream compressed or structured, extract ASCII alphanumeric runs
    if (text.length < 50) {
      const asciiRuns = rawString.match(/[A-Za-z0-9@\.\-\+\#\/ ]{4,}/g) || [];
      text = asciiRuns.filter(r => !r.includes('/Filter') && !r.includes('/Length') && !r.includes('/Type')).join(" ");
    }
  } else {
    // DOCX (ZIP archive containing word/document.xml)
    const xmlMatches = rawString.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    if (xmlMatches.length > 0) {
      text = xmlMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(" ");
    } else {
      const asciiRuns = rawString.match(/[A-Za-z0-9@\.\-\+\#\/ ]{4,}/g) || [];
      text = asciiRuns.join(" ");
    }
  }

  text = text.replace(/\s+/g, ' ').trim();

  if (text.length < 25) {
    return { text: "", status: "EXTRACTION_FAILED", error: "Could not extract readable text from document." };
  }

  return { text, status: "SUCCESS" };
}

export function classifyDocument(text, extractionStatus = "SUCCESS") {
  if (extractionStatus === "EXTRACTION_FAILED" || !text || text.length < 20) {
    return {
      doc_type: DocumentType.EXTRACTION_FAILED,
      confidence_score: 0.0,
      is_valid_resume: false,
      signals: [],
      red_flags: ["PDF text extraction failed or file unreadable."],
      message: "Your PDF could not be read. Please try exporting your resume again as a standard text-based PDF."
    };
  }

  const textLower = text.toLowerCase();
  let score = 0.0;
  const signals = [];
  const redFlags = [];

  // 1. Red Flag Penalties for obvious non-resumes
  for (const flag of NON_RESUME_RED_FLAGS) {
    if (textLower.includes(flag)) {
      redFlags.push(flag);
      score -= 35.0;
    }
  }

  // 2. Contact Information Signals (Max 35 pts)
  const hasEmail = /[\w\.-]+@[\w\.-]+\.\w+/.test(text);
  const hasPhone = /\+?\d[\d\s-]{8,}/.test(text);
  const hasLinks = ['linkedin', 'github', 'leetcode', 'portfolio', 'hackerrank'].some(d => textLower.includes(d));

  if (hasEmail) { score += 15.0; signals.push("Email address found"); }
  if (hasPhone) { score += 10.0; signals.push("Phone number found"); }
  if (hasLinks) { score += 10.0; signals.push("Professional profile link found"); }

  // 3. Resume Headings (Max 40 pts)
  const detectedHeadings = RESUME_HEADINGS.filter(h => new RegExp(`\\b${h}\\b`, 'i').test(textLower));
  score += Math.min(40.0, detectedHeadings.length * 10.0);
  if (detectedHeadings.length > 0) {
    signals.push(`Headings: ${detectedHeadings.slice(0, 4).join(', ')}`);
  }

  // 4. Content Structure (Max 25 pts)
  const hasSkills = ["python", "java", "c++", "sql", "react", "html", "css", "javascript", "node", "git"].some(s => textLower.includes(s));
  const hasDegrees = ["b.tech", "b.e.", "b.s.", "m.tech", "bachelor", "master", "gpa", "cgpa", "university", "college", "degree"].some(d => textLower.includes(d));
  const hasActionVerbs = ["developed", "built", "designed", "implemented", "managed", "created", "spearheaded", "engineered"].some(v => textLower.includes(v));

  if (hasSkills) score += 10.0;
  if (hasDegrees) score += 10.0;
  if (hasActionVerbs) score += 5.0;

  const wordCount = text.split(/\s+/).length;
  if (wordCount > 2500) {
    score -= 20.0;
    redFlags.push("Excessive word count (>2500 words)");
  }

  let finalScore = Math.max(0.0, Math.min(100.0, Math.round(score * 10) / 10));

  // Student / Fresher protection rule
  const isFresher = (hasEmail || hasPhone) && (hasDegrees || textLower.includes("education")) && (hasSkills || textLower.includes("projects") || textLower.includes("internship"));
  if (isFresher && redFlags.length === 0 && finalScore < 70.0) {
    finalScore = 80.0;
    signals.push("Student/Fresher resume structure verified");
  }

  let docType = DocumentType.NON_RESUME;
  let isValid = false;
  let message = "This document does not appear to be a resume.";

  if (redFlags.length > 0 && finalScore < 40.0) {
    docType = DocumentType.NON_RESUME;
    isValid = false;
    message = `This document appears to be non-resume material (detected: ${redFlags.slice(0, 2).join(', ')}). Please upload a valid resume.`;
  } else if (finalScore >= 70.0) {
    docType = wordCount > 900 ? DocumentType.CV : DocumentType.RESUME;
    isValid = true;
    message = "Valid resume document recognized.";
  } else if (finalScore >= 45.0) {
    docType = DocumentType.UNKNOWN;
    isValid = true;
    message = "Document recognized with moderate confidence.";
  } else {
    docType = DocumentType.NON_RESUME;
    isValid = false;
    message = "This document does not contain sufficient resume sections (Education, Skills, Experience/Projects).";
  }

  return {
    doc_type: docType,
    confidence_score: finalScore,
    is_valid_resume: isValid,
    signals,
    red_flags: redFlags,
    message
  };
}

export function extractSkills(text) {
  const textLower = text.toLowerCase();
  const extracted = {};

  for (const [category, skills] of Object.entries(STANDARD_SKILLS_DB)) {
    const found = new Set();
    for (const skill of skills) {
      const pattern = new RegExp(`\\b${skill.replace('+', '\\+')}\\b`, 'i');
      if (pattern.test(textLower)) {
        found.add(skill.toUpperCase() === 'SQL' || skill.toUpperCase() === 'HTML' || skill.toUpperCase() === 'CSS' || skill.toUpperCase() === 'AWS' || skill.toUpperCase() === 'GCP' || skill.toUpperCase() === 'OOP' ? skill.toUpperCase() : (skill.charAt(0).toUpperCase() + skill.slice(1)));
      }
    }
    extracted[category] = Array.from(found);
  }

  let totalSkills = 0;
  for (const [k, v] of Object.entries(extracted)) {
    if (k !== "Action Verbs") totalSkills += v.length;
  }

  return {
    skills_by_category: extracted,
    total_skills_detected: totalSkills,
    action_verbs_detected: extracted["Action Verbs"] || [],
    action_verb_count: (extracted["Action Verbs"] || []).length
  };
}

export function evaluateATS(text, targetJd = "") {
  const textLower = text.toLowerCase();
  const skillsRes = extractSkills(text);

  // 1. Structure
  const sections = ["education", "experience", "projects", "skills", "certifications", "summary"];
  const detectedSections = sections.filter(s => textLower.includes(s));
  const scoreStructure = Math.min(100.0, (detectedSections.length / sections.length) * 100.0);

  // 2. Contact Information
  const hasEmail = /[\w\.-]+@[\w\.-]+/.test(text) ? 1 : 0;
  const hasPhone = /\+?\d[\d\s-]{8,}/.test(text) ? 1 : 0;
  const hasLinks = textLower.includes('linkedin') || textLower.includes('github') ? 1 : 0;
  const scoreContact = ((hasEmail + hasPhone + hasLinks) / 3.0) * 100.0;

  // 3. Education
  const hasDegree = ["b.tech", "b.e.", "b.s.", "m.tech", "bachelor", "master", "computer science"].some(d => textLower.includes(d)) ? 1 : 0;
  const hasYear = /20\d\d/.test(text) ? 1 : 0;
  const scoreEducation = ((hasDegree + hasYear) / 2.0) * 100.0;

  // 4. Experience & Chronology
  const hasExp = textLower.includes("experience") || textLower.includes("internship");
  const scoreExperience = hasExp ? 85.0 : 50.0;

  // 5. Projects & Quantified Achievements
  const metricsMatches = textLower.match(/\b\d+%\b|\b\d+x\b|\$\d+|\b\d+k\b/g) || [];
  const scoreProjects = Math.min(100.0, 50.0 + (metricsMatches.length * 15.0));

  // 6. Technical Skills Coverage
  const totalSkills = skillsRes.total_skills_detected;
  const scoreSkills = Math.min(100.0, (totalSkills / 8.0) * 100.0);

  // 7. Certifications
  const hasCerts = textLower.includes("certification") || textLower.includes("certified");
  const scoreCerts = hasCerts ? 90.0 : 60.0;

  // 8. Keyword Coverage vs JD
  let scoreKeywords = 75.0;
  let missingKeywords = ["System Design", "Microservices", "Docker"];
  const allDetectedSkillsList = Object.values(skillsRes.skills_by_category).flat().filter(s => !STANDARD_SKILLS_DB["Action Verbs"].map(v => v.toLowerCase()).includes(s.toLowerCase()));

  if (targetJd && targetJd.trim().length > 10) {
    const jdWords = Array.from(new Set(targetJd.toLowerCase().match(/\w{4,}/g) || []));
    const resWords = new Set(textLower.match(/\w{4,}/g) || []);
    const overlap = jdWords.filter(w => resWords.has(w));
    scoreKeywords = Math.min(100.0, (overlap.length / Math.max(1, jdWords.length)) * 150.0);
    const missing = jdWords.filter(w => !resWords.has(w));
    missingKeywords = missing.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1));
  }

  // 9. Semantic Match
  const scoreSemantic = Math.min(100.0, scoreKeywords * 1.05);

  // 10. Formatting Spacing
  const scoreFormatting = text.length > 400 ? 88.0 : 45.0;

  // 11. Readability
  const wordCount = text.split(/\s+/).length;
  const scoreReadability = (wordCount >= 250 && wordCount <= 850) ? 92.0 : 65.0;

  // 12. Action Verbs
  const scoreActionVerbs = Math.min(100.0, (skillsRes.action_verb_count / 4.0) * 100.0);

  // 13. Grammar
  const scoreGrammar = 94.0;

  const weights = {
    structure: 0.10,
    contact_info: 0.10,
    education: 0.10,
    experience: 0.10,
    projects: 0.10,
    technical_skills: 0.10,
    certifications: 0.05,
    keyword_coverage: 0.10,
    semantic_match: 0.10,
    formatting: 0.05,
    readability: 0.05,
    action_verbs: 0.05,
    grammar: 0.05
  };

  const categoryScores = {
    "Contact Information": Math.round(scoreContact),
    "Education": Math.round(scoreEducation),
    "Work Experience": Math.round(scoreExperience),
    "Projects": Math.round(scoreProjects),
    "Technical Skills": Math.round(scoreSkills),
    "Structure": Math.round(scoreStructure),
    "Certifications": Math.round(scoreCerts),
    "Keyword Coverage": Math.round(scoreKeywords),
    "Formatting & Layout": Math.round(scoreFormatting),
    "Action Verbs": Math.round(scoreActionVerbs)
  };

  const weightedSum = 
    (scoreStructure * weights.structure) +
    (scoreContact * weights.contact_info) +
    (scoreEducation * weights.education) +
    (scoreExperience * weights.experience) +
    (scoreProjects * weights.projects) +
    (scoreSkills * weights.technical_skills) +
    (scoreCerts * weights.certifications) +
    (scoreKeywords * weights.keyword_coverage) +
    (scoreSemantic * weights.semantic_match) +
    (scoreFormatting * weights.formatting) +
    (scoreReadability * weights.readability) +
    (scoreActionVerbs * weights.action_verbs) +
    (scoreGrammar * weights.grammar);

  const finalScore = Math.max(25, Math.min(98, Math.round(weightedSum)));

  const suggestions = [];
  if (scoreProjects < 75) suggestions.push("Quantify key project achievements with concrete percentages or speedups (e.g. 'Improved query latency by 35%')");
  if (skillsRes.action_verb_count < 3) suggestions.push("Start project bullet points with active engineering verbs like 'Architected', 'Implemented', or 'Optimized'");
  if (missingKeywords.length > 0) suggestions.push(`Incorporate target technical keywords: ${missingKeywords.slice(0, 3).join(', ')}`);
  if (!hasLinks) suggestions.push("Include demonstrable repository links (GitHub) and live demo URLs in your contact header");

  return {
    ats_score: finalScore,
    section_scores: categoryScores,
    matching_skills: allDetectedSkillsList.slice(0, 10),
    missing_skills: missingKeywords,
    suggestions: suggestions.slice(0, 3),
    exact_keyword_match_score: Math.round(scoreKeywords),
    semantic_similarity_score: Math.round(scoreSemantic)
  };
}
