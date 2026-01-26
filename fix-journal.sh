#!/bin/bash
cat > migrations/meta/_journal.json << 'EOF'
{
  "version": "7",
  "dialect": "sqlite",
  "entries": [
    {
      "idx": 0,
      "version": "0000_large_bishop",
      "when": 1737058556000,
      "tag": "0000",
      "breakpoints": true
    }
  ],
  "journal": [
    "0000_large_bishop.sql"
  ]
}
EOF
