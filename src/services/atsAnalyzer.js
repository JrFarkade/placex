// PlaceX ATS Resume Analysis & Document Classifier Engine
// Faithful Edge Port of backend/app/resume_service/
import { extractText as extractPdfText } from 'unpdf';

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
  "question paper", "syllabus", "user manual", "manga", "chapter"
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

export async function extractTextFromBuffer(buffer, filename = "") {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    return { text: "", status: "EXTRACTION_FAILED", error: "File is empty." };
  }

  const isPdf = filename.toLowerCase().endsWith('.pdf') || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  const isDocx = filename.toLowerCase().endsWith('.docx') || (bytes[0] === 0x50 && bytes[1] === 0x4B);

  if (!isPdf && !isDocx) {
    return { text: "", status: "INVALID_FORMAT", error: "Unsupported file format. Please upload a PDF or DOCX file." };
  }

  let text = "";
  let totalPages = 0;

  if (isPdf) {
    try {
      const res = await extractPdfText(bytes);
      totalPages = res.totalPages || 0;
      if (Array.isArray(res.text)) {
        text = res.text.join("\n").trim();
      } else if (typeof res.text === 'string') {
        text = res.text.trim();
      }
    } catch (e) {
      return { text: "", status: "EXTRACTION_FAILED", pageCount: 0, characterCount: 0, error: e.message };
    }

    const clean = text.replace(/\s+/g, '');
    if (clean.length === 0 && totalPages > 0) {
      return { text: "", status: "IMAGE_ONLY", pageCount: totalPages, characterCount: 0 };
    }
    if (clean.length < 20) {
      return { text: "", status: "EXTRACTION_FAILED", pageCount: totalPages, characterCount: clean.length };
    }
  } else {
    // DOCX handling
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawString = decoder.decode(bytes);
    const xmlMatches = rawString.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    if (xmlMatches.length > 0) {
      text = xmlMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(" ");
    } else {
      const asciiRuns = rawString.match(/[A-Za-z0-9@\.\-\+\#\/ ]{4,}/g) || [];
      text = asciiRuns.join(" ");
    }
    if (text.length < 25) {
      return { text: "", status: "EXTRACTION_FAILED", error: "Could not extract readable text from document." };
    }
  }

  return { text, status: "SUCCESS", pageCount: totalPages, characterCount: text.length };
}

export function classifyDocument(text, extractionStatus = "SUCCESS") {
  if (extractionStatus === "IMAGE_ONLY") {
    return {
      doc_type: DocumentType.IMAGE_ONLY,
      confidence_score: 0.0,
      is_valid_resume: false,
      signals: [],
      red_flags: ["PDF appears to contain images rather than selectable text."],
      message: "This PDF appears to contain images rather than selectable text. Please upload a text-based PDF or enable OCR."
    };
  }

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

  const hasEmail = /[\w\.-]+@[\w\.-]+\.\w+/.test(text);
  const hasPhone = /\+?\d[\d\s-]{8,}/.test(text);
  const hasLinks = ['linkedin', 'github', 'leetcode', 'portfolio', 'hackerrank'].some(domain => textLower.includes(domain));

  if (hasEmail) { score += 15.0; signals.push("Email address found"); }
  if (hasPhone) { score += 10.0; signals.push("Phone number found"); }
  if (hasLinks) { score += 10.0; signals.push("Professional link found"); }

  const detectedHeadings = RESUME_HEADINGS.filter(h => new RegExp('\\b' + h.replace('+', '\\+') + '\\b', 'i').test(textLower));
  score += Math.min(40.0, detectedHeadings.length * 10.0);
  if (detectedHeadings.length > 0) {
    signals.push(`Headings: ${detectedHeadings.slice(0, 4).join(', ')}`);
  }

  const hasSkills = ['python', 'java', 'c++', 'sql', 'react', 'html', 'css', 'javascript', 'node', 'git'].some(s => textLower.includes(s));
  const hasDegrees = ['b.tech', 'b.e.', 'b.s.', 'm.tech', 'bachelor', 'master', 'gpa', 'cgpa', 'university', 'college'].some(d => textLower.includes(d));
  const hasActionVerbs = ['developed', 'built', 'designed', 'implemented', 'managed', 'created'].some(v => textLower.includes(v));

  if (hasSkills) score += 10.0;
  if (hasDegrees) score += 10.0;
  if (hasActionVerbs) score += 5.0;

  for (const flag of NON_RESUME_RED_FLAGS) {
    if (textLower.includes(flag)) {
      redFlags.push(flag);
      score -= 30.0;
    }
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 2500) {
    score -= 20.0;
    redFlags.push("Excessive word count (>2500 words)");
  }

  // Fresher / Student resume protection rule
  if ((hasEmail || hasPhone) && hasDegrees && (hasSkills || detectedHeadings.some(h => ['projects', 'skills', 'internship'].includes(h)))) {
    score = Math.max(score, 75.0);
  }

  const finalScore = Math.max(0.0, Math.min(100.0, Math.round(score * 10) / 10));

  let docType = DocumentType.NON_RESUME;
  let isValid = false;
  let message = "";

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

export function parseResume(text) {
  const textLower = text.toLowerCase();
  const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  const phoneMatch = text.match(/\+?\d[\d\s-]{8,}/);
  const links = text.match(/https?:\/\/[^\s]+|(?:linkedin\.com|github\.com|leetcode\.com)\/[^\s]+/gi) || [];

  const skillsByCategory = {};
  let totalSkillsDetected = 0;
  for (const [category, skills] of Object.entries(STANDARD_SKILLS_DB)) {
    const found = [];
    for (const skill of skills) {
      const pattern = new RegExp('\\b' + skill.replace('+', '\\+') + '\\b', 'i');
      if (pattern.test(textLower)) {
        found.push(skill.toUpperCase() === 'SQL' || skill.toUpperCase() === 'HTML' || skill.toUpperCase() === 'CSS' || skill.toUpperCase() === 'AWS' || skill.toUpperCase() === 'GCP' || skill.toUpperCase() === 'OOP' ? skill.toUpperCase() : (skill.charAt(0).toUpperCase() + skill.slice(1)));
      }
    }
    skillsByCategory[category] = found;
    if (category !== 'Action Verbs') totalSkillsDetected += found.length;
  }

  const hasEducation = ['education', 'academic', 'bachelor', 'b.tech', 'university', 'college'].some(k => textLower.includes(k));
  const hasExperience = ['experience', 'employment', 'internship', 'internships'].some(k => textLower.includes(k));
  const hasProjects = ['project', 'projects'].some(k => textLower.includes(k));
  const hasCerts = ['certifications', 'certification', 'certificates', 'achievements'].some(k => textLower.includes(k));

  return {
    personal_info: {
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      links: Array.from(new Set(links))
    },
    education: hasEducation ? [true] : [],
    experience: hasExperience ? [true] : [],
    projects: hasProjects ? [true] : [],
    certifications: hasCerts ? [true] : [],
    skills: skillsByCategory,
    total_skills_detected: totalSkillsDetected
  };
}

export function evaluateModeA(parsed, text) {
  let sectionsFound = 0;
  if (parsed.education && parsed.education.length) sectionsFound += 1;
  if (parsed.experience && parsed.experience.length) sectionsFound += 1;
  if (parsed.projects && parsed.projects.length) sectionsFound += 1;
  if (parsed.total_skills_detected > 0) sectionsFound += 1;
  if (parsed.certifications && parsed.certifications.length) sectionsFound += 1;

  const scoreStructure = Math.min(100.0, (sectionsFound / 4.0) * 100.0);

  let contactPts = 0;
  if (parsed.personal_info.email) contactPts += 1;
  if (parsed.personal_info.phone) contactPts += 1;
  if (parsed.personal_info.links && parsed.personal_info.links.length > 0) contactPts += 1;
  const scoreContact = Math.min(100.0, (contactPts / 3.0) * 100.0);

  const scoreSkills = Math.min(100.0, (parsed.total_skills_detected / 7.0) * 100.0);

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const scoreFormatting = (wordCount >= 200 && wordCount <= 900) ? 95.0 : (wordCount <= 1400 ? 75.0 : 50.0);

  const actionCount = (parsed.skills['Action Verbs'] || []).length;
  const scoreActionVerbs = Math.min(100.0, (actionCount / 4.0) * 100.0);

  const resumeQualityScore = Math.round(
    ((scoreStructure * 0.25) +
    (scoreContact * 0.20) +
    (scoreSkills * 0.25) +
    (scoreFormatting * 0.15) +
    (scoreActionVerbs * 0.15)) * 10
  ) / 10;

  const suggestions = [];
  if (scoreContact < 100.0) suggestions.push('Ensure your resume explicitly includes an email address, phone number, and LinkedIn/GitHub links.');
  if (scoreSkills < 70.0) suggestions.push('List relevant technical skills, programming languages, databases, and developer tools in a dedicated Skills section.');
  if (scoreActionVerbs < 70.0) suggestions.push('Use strong action verbs like "Architected", "Optimized", "Engineered", or "Spearheaded" to start bullet points.');
  if (!parsed.projects || parsed.projects.length === 0) suggestions.push('Include 1–2 practical projects with tech stack details and measurable results.');

  return {
    analysis_mode: 'MODE_A_RESUME_HEALTH_CHECK',
    resume_quality_score: resumeQualityScore,
    section_scores: {
      'Section Structure': Math.round(scoreStructure * 10) / 10,
      'Contact Completeness': Math.round(scoreContact * 10) / 10,
      'Skills Coverage': Math.round(scoreSkills * 10) / 10,
      'Formatting & Readability': Math.round(scoreFormatting * 10) / 10,
      'Action Verbs': Math.round(scoreActionVerbs * 10) / 10
    },
    suggestions,
    note: 'Mode A evaluates overall structural health. Provide a Job Description to enable Mode B Job Match analysis.'
  };
}

export function evaluateModeB(parsed, text, jobDescription) {
  const healthCheck = evaluateModeA(parsed, text);
  const jdTextLower = jobDescription.toLowerCase();
  const resTextLower = text.toLowerCase();

  const jdWords = new Set(jdTextLower.match(/\b[a-zA-Z0-9\+\#\.]{3,}\b/g) || []);
  const stopWords = new Set(["with", "that", "this", "from", "have", "will", "your", "must", "work", "team", "years", "experience", "role"]);
  for (const sw of stopWords) jdWords.delete(sw);

  const resWords = new Set(resTextLower.match(/\b[a-zA-Z0-9\+\#\.]{3,}\b/g) || []);

  const matchingKeywords = Array.from(jdWords).filter(w => resWords.has(w));
  const missingKeywords = Array.from(jdWords).filter(w => !resWords.has(w));

  const displayMissing = missingKeywords.filter(k => k.length >= 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)).slice(0, 8);
  const displayMatching = matchingKeywords.filter(k => k.length >= 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)).slice(0, 10);

  const exactMatchScore = jdWords.size > 0 ? Math.min(100.0, (matchingKeywords.length / jdWords.size) * 100.0) : 75.0;

  const set1 = new Set(resTextLower.match(/\w{4,}/g) || []);
  const set2 = new Set(jdTextLower.match(/\w{4,}/g) || []);
  const union = new Set([...set1, ...set2]);
  const intersection = Array.from(set1).filter(w => set2.has(w));
  const jaccard = union.size > 0 ? (intersection.length / union.size) : 0.25;
  const semanticScore = Math.max(30.0, Math.min(100.0, Math.round(jaccard * 250.0 * 10) / 10));

  const matchScore = Math.round(((exactMatchScore * 0.5) + (semanticScore * 0.5)) * 10) / 10;

  const suggestions = [];
  if (displayMissing.length > 0) {
    const topMissing = displayMissing.slice(0, 3).join(', ');
    suggestions.push(`If you genuinely have experience with technologies like ${topMissing}, consider adding them to your skills or project descriptions.`);
  }
  if (matchingKeywords.length < 5) {
    suggestions.push("Align your project bullet points with the key tools and methodologies highlighted in the job description.");
  }

  return {
    analysis_mode: "MODE_B_JOB_MATCH_ANALYSIS",
    placex_match_score: matchScore,
    ats_compatibility_score: matchScore,
    resume_quality_score: healthCheck.resume_quality_score,
    semantic_similarity_score: Math.round(semanticScore),
    exact_keyword_match_score: Math.round(exactMatchScore),
    matching_skills: displayMatching,
    missing_skills: displayMissing,
    suggestions
  };
}

export function evaluateATS(text, targetJd = "") {
  const parsed = parseResume(text);
  if (targetJd && targetJd.trim().length > 20) {
    const res = evaluateModeB(parsed, text, targetJd);
    return {
      ats_score: res.placex_match_score,
      ...res
    };
  } else {
    const res = evaluateModeA(parsed, text);
    return {
      ats_score: res.resume_quality_score,
      ...res
    };
  }
}
