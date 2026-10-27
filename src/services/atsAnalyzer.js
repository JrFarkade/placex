// PlaceX ATS Resume Analysis & Document Classifier Engine
// Faithful Edge Port of backend/app/resume_service/
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';

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

async function extractDocxText(bytes) {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;
    while (offset < bytes.length - 30) {
      if (view.getUint32(offset, true) === 0x04034b50) {
        const compMethod = view.getUint16(offset + 8, true);
        const compSize = view.getUint32(offset + 18, true);
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);
        const nameBytes = bytes.slice(offset + 30, offset + 30 + nameLen);
        const name = new TextDecoder().decode(nameBytes);
        const dataStart = offset + 30 + nameLen + extraLen;
        if (name === 'word/document.xml') {
          const compData = bytes.slice(dataStart, dataStart + compSize);
          let xml = '';
          if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compData);
            writer.close();
            const res = new Response(ds.readable);
            xml = await res.text();
          } else {
            xml = new TextDecoder().decode(compData);
          }
          const matches = xml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
          return matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
        }
        offset = dataStart + compSize;
      } else {
        offset++;
      }
    }
  } catch (e) {
    // Fallback to regex text extraction
  }
  return '';
}

async function decompressPdfStream(buf) {
  if (!buf || buf.length === 0) return '';
  try {
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(buf);
    writer.close();
    const res = new Response(ds.readable);
    const arr = await res.arrayBuffer();
    return new TextDecoder('latin1').decode(arr);
  } catch (e) {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(buf);
      writer.close();
      const res = new Response(ds.readable);
      const arr = await res.arrayBuffer();
      return new TextDecoder('latin1').decode(arr);
    } catch (e2) {
      try {
        return zlib.inflateSync(buf).toString('latin1');
      } catch (e3) {
        return '';
      }
    }
  }
}

export async function extractPdfTextPure(buffer) {
  try {
    const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const str = bytes.toString('latin1');

    // 1. Map font names to ToUnicode CMap object IDs
    const fontToUnicode = {};
    const fontDictRegex = /\/Font\s*<<([^>]*)>>/g;
    let fdm;
    while ((fdm = fontDictRegex.exec(str)) !== null) {
      const fdict = fdm[1];
      const itemRegex = /\/([A-Za-z0-9]+)\s+(\d+)\s+(\d+)\s+R/g;
      let im;
      while ((im = itemRegex.exec(fdict)) !== null) {
        const fname = im[1];
        const fobj = im[2];
        const foPattern = new RegExp('\\b' + fobj + '\\s+\\d+\\s+obj[\\r\\n\\s]*<<([^>]*)>>');
        const foMatch = foPattern.exec(str);
        if (foMatch) {
          const fbody = foMatch[1];
          const tuMatch = /\/ToUnicode\s+(\d+)\s+(\d+)\s+R/.exec(fbody);
          if (tuMatch) {
            fontToUnicode[fname] = parseInt(tuMatch[1], 10);
          }
        }
      }
    }

    // 2. Parse all ToUnicode CMaps
    const cmaps = {};
    for (const [fname, tuId] of Object.entries(fontToUnicode)) {
      const tuPattern = new RegExp('\\b' + tuId + '\\s+\\d+\\s+obj[\\r\\n\\s]*<<([^>]*)>>[\\r\\n\\s]*stream[\\r\\n]+([\\s\\S]*?)[\\r\\n]+endstream');
      const tuMatch = tuPattern.exec(str);
      if (tuMatch) {
        const sdata = Buffer.from(tuMatch[2], 'latin1');
        const decomp = await decompressPdfStream(sdata);

        const cmap = {};
        const bfcharRegex = /beginbfchar[\r\n\s]*([\s\S]*?)[\r\n\s]*endbfchar/g;
        let bf;
        while ((bf = bfcharRegex.exec(decomp)) !== null) {
          const lines = bf[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g) || [];
          for (const l of lines) {
            const p = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(l);
            if (p) {
              const src = parseInt(p[1], 16);
              const destHex = p[2];
              let destStr = '';
              for (let k = 0; k < destHex.length; k += 4) {
                destStr += String.fromCharCode(parseInt(destHex.slice(k, k + 4), 16));
              }
              cmap[src] = destStr;
            }
          }
        }

        const bfrangeRegex = /beginbfrange[\r\n\s]*([\s\S]*?)[\r\n\s]*endbfrange/g;
        let bfr;
        while ((bfr = bfrangeRegex.exec(decomp)) !== null) {
          const lines = bfr[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g) || [];
          for (const l of lines) {
            const p = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(l);
            if (p) {
              const start = parseInt(p[1], 16);
              const end = parseInt(p[2], 16);
              let dest = parseInt(p[3], 16);
              for (let c = start; c <= end; c++) {
                cmap[c] = String.fromCharCode(dest++);
              }
            }
          }
        }
        cmaps[fname] = cmap;
      }
    }

    // 3. Extract text from content streams tracking font state
    const extractedText = [];
    const contentRegex = /<<([^>]*)>>[\r\n\s]*stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let cm;
    const pageMatches = str.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : 1;

    while ((cm = contentRegex.exec(str)) !== null) {
      const dictHdr = cm[1];
      const sdata = Buffer.from(cm[2], 'latin1');
      let decomp = '';
      if (dictHdr.includes('/FlateDecode')) {
        decomp = await decompressPdfStream(sdata);
      } else {
        decomp = sdata.toString('latin1');
      }

      if (decomp && (decomp.includes('BT') || decomp.includes('TJ') || decomp.includes('Tj'))) {
        let currentFont = null;
        const tokenRegex = /(\/([A-Za-z0-9]+)\s+[\d\.]+\s+Tf)|(\[([\s\S]*?)\]\s*TJ)|((\((?:[^\\)]|\\.)*\)|<[0-9a-fA-F]+>)\s*Tj)|([-\d\.]+\s+([-\d\.]+)\s+T[dD])|(T\*)|(ET)/g;
        let tok;
        while ((tok = tokenRegex.exec(decomp)) !== null) {
          if (tok[1]) {
            currentFont = tok[2];
          } else if (tok[3]) {
            const content = tok[4];
            const parts = content.match(/<([0-9a-fA-F]+)>|\(((?:[^\\)]|\\.)*)\)|([-\d\.]+)/g) || [];
            const curCmap = cmaps[currentFont] || {};
            for (const p of parts) {
              if (p.startsWith('<')) {
                const hexStr = p.slice(1, -1);
                for (let i = 0; i < hexStr.length; i += 4) {
                  const code = parseInt(hexStr.slice(i, i + 4), 16);
                  extractedText.push(curCmap[code] !== undefined ? curCmap[code] : String.fromCharCode(code));
                }
              } else if (p.startsWith('(')) {
                extractedText.push(p.slice(1, -1));
              } else {
                const num = parseFloat(p);
                if (num < -120) {
                  extractedText.push(' ');
                }
              }
            }
          } else if (tok[5]) {
            const strMatch = tok[6];
            const curCmap = cmaps[currentFont] || {};
            if (strMatch.startsWith('<')) {
              const hexStr = strMatch.slice(1, -1);
              for (let i = 0; i < hexStr.length; i += 4) {
                const code = parseInt(hexStr.slice(i, i + 4), 16);
                extractedText.push(curCmap[code] !== undefined ? curCmap[code] : String.fromCharCode(code));
              }
            } else if (strMatch.startsWith('(')) {
              extractedText.push(strMatch.slice(1, -1));
            }
          } else if (tok[7]) {
            const dy = Math.abs(parseFloat(tok[8]));
            const dx = parseFloat(tok[7].split(' ')[0]);
            if (dy > 2) extractedText.push('\n');
            else if (dx > 30) extractedText.push(' ');
          } else if (tok[9] || tok[10]) {
            extractedText.push('\n');
          }
        }
      }
    }

    let fullText = extractedText.join('')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    // Fallback: If fullText is empty or very short (<25 chars), scan for uncompressed text streams or ASCII runs
    if (fullText.length < 25) {
      const rawMatches = str.match(/\(([^\(\)\\]{3,})\)/g) || [];
      if (rawMatches.length > 5) {
        const candidate = rawMatches.map(m => m.slice(1, -1)).join(' ').trim();
        if (candidate.length > fullText.length) {
          fullText = candidate;
        }
      }
    }

    const cleanLen = fullText.replace(/\s+/g, '').length;
    if (cleanLen === 0) {
      const hasImages = str.includes('/Image') || str.includes('/XObject') || str.includes('/Subtype/Image');
      if (hasImages || pageCount > 0) {
        return { text: "", status: "IMAGE_ONLY", pageCount, characterCount: 0 };
      }
      return { text: "", status: "EXTRACTION_FAILED", pageCount, characterCount: 0, error: "No readable text found in PDF." };
    }

    if (cleanLen < 20) {
      return { text: "", status: "EXTRACTION_FAILED", pageCount, characterCount: cleanLen, error: "Text extracted was insufficient." };
    }

    return { text: fullText, status: "SUCCESS", pageCount, characterCount: fullText.length };
  } catch (err) {
    return { text: "", status: "EXTRACTION_FAILED", pageCount: 0, characterCount: 0, error: err.message };
  }
}

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

  if (isPdf) {
    return await extractPdfTextPure(bytes);
  } else {
    // DOCX handling
    let text = "";
    const docxText = await extractDocxText(bytes);
    if (docxText && docxText.length >= 25) {
      text = docxText;
    } else {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawString = decoder.decode(bytes);
      const xmlMatches = rawString.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      if (xmlMatches.length > 0) {
        text = xmlMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(" ");
      } else {
        const asciiRuns = rawString.match(/[A-Za-z0-9@\.\-\+\#\/ ]{4,}/g) || [];
        text = asciiRuns.join(" ");
      }
    }
    if (text.length < 25) {
      return { text: "", status: "EXTRACTION_FAILED", error: "Could not extract readable text from document." };
    }
    return { text, status: "SUCCESS", pageCount: 1, characterCount: text.length };
  }
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
