import { app, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as cheerio from 'cheerio';

type EducationBoard = 'CBSE' | 'Karnataka SSLC' | 'Karnataka PUC';

interface QuestionPaperRecord {
  id: string;
  board: EducationBoard;
  examClass: 10 | 11 | 12;
  year: number;
  subject: string;
  examType: 'regular' | 'compartment';
  sourceUrl: string;
  sourceLabel: string;
  sourcePageUrl: string;
  fileName: string;
  localPath?: string | null;
  textPath?: string | null;
  availableOffline?: boolean;
  extractedTextCached?: boolean;
}

interface QuestionPaperSearchFilters {
  board?: EducationBoard;
  examClass?: 10 | 11 | 12;
  year?: number;
  subjectQuery?: string;
}

interface CatalogCache {
  updatedAt: string;
  records: QuestionPaperRecord[];
}

const CBSE_SOURCE_PAGE = 'https://www.cbse.gov.in/cbsenew/question-paper.html';
const KARNATAKA_SSLC_QUESTION_PAGE = 'https://kseab.karnataka.gov.in/new-page/Question%20Papers/en';
const KARNATAKA_SSLC_2022_MAIN_PAGE = 'https://kseab.karnataka.gov.in/new-page/2022SSLCMainExaminationQuestionpapers/en';
const KARNATAKA_PUC_PAGE = 'https://dpue-exam.karnataka.gov.in/kseabdpueqpue/';
const CATALOG_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;
const BASE_DIR = path.join(app.getPath('userData'), 'question-papers');
const DOWNLOAD_DIR = path.join(BASE_DIR, 'files');
const TEXT_DIR = path.join(BASE_DIR, 'text');
const CATALOG_PATH = path.join(BASE_DIR, 'catalog.json');

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureDirectories() {
  await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
  await fs.mkdir(TEXT_DIR, { recursive: true });
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'LocalGravity/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  return response.text();
}

async function fetchBuffer(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'LocalGravity/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function parseHeading(heading: string) {
  const normalized = heading.replace(/\s+/g, ' ').trim();
  const classMatch = normalized.match(/Class\s+(XII|X|11|12)/i);
  const yearMatch = normalized.match(/(20\d{2})/);

  if (!classMatch || !yearMatch) {
    return null;
  }

  const examClass: 10 | 11 | 12 =
    classMatch[1].toUpperCase() === 'XII' || classMatch[1] === '12'
      ? 12
      : classMatch[1].toUpperCase() === 'X'
        ? 10
        : 11;
  const examType = /compartment/i.test(normalized) ? 'compartment' as const : 'regular' as const;

  return {
    examClass,
    year: Number(yearMatch[1]),
    examType,
  };
}

async function scrapeCbseCatalog(): Promise<QuestionPaperRecord[]> {
  const html = await fetchText(CBSE_SOURCE_PAGE);
  const $ = cheerio.load(html);
  const records: QuestionPaperRecord[] = [];

  $('table').each((_, table) => {
    const heading = $(table).prevAll('h2, h3, h4').first().text().replace(/\s+/g, ' ').trim();
    const parsedHeading = parseHeading(heading);
    if (!parsedHeading) {
      return;
    }

    $(table)
      .find('tr')
      .slice(1)
      .each((__, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) {
          return;
        }

        const subject = $(cells[0]).text().replace(/\s+/g, ' ').trim();
        const href = $(cells[1]).find('a').attr('href');
        if (!subject || !href) {
          return;
        }

        const sourceUrl = new URL(href, CBSE_SOURCE_PAGE).toString();
        const extension = path.extname(new URL(sourceUrl).pathname) || '.pdf';
        const id = `cbse-${parsedHeading.examClass}-${parsedHeading.year}-${parsedHeading.examType}-${slugify(subject)}`;

        records.push({
          id,
          board: 'CBSE',
          examClass: parsedHeading.examClass,
          year: parsedHeading.year,
          subject,
          examType: parsedHeading.examType,
          sourceUrl,
          sourceLabel: 'CBSE Official',
          sourcePageUrl: CBSE_SOURCE_PAGE,
          fileName: `${id}${extension}`,
          availableOffline: false,
          extractedTextCached: false,
          localPath: null,
          textPath: null,
        });
      });
  });

  return records;
}

function normalizeKarnatakaSubject(label: string) {
  return label
    .replace(/\s+/g, ' ')
    .replace(/\(Revised\)/gi, '')
    .replace(/-+\s*(Kannada Medium|English Medium)\s*-\s*/gi, ' ')
    .replace(/–\s*[A-D]\s*Version/gi, '')
    .replace(/\bVersion\b/gi, '')
    .replace(/\bTheory\b/gi, 'Theory')
    .replace(/\bPractical\b/gi, 'Practical')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function scrapeKarnatakaSslcCatalog(): Promise<QuestionPaperRecord[]> {
  const html = await fetchText(KARNATAKA_SSLC_2022_MAIN_PAGE);
  const $ = cheerio.load(html);
  const records: QuestionPaperRecord[] = [];

  $('a').each((_, anchor) => {
    const text = $(anchor).text().replace(/\s+/g, ' ').trim();
    const href = ($(anchor).attr('href') || '').trim();
    if (!text || !href.includes('2022_MAIN_EXAM_QP')) {
      return;
    }

    const sourceUrl = new URL(href, KARNATAKA_SSLC_2022_MAIN_PAGE).toString();
    const subject = normalizeKarnatakaSubject(text);
    const id = `karnataka-sslc-10-2022-regular-${slugify(subject)}`;
    const extension = path.extname(new URL(sourceUrl).pathname) || '.pdf';

    records.push({
      id,
      board: 'Karnataka SSLC',
      examClass: 10,
      year: 2022,
      subject,
      examType: 'regular',
      sourceUrl,
      sourceLabel: 'KSEAB Official',
      sourcePageUrl: KARNATAKA_SSLC_QUESTION_PAGE,
      fileName: `${id}${extension}`,
      availableOffline: false,
      extractedTextCached: false,
      localPath: null,
      textPath: null,
    });
  });

  const deduped = new Map<string, QuestionPaperRecord>();
  records.forEach((record) => {
    if (!deduped.has(record.id)) {
      deduped.set(record.id, record);
    }
  });

  return [...deduped.values()];
}

async function scrapeKarnatakaPucCatalog(): Promise<QuestionPaperRecord[]> {
  const firstPage = await fetchText(KARNATAKA_PUC_PAGE);
  const $ = cheerio.load(firstPage);

  const params = new URLSearchParams();
  params.set('__VIEWSTATE', $('#__VIEWSTATE').attr('value') || '');
  params.set('__VIEWSTATEGENERATOR', $('#__VIEWSTATEGENERATOR').attr('value') || '');
  params.set('__EVENTVALIDATION', $('#__EVENTVALIDATION').attr('value') || '');
  params.set('ctl00$MainContent$btn2025', 'VIEW');

  const response = await fetch(KARNATAKA_PUC_PAGE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LocalGravity/1.0',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Karnataka PUC catalog: ${response.statusText}`);
  }

  const html = await response.text();
  const $$ = cheerio.load(html);
  const records: QuestionPaperRecord[] = [];

  $$('a').each((_, anchor) => {
    const text = $$(anchor).text().replace(/\s+/g, ' ').trim();
    const href = ($$(anchor).attr('href') || '').trim();
    if (!text || !href.startsWith('qp2026/')) {
      return;
    }

    const sourceUrl = new URL(href, KARNATAKA_PUC_PAGE).toString();
    const subject = normalizeKarnatakaSubject(text.replace(/^\d+\s*[-–]\s*/g, ''));
    const id = `karnataka-puc-12-2025-regular-${slugify(subject)}`;
    const extension = path.extname(new URL(sourceUrl).pathname) || '.pdf';

    records.push({
      id,
      board: 'Karnataka PUC',
      examClass: 12,
      year: 2025,
      subject,
      examType: 'regular',
      sourceUrl,
      sourceLabel: 'KSEAB Official',
      sourcePageUrl: KARNATAKA_PUC_PAGE,
      fileName: `${id}${extension}`,
      availableOffline: false,
      extractedTextCached: false,
      localPath: null,
      textPath: null,
    });
  });

  const deduped = new Map<string, QuestionPaperRecord>();
  records.forEach((record) => {
    if (!deduped.has(record.id)) {
      deduped.set(record.id, record);
    }
  });

  return [...deduped.values()];
}

async function readCatalog(): Promise<CatalogCache | null> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, 'utf-8');
    return JSON.parse(raw) as CatalogCache;
  } catch {
    return null;
  }
}

async function writeCatalog(records: QuestionPaperRecord[]) {
  await ensureDirectories();
  const payload: CatalogCache = {
    updatedAt: new Date().toISOString(),
    records,
  };
  await fs.writeFile(CATALOG_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

async function hydrateCachedPaths(records: QuestionPaperRecord[]) {
  return records.map((record) => {
    const localPath = path.join(DOWNLOAD_DIR, record.fileName);
    const textPath = path.join(TEXT_DIR, `${record.id}.txt`);
    return {
      ...record,
      localPath: fsSync.existsSync(localPath) ? localPath : null,
      textPath: fsSync.existsSync(textPath) ? textPath : null,
      availableOffline: fsSync.existsSync(localPath),
      extractedTextCached: fsSync.existsSync(textPath),
    };
  });
}

async function ensureCatalog(forceRefresh = false): Promise<QuestionPaperRecord[]> {
  const existing = await readCatalog();
  const isFresh = existing && Date.now() - new Date(existing.updatedAt).getTime() < CATALOG_REFRESH_MS;

  if (!forceRefresh && existing && isFresh) {
    return hydrateCachedPaths(existing.records);
  }

  const [cbse, karnatakaSslc, karnatakaPuc] = await Promise.all([
    scrapeCbseCatalog(),
    scrapeKarnatakaSslcCatalog(),
    scrapeKarnatakaPucCatalog(),
  ]);
  const hydrated = await hydrateCachedPaths([...cbse, ...karnatakaSslc, ...karnatakaPuc]);
  await writeCatalog(hydrated);
  return hydrated;
}

function scoreRecord(record: QuestionPaperRecord, filters: QuestionPaperSearchFilters) {
  let score = 0;

  if (filters.board && record.board === filters.board) {
    score += 10;
  }
  if (filters.examClass && record.examClass === filters.examClass) {
    score += 8;
  }
  if (filters.year && record.year === filters.year) {
    score += 8;
  }
  if (filters.subjectQuery) {
    const query = filters.subjectQuery.toLowerCase();
    const subject = record.subject.toLowerCase();
    if (subject === query) {
      score += 12;
    } else if (subject.includes(query)) {
      score += 8;
    } else {
      const queryParts = query.split(/\s+/).filter(Boolean);
      const matches = queryParts.filter((part) => subject.includes(part)).length;
      score += matches * 2;
    }
  }

  if (record.examType === 'regular') {
    score += 1;
  }

  return score;
}

async function searchQuestionPapers(filters: QuestionPaperSearchFilters) {
  const catalog = await ensureCatalog();
  const filtered = catalog.filter((record) => {
    if (filters.board && record.board !== filters.board) {
      return false;
    }
    if (filters.examClass && record.examClass !== filters.examClass) {
      return false;
    }
    if (filters.year && record.year !== filters.year) {
      return false;
    }
    if (filters.subjectQuery) {
      const query = filters.subjectQuery.toLowerCase();
      const subject = record.subject.toLowerCase();
      if (!subject.includes(query) && !query.split(/\s+/).some((part) => subject.includes(part))) {
        return false;
      }
    }
    return true;
  });

  return filtered.sort((left, right) => scoreRecord(right, filters) - scoreRecord(left, filters)).slice(0, 20);
}

async function getQuestionPaperContent(paperId: string) {
  const catalog = await ensureCatalog();
  const paper = catalog.find((record) => record.id === paperId);
  if (!paper) {
    throw new Error('Question paper not found in the local catalog');
  }

  await ensureDirectories();

  const localPath = path.join(DOWNLOAD_DIR, paper.fileName);
  const textPath = path.join(TEXT_DIR, `${paper.id}.txt`);

  if (!fsSync.existsSync(localPath)) {
    const buffer = await fetchBuffer(paper.sourceUrl);
    await fs.writeFile(localPath, buffer);
  }

  let extractedText = '';
  if (fsSync.existsSync(textPath)) {
    extractedText = await fs.readFile(textPath, 'utf-8');
  } else {
    const buffer = await fs.readFile(localPath);
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      extractedText = parsed.text.replace(/\u0000/g, ' ').replace(/\s+\n/g, '\n').trim();
    } catch (error) {
      throw new Error(
        `Question paper was downloaded, but PDF text extraction is unavailable in this runtime: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
    await fs.writeFile(textPath, extractedText, 'utf-8');
  }

  const updatedCatalog = catalog.map((record) =>
    record.id === paper.id
      ? {
          ...record,
          localPath,
          textPath,
          availableOffline: true,
          extractedTextCached: true,
        }
      : record,
  );
  await writeCatalog(updatedCatalog);

  return {
    paper: updatedCatalog.find((record) => record.id === paper.id)!,
    extractedText,
    localPath,
  };
}

export function setupQuestionPaperHandlers() {
  ipcMain.handle('question-papers-refresh', async () => {
    const catalog = await ensureCatalog(true);
    return { success: true, count: catalog.length };
  });

  ipcMain.handle('question-papers-search', async (_, filters: QuestionPaperSearchFilters) => {
    return searchQuestionPapers(filters ?? {});
  });

  ipcMain.handle('question-papers-get-content', async (_, paperId: string) => {
    if (!paperId) {
      throw new Error('Question paper id is required');
    }

    return getQuestionPaperContent(paperId);
  });
}
