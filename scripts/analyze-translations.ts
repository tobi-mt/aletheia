#!/usr/bin/env ts-node

/**
 * Translation Extraction and Analysis Tool
 * 
 * This script:
 * 1. Extracts all UI translations from aletheia-app.tsx
 * 2. Generates separate JSON files for each language
 * 3. Identifies missing translations
 * 4. Creates a coverage report
 * 5. Catalogues hard-coded strings
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const COMPONENT_FILE = path.join(PROJECT_ROOT, 'src/components/aletheia-app.tsx');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'src/locales');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'translation-reports');

interface TranslationData {
  [key: string]: any;
}

interface LanguageCoverage {
  language: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  coveragePercent: number;
}

interface HardCodedString {
  line: number;
  context: string;
  string: string;
  category: 'notification' | 'status' | 'error' | 'label' | 'message' | 'unknown';
}

// Language configuration
const LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'yo', 'ig', 'ha'] as const;
type Language = typeof LANGUAGES[number];

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  de: 'Deutsch',
  yo: 'Yorùbá',
  ig: 'Igbo',
  ha: 'Hausa',
};

/**
 * Extract all translation keys from English (master)
 */
function getAllTranslationKeys(data: TranslationData, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllTranslationKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get value from nested object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, part) => current?.[part], obj);
}

/**
 * Compare translations and find missing keys
 */
function analyzeCoverage(masterLang: TranslationData, targetLang: TranslationData, langCode: string): LanguageCoverage {
  const allKeys = getAllTranslationKeys(masterLang);
  const missingKeys: string[] = [];
  
  for (const key of allKeys) {
    const value = getNestedValue(targetLang, key);
    if (value === undefined || value === null || value === '') {
      missingKeys.push(key);
    }
  }
  
  return {
    language: LANGUAGE_NAMES[langCode as Language] || langCode,
    totalKeys: allKeys.length,
    translatedKeys: allKeys.length - missingKeys.length,
    missingKeys,
    coveragePercent: Math.round(((allKeys.length - missingKeys.length) / allKeys.length) * 100),
  };
}

/**
 * Find hard-coded strings in component files
 */
function findHardCodedStrings(content: string): HardCodedString[] {
  const hardCoded: HardCodedString[] = [];
  const lines = content.split('\n');
  
  // Patterns to look for
  const patterns = [
    // announceWorkflow calls
    { regex: /announceWorkflow\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g, category: 'notification' as const },
    // setStatusMessage, setCounselInviteStatus
    { regex: /set(?:Status|CounselInvite)(?:Message|Status)\s*\(\s*"([^"]+)"/g, category: 'status' as const },
    // Error messages in returns
    { regex: /error:\s*"([^"]+)"/g, category: 'error' as const },
    // Placeholder text
    { regex: /placeholder="([^"]+)"/g, category: 'label' as const },
    // Button text and labels not in uiText
    { regex: />\s*([A-Z][^<>{}\n]{3,50})\s*</g, category: 'label' as const },
  ];
  
  patterns.forEach(({ regex, category }) => {
    lines.forEach((line, index) => {
      let match;
      while ((match = regex.exec(line)) !== null) {
        const string = match[1] || match[0];
        // Filter out variable names, JSX props, imports
        if (
          !string.includes('=') && 
          !string.includes('{') && 
          !string.includes('import') &&
          !string.includes('const') &&
          string.length > 5 &&
          /[a-z]/.test(string) // Contains lowercase (not just constants)
        ) {
          hardCoded.push({
            line: index + 1,
            context: line.trim().slice(0, 80),
            string,
            category,
          });
        }
      }
    });
  });
  
  return hardCoded;
}

/**
 * Generate markdown coverage report
 */
function generateCoverageReport(coverageData: LanguageCoverage[]): string {
  let report = '# Translation Coverage Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += '## Overall Coverage\n\n';
  report += '| Language | Progress | Translated | Missing | Coverage |\n';
  report += '|----------|----------|------------|---------|----------|\n';
  
  coverageData.forEach((coverage) => {
    const bar = '█'.repeat(Math.floor(coverage.coveragePercent / 5)) + 
                '░'.repeat(20 - Math.floor(coverage.coveragePercent / 5));
    report += `| ${coverage.language} | ${bar} | ${coverage.translatedKeys}/${coverage.totalKeys} | ${coverage.missingKeys.length} | ${coverage.coveragePercent}% |\n`;
  });
  
  report += '\n## Missing Translations by Language\n\n';
  
  coverageData.forEach((coverage) => {
    if (coverage.missingKeys.length > 0) {
      report += `### ${coverage.language} (${coverage.missingKeys.length} missing)\n\n`;
      report += '```json\n';
      report += JSON.stringify(coverage.missingKeys, null, 2);
      report += '\n```\n\n';
    }
  });
  
  return report;
}

/**
 * Generate hard-coded strings report
 */
function generateHardCodedReport(hardCoded: HardCodedString[]): string {
  let report = '# Hard-Coded Strings Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `Total hard-coded strings found: ${hardCoded.length}\n\n`;
  
  const byCategory = hardCoded.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, HardCodedString[]>);
  
  Object.entries(byCategory).forEach(([category, items]) => {
    report += `## ${category.charAt(0).toUpperCase() + category.slice(1)} (${items.length})\n\n`;
    report += '| Line | String | Context |\n';
    report += '|------|--------|----------|\n';
    
    items.slice(0, 50).forEach((item) => {
      report += `| ${item.line} | \`${item.string.slice(0, 40)}\` | \`${item.context.slice(0, 60)}\` |\n`;
    });
    
    if (items.length > 50) {
      report += `\n... and ${items.length - 50} more\n`;
    }
    
    report += '\n';
  });
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('🌍 Translation Extraction Tool\n');
  
  // Create directories
  [LOCALES_DIR, REPORTS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
  
  // Load English translation as master
  const enPath = path.join(LOCALES_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error('❌ English translation file not found. Please create en.json first.');
    process.exit(1);
  }
  
  const masterTranslation: TranslationData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  console.log(`✓ Loaded master translation (${getAllTranslationKeys(masterTranslation).length} keys)\n`);
  
  // Analyze coverage for each language
  console.log('📊 Analyzing coverage...\n');
  const coverageData: LanguageCoverage[] = [];
  
  for (const langCode of LANGUAGES) {
    const langPath = path.join(LOCALES_DIR, `${langCode}.json`);
    
    if (fs.existsSync(langPath)) {
      const translation = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
      const coverage = analyzeCoverage(masterTranslation, translation, langCode);
      coverageData.push(coverage);
      
      const emoji = coverage.coveragePercent === 100 ? '✅' : coverage.coveragePercent >= 75 ? '🟡' : '🔴';
      console.log(`${emoji} ${coverage.language}: ${coverage.coveragePercent}% (${coverage.translatedKeys}/${coverage.totalKeys})`);
    } else if (langCode !== 'en') {
      console.log(`⚠️  ${LANGUAGE_NAMES[langCode]}: No translation file found`);
    }
  }
  
  // Generate reports
  console.log('\n📄 Generating reports...\n');
  
  const coverageReport = generateCoverageReport(coverageData);
  fs.writeFileSync(path.join(REPORTS_DIR, 'coverage.md'), coverageReport);
  console.log('✓ Coverage report: translation-reports/coverage.md');
  
  // Find hard-coded strings
  if (fs.existsSync(COMPONENT_FILE)) {
    const componentContent = fs.readFileSync(COMPONENT_FILE, 'utf-8');
    const hardCoded = findHardCodedStrings(componentContent);
    
    const hardCodedReport = generateHardCodedReport(hardCoded);
    fs.writeFileSync(path.join(REPORTS_DIR, 'hard-coded-strings.md'), hardCodedReport);
    console.log('✓ Hard-coded strings report: translation-reports/hard-coded-strings.md');
    console.log(`  Found ${hardCoded.length} hard-coded strings\n`);
  }
  
  // Generate missing translations template
  console.log('📝 Generating missing translations templates...\n');
  
  for (const langCode of LANGUAGES) {
    if (langCode === 'en') continue;
    
    const langPath = path.join(LOCALES_DIR, `${langCode}.json`);
    const coverage = coverageData.find((c) => c.language === LANGUAGE_NAMES[langCode]);
    
    if (coverage && coverage.missingKeys.length > 0) {
      const template: any = {};
      coverage.missingKeys.forEach((key) => {
        const enValue = getNestedValue(masterTranslation, key);
        const keys = key.split('.');
        let current = template;
        
        keys.forEach((k, i) => {
          if (i === keys.length - 1) {
            current[k] = `[TODO: Translate] ${enValue}`;
          } else {
            current[k] = current[k] || {};
            current = current[k];
          }
        });
      });
      
      const templatePath = path.join(REPORTS_DIR, `${langCode}-missing.json`);
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
      console.log(`✓ ${LANGUAGE_NAMES[langCode]} missing keys template: translation-reports/${langCode}-missing.json`);
    }
  }
  
  console.log('\n✨ Analysis complete!\n');
  console.log('Next steps:');
  console.log('1. Review translation-reports/coverage.md');
  console.log('2. Fill in missing translations using *-missing.json templates');
  console.log('3. Address hard-coded strings in translation-reports/hard-coded-strings.md');
  console.log('4. Run this tool again to verify 100% coverage\n');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
