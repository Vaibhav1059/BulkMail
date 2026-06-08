// CSV Parser utility for bulk email client

export function parseCSV(rawText) {
  if (!rawText || !rawText.trim()) {
    return { headers: [], rows: [], error: 'Empty file content.' };
  }

  try {
    const lines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return { headers: [], rows: [], error: 'No records found.' };
    }

    // Parse headers (first line)
    const headers = parseCSVLine(lines[0]);
    if (!headers || headers.length === 0) {
      return { headers: [], rows: [], error: 'Failed to parse headers.' };
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = values[index] !== undefined ? values[index].trim() : '';
      });
      rows.push(rowObj);
    }

    return { headers, rows, error: null };
  } catch (err) {
    return { headers: [], rows: [], error: 'Invalid CSV format: ' + err.message };
  }
}

// Helper to parse a single CSV line correctly handling quotes and commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

export function validateEmailDetails(email) {
  const emailStr = String(email).trim().toLowerCase();
  
  if (!emailStr) {
    return { valid: false, reason: 'Missing email address' };
  }

  // 1. Syntactical Regex check
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(emailStr)) {
    return { valid: false, reason: 'Malformed email syntax' };
  }
  
  const [localPart, domain] = emailStr.split('@');

  // 2. Minimum length of local-part (e.g. x@gmail.com is invalid/suspicious)
  if (localPart.length < 2) {
    return { valid: false, reason: 'Email username too short (minimum 2 characters)' };
  }

  // 3. Check for repeating character spam in username (e.g., aaaa@domain.com)
  if (/^(.)\1{3,}$/.test(localPart)) {
    return { valid: false, reason: 'Suspicious repeating characters in username' };
  }

  // 4. Block common placeholder/dummy usernames
  const dummyUsernames = ['spammer', 'dummy', 'test', 'testing', 'placeholder', 'none', 'null', 'temp'];
  if (dummyUsernames.includes(localPart)) {
    return { valid: false, reason: 'Contains dummy/placeholder username' };
  }
  
  // 5. Blocklist of RFC-reserved and generic dummy domains
  const dummyDomains = [
    'example.com', 'example.org', 'example.net', 'example.edu',
    'test.com', 'testing.com', 'domain.com', 'placeholder.com',
    'bounce.host', 'localhost'
  ];
  if (dummyDomains.includes(domain)) {
    return { valid: false, reason: 'Disallowed dummy/testing domain (e.g. example.com)' };
  }
  
  // 6. Blocklist of known disposable/temporary domains
  const disposableDomains = [
    'mailinator.com', 'yopmail.com', 'tempmail.com', 
    'guerrillamail.com', 'sharklasers.com', 'dispostable.com', 
    'getairmail.com', 'throwawaymail.com', 'temp-mail.org'
  ];
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: 'Disposable/temporary email host' };
  }

  return { valid: true };
}

export function validateEmail(email) {
  return validateEmailDetails(email).valid;
}

export function generateValidationReport(rows, emailKey) {
  const seenEmails = new Set();
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  const analyzedRows = rows.map((row, index) => {
    const emailVal = (row[emailKey] || '').trim();
    let status = 'Valid';
    let reason = '';

    const validation = validateEmailDetails(emailVal);

    if (!emailVal) {
      status = 'Invalid';
      reason = 'Missing email address';
      invalidCount++;
    } else if (!validation.valid) {
      status = 'Invalid';
      reason = validation.reason;
      invalidCount++;
    } else if (seenEmails.has(emailVal.toLowerCase())) {
      status = 'Duplicate';
      reason = 'Duplicate email address';
      duplicateCount++;
    } else {
      seenEmails.add(emailVal.toLowerCase());
      validCount++;
    }

    return {
      index: index + 1,
      data: row,
      email: emailVal,
      status,
      reason
    };
  });

  return {
    rows: analyzedRows,
    summary: {
      total: rows.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: duplicateCount
    }
  };
}
