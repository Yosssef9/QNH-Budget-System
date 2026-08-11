# 1. Generic Items - Dry Run
node scripts\importCatalogItems.cjs "scripts\data\generic-items.xlsx" --dry-run

# 2. Generic Items - Real Import
node scripts\importCatalogItems.cjs "scripts\data\generic-items.xlsx"

# 3. Sub-Items - Dry Run
node scripts\importCatalogSubItems.cjs "scripts\data\sub-items.xlsx" --dry-run

# 4. Sub-Items - Real Import
node scripts\importCatalogSubItems.cjs "scripts\data\sub-items.xlsx"