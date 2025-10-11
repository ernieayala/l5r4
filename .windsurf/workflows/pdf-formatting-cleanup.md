---
description: Clean up PDF foramtting when copy and pasted info a MD.
auto_execution_mode: 1
---

name: "PDF Cleanup & Markdown Formatting"
description: "Fix PDF paste artifacts, remove junk, and apply proper Markdown formatting"
trigger: "manual" # or keywords "PDF Cleanup" / "Format Fix" / "MD Format"

steps:
  - step: "analyze_file"
    action: "read_current_file"
    description: "Load the currently open file for analysis"
    
  - step: "remove_pdf_artifacts"
    action: "apply_fixes"
    priority: "critical"
    fixes:
      - pattern: "^Page\\s+\\d+\\s*$"
        replace: ""
        description: "Remove standalone page numbers"
      
      - pattern: "^\\d+\\s*$"
        replace: ""
        conditions:
          - line_is_isolated: true
          - is_number_only: true
        description: "Remove isolated page numbers"
      
      - pattern: "^(Chapter|Section|Page)\\s+\\d+\\s*$"
        replace: ""
        conditions:
          - followed_by_unrelated_content: true
        description: "Remove chapter/page markers without context"
      
      - pattern: "\\[\\d+\\]\\s*$"
        replace: ""
        conditions:
          - is_footnote_reference: true
          - no_footnote_content: true
        description: "Remove orphaned footnote references"
      
      - pattern: "^\\s*\\d+\\s*/\\s*\\d+\\s*$"
        replace: ""
        description: "Remove page number formats like '1 / 99'"
      
      - pattern: "^(Confidential|Internal Use Only|Draft|DRAFT)\\s*$"
        replace: ""
        description: "Remove document watermark text"
      
      - pattern: "^\\s*[-_=]{3,}\\s*$"
        replace: ""
        description: "Remove decorative lines"
      
      - pattern: "^\\s*©.*?\\d{4}.*$"
        replace: ""
        conditions:
          - appears_random: true
        description: "Remove random copyright notices"
    
  - step: "fix_line_breaks"
    action: "apply_fixes"
    priority: "high"
    fixes:
      - pattern: "([a-z,;])\\n([a-z])"
        replace: "$1 $2"
        description: "Join lines that end mid-sentence (lowercase to lowercase)"
      
      - pattern: "([a-z])\\n([a-z])"
        replace: "$1 $2"
        conditions:
          - previous_line_no_punctuation: true
        description: "Join broken sentences without ending punctuation"
      
      - pattern: "([^.!?:\\n])\\n(?=[a-z])"
        replace: "$1 "
        description: "Remove line breaks before lowercase (continuing sentence)"
      
      - pattern: "([a-z])\\n(?=[A-Z][a-z])"
        replace: "$1 "
        conditions:
          - next_line_not_heading: true
          - next_line_not_list: true
        description: "Join to next sentence if not a heading or list"
      
      - pattern: "\\n(?=\\S)"
        replace: " "
        conditions:
          - not_list_item: true
          - not_heading: true
          - not_after_punctuation: true
          - not_code_block: true
        description: "Remove single newlines that aren't intentional breaks"
      
      - pattern: "([.!?])\\n{1}([A-Z])"
        replace: "$1\n\n$2"
        description: "Ensure paragraph breaks between sentences"
    
  - step: "identify_issues"
    action: "scan_for_patterns"
    patterns:
      - double_spaces: "  +"
      - missing_spaces: "\\w[A-Z]"
      - special_chars: "[™®•–—]"
      - encoding_issues: "[Â]|â€"
      - broken_bullets: "^[^-*•]\\s+(?=[A-Z])"
      - extra_newlines: "\n{3,}"
      - potential_headings: "^[A-Z][A-Za-z\\s]{2,50}:?$"
      - code_blocks: "```|`"
    
  - step: "fix_spacing"
    action: "apply_fixes"
    fixes:
      - pattern: "  +"
        replace: " "
        description: "Collapse multiple spaces to single space"
      
      - pattern: "([a-z])([A-Z])"
        replace: "$1 $2"
        conditions:
          - not_acronym: true
        description: "Add space between concatenated words"
      
      - pattern: "\n{3,}"
        replace: "\n\n"
        description: "Normalize paragraph breaks"
        
  - step: "fix_characters"
    action: "apply_fixes"
    fixes:
      - pattern: "™"
        replace: "(TM)"
      - pattern: "®"
        replace: "(R)"
      - pattern: "•"
        replace: "-"
      - pattern: "–|—"
        replace: "-"
      - pattern: "â€œ|â€|"|""
        replace: "\""
      - pattern: "â€™|'|'"
        replace: "'"
      - pattern: "Â|​|‌|‍"
        replace: ""
        description: "Remove invisible Unicode characters"
      - pattern: "…"
        replace: "..."
        description: "Replace ellipsis character"
        
  - step: "format_headings"
    action: "apply_fixes"
    fixes:
      - pattern: "^([A-Z][A-Za-z\\s]+):?$"
        replace: "## $1"
        conditions:
          - line_is_standalone: true
          - followed_by_content: true
          - min_length: 3
          - max_length: 80
        description: "Convert standalone titles to H2 headings"
      
      - pattern: "^(Chapter|Section|Part)\\s+(\\d+|[IVX]+):?\\s*(.+)$"
        replace: "# $1 $2: $3"
        description: "Convert chapter/section titles to H1"
      
      - pattern: "^(\\d+\\.\\d+)\\s+([A-Z].+)$"
        replace: "### $1 $2"
        conditions:
          - followed_by_content: true
        description: "Convert numbered sections to H3"
        
  - step: "format_lists"
    action: "apply_fixes"
    fixes:
      - pattern: "^(\\d+\\.)(?=\\S)"
        replace: "$1 "
        description: "Fix numbered list spacing"
      
      - pattern: "^([*-])(?=\\S)"
        replace: "$1 "
        description: "Fix bullet point spacing"
      
      - pattern: "^\\s*[-•○]\\s+"
        replace: "- "
        description: "Normalize bullet characters to hyphens"
      
      - pattern: "^\\s*(\\d+[\\.\\)])\\s+"
        replace: "$1 "
        description: "Normalize numbered lists"
      
      - pattern: "^\\s+(-|\\*|\\d+\\.)"
        replace: "$1"
        description: "Remove extra indentation from top-level lists"
        
  - step: "format_emphasis"
    action: "apply_fixes"
    fixes:
      - pattern: "\\*\\*([^*]+)\\*\\*"
        keep: true
        description: "Preserve existing bold"
      
      - pattern: "\\*([^*]+)\\*"
        keep: true
        description: "Preserve existing italic"
      
      - pattern: "(?<=\\s|^)_([A-Za-z0-9\\s]+)_(?=\\s|$|[.,!?])"
        replace: "*$1*"
        description: "Convert underscores to italic"
      
      - pattern: "\\b([A-Z]{4,})\\b"
        replace: "**$1**"
        conditions:
          - is_all_caps: true
          - not_acronym: true
          - appears_emphasized: true
        description: "Convert ALL CAPS emphasis to bold"
        
  - step: "format_code"
    action: "apply_fixes"
    fixes:
      - pattern: "(?<!`)\\b([a-zA-Z_][a-zA-Z0-9_]*\\(\\))\\b(?!`)"
        replace: "`$1`"
        description: "Wrap function names in backticks"
      
      - pattern: "(?<!`)\\b(const|let|var|function|class|import|export|return|if|else|for|while)\\s+([a-zA-Z_][a-zA-Z0-9_]*)(?!`)"
        replace: "`$1 $2`"
        description: "Wrap code keywords in backticks"
      
      - pattern: "(?<!`)(\\.[a-z]{2,4}|\\.[A-Z]{2,4})(?!`)\\b"
        replace: "`$1`"
        description: "Wrap file extensions in backticks"
      
      - pattern: "(?<!`)(/[a-zA-Z0-9_/\\-]+\\.[a-z]{2,4})(?!`)"
        replace: "`$1`"
        description: "Wrap file paths in backticks"
        
  - step: "format_links"
    action: "apply_fixes"
    fixes:
      - pattern: "(?<!\\[|\\()(https?://[^\\s\\)]+)(?!\\])"
        replace: "<$1>"
        conditions:
          - not_already_markdown_link: true
        description: "Wrap bare URLs in angle brackets"
      
      - pattern: "\\[([^\\]]+)\\]\\s*\\(([^)]+)\\)"
        keep: true
        description: "Preserve existing markdown links"
        
  - step: "format_tables"
    action: "detect_and_format_tables"
    description: "Convert aligned text to markdown tables"
    algorithm: |
      1. Detect rows with consistent spacing/tabs (3+ rows)
      2. Identify column boundaries by alignment
      3. Create markdown table with | separators
      4. Add header separator row with |---|---|
      5. Align content within cells
    min_rows: 3
    min_columns: 2
      
  - step: "format_code_blocks"
    action: "apply_fixes"
    fixes:
      - pattern: "^(    |\\t)(.+)$"
        replace: "```\n$2\n```"
        conditions:
          - consecutive_indented_lines: 3
          - not_in_list: true
        description: "Convert indented blocks to fenced code blocks"
      
      - pattern: "```([^`\\n]+)"
        replace: "```$1\n"
        description: "Ensure newline after code fence opening"
      
      - pattern: "([^\\n])```"
        replace: "$1\n```"
        description: "Ensure newline before code fence closing"
        
  - step: "add_spacing"
    action: "apply_fixes"
    fixes:
      - pattern: "(?<!\\n)(^#{1,6}\\s+.+$)"
        replace: "\n$1"
        description: "Add blank line before headings"
      
      - pattern: "(^#{1,6}\\s+.+$)(?!\\n)"
        replace: "$1\n"
        description: "Add blank line after headings"
      
      - pattern: "(^```[\\s\\S]*?^```)(?!\\n\\n)"
        replace: "$1\n"
        multiline: true
        description: "Add blank line after code blocks"
      
      - pattern: "(?<!\\n\\n)(^```)"
        replace: "\n$1"
        description: "Add blank line before code blocks"
      
      - pattern: "(^[-*\\d+\\.]\\s+.+$)\\n(?![-*\\d+\\.]\\s|\\n)"
        replace: "$1\n\n"
        description: "Add blank line after lists end"
        
  - step: "final_cleanup"
    action: "apply_fixes"
    fixes:
      - pattern: "^\\s+"
        replace: ""
        multiline: true
        description: "Remove leading whitespace from lines"
      
      - pattern: "\\s+$"
        replace: ""
        multiline: true
        description: "Remove trailing whitespace from lines"
      
      - pattern: "([a-z])-\\n([a-z])"
        replace: "$1$2"
        description: "Remove hyphenation artifacts"
      
      - pattern: "\n{3,}"
        replace: "\n\n"
        description: "Normalize to max 2 newlines"
      
      - pattern: "^\\n+"
        replace: ""
        description: "Remove leading newlines at file start"
      
      - pattern: "\\n+$"
        replace: "\n"
        description: "Single newline at file end"
        
  - step: "validate_markdown"
    action: "check_markdown_syntax"
    rules:
      - balanced_code_fences: true
      - balanced_emphasis: true
      - valid_heading_levels: true
      - proper_list_indentation: true
      - no_empty_headings: true
      - no_empty_links: true
    
  - step: "show_diff"
    action: "display_changes"
    format: "unified_diff"
    highlight_syntax: "markdown"
    show_line_numbers: true
    
  - step: "apply_changes"
    action: "save_file"
    confirmation: "auto"
    backup: true

output:
  success_message: "✓ PDF cleanup & Markdown formatting complete"
  show_statistics: true
  stats:
    - "Lines modified"
    - "Characters replaced"
    - "PDF artifacts removed"
    - "Line breaks fixed"
    - "Headings formatted"
    - "Lists normalized"
    - "Code blocks created"
    - "Links formatted"
    - "Tables created"
  show_preview: true
  preview_format: "rendered_markdown"
  
error_handling:
  on_validation_fail: "show_warnings"
  on_ambiguous_pattern: "skip_and_log"
  preserve_original: true