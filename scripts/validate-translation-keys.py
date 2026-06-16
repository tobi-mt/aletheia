#!/usr/bin/env python3
"""
Validate that all locale files have identical key structures.
This ensures no translation keys are missing across the 11 supported languages.

Usage:
  python3 scripts/validate-translation-keys.py
  
Exit codes:
  0 = All translations valid
  1 = Validation failed (missing/extra keys detected)
"""

import json
import os
import sys
from collections import defaultdict
from pathlib import Path

def get_all_keys(obj, prefix=''):
    """Recursively get all keys from a nested JSON object."""
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            if isinstance(v, dict):
                keys.update(get_all_keys(v, full_key))
    return keys

def validate_translations(locales_dir='src/locales'):
    """Validate that all locale files have identical key structures."""
    
    if not os.path.exists(locales_dir):
        print(f"❌ ERROR: Directory {locales_dir} not found")
        return False
    
    languages = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'ha', 'ig', 'yo', 'hi', 'tl']
    all_locales = {}
    
    # Load all locale files
    print(f"Loading locale files from {locales_dir}...\n")
    
    for lang in languages:
        filepath = os.path.join(locales_dir, f'{lang}.json')
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                all_locales[lang] = json.load(f)
                print(f"  ✓ {lang.upper():3} loaded")
        except FileNotFoundError:
            print(f"  ✗ {lang.upper():3} NOT FOUND: {filepath}")
            return False
        except json.JSONDecodeError as e:
            print(f"  ✗ {lang.upper():3} INVALID JSON: {e}")
            return False
    
    print("\nValidating key consistency...\n")
    
    # Get all keys from each language
    lang_keys = {lang: get_all_keys(all_locales[lang]) for lang in languages}
    
    # Reference is English
    ref_keys = lang_keys['en']
    ref_key_count = len(ref_keys)
    
    print(f"Reference (EN): {ref_key_count} keys\n")
    
    # Check each language
    errors = []
    warnings = []
    
    for lang in languages[1:]:  # Skip English
        current_keys = lang_keys[lang]
        current_count = len(current_keys)
        
        missing = ref_keys - current_keys
        extra = current_keys - ref_keys
        
        status_icon = "✓"
        if missing or extra:
            status_icon = "✗"
        
        print(f"{status_icon} {lang.upper():3}: {current_count} keys", end="")
        
        if missing or extra:
            print()
            if missing:
                errors.append((lang, 'missing', sorted(missing)))
                print(f"    Missing {len(missing)} keys:")
                for key in sorted(missing)[:5]:  # Show first 5
                    print(f"      - {key}")
                if len(missing) > 5:
                    print(f"      ... and {len(missing) - 5} more")
            
            if extra:
                warnings.append((lang, 'extra', sorted(extra)))
                print(f"    Extra {len(extra)} keys:")
                for key in sorted(extra)[:5]:  # Show first 5
                    print(f"      + {key}")
                if len(extra) > 5:
                    print(f"      ... and {len(extra) - 5} more")
        else:
            print(" ✅")
    
    # Summary
    print("\n" + "="*60)
    
    if errors:
        print("❌ VALIDATION FAILED\n")
        print("Missing translations detected:")
        for lang, error_type, keys in errors:
            print(f"  {lang.upper()}: {len(keys)} missing keys")
        return False
    elif warnings:
        print("⚠️  VALIDATION PASSED (with warnings)\n")
        print("Extra keys detected (may be custom):")
        for lang, warning_type, keys in warnings:
            print(f"  {lang.upper()}: {len(keys)} extra keys")
        return True
    else:
        print("✅ VALIDATION PASSED\n")
        print(f"All {len(languages)} locale files are consistent!")
        print(f"Total: {ref_key_count} translation keys")
        return True

def main():
    """Main entry point."""
    try:
        # Try to find locales directory relative to script location
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        locales_dir = os.path.join(project_root, 'src/locales')
        
        # Fall back to current directory if not found
        if not os.path.exists(locales_dir):
            locales_dir = 'src/locales'
        
        success = validate_translations(locales_dir)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
