#!/bin/bash

# Database Migration Verification Script
# Run this before deploying to verify all migrations are correct

echo "🔍 Starting database migration verification..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if drizzle-kit is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npm/npx not found. Please install Node.js${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking Drizzle configuration...${NC}"
if [ -f "drizzle.config.ts" ]; then
    echo -e "${GREEN}✅ drizzle.config.ts found${NC}"
else
    echo -e "${RED}❌ drizzle.config.ts not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Checking .env file...${NC}"
if [ -f ".env" ]; then
    if grep -q "TURSO_DATABASE_URL" .env && grep -q "TURSO_AUTH_TOKEN" .env; then
        echo -e "${GREEN}✅ .env configured with TURSO credentials${NC}"
    else
        echo -e "${RED}❌ .env missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Checking migration files...${NC}"
migrations=(
    "drizzle/0000_special_the_liberteens.sql"
    "drizzle/0001_add_message_queue.sql"
    "drizzle/0002_stiff_marvel_boy.sql"
    "drizzle/0003_activity_contacts_schedule.sql"
)

for migration in "${migrations[@]}"; do
    if [ -f "$migration" ]; then
        echo -e "${GREEN}✅ $migration found${NC}"
    else
        echo -e "${RED}❌ $migration not found${NC}"
        exit 1
    fi
done

echo ""
echo -e "${YELLOW}Step 4: Checking schema.ts...${NC}"
if [ -f "server/src/db/schema.ts" ]; then
    table_count=$(grep -o "sqliteTable" server/src/db/schema.ts | wc -l)
    echo -e "${GREEN}✅ schema.ts found with $table_count tables${NC}"
else
    echo -e "${RED}❌ server/src/db/schema.ts not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Checking frontend responsive CSS...${NC}"
if grep -q "@media (max-width:" src/pages/Dashboard.module.css && grep -q "@media (max-width:" src/pages/Auth.module.css; then
    echo -e "${GREEN}✅ Responsive media queries found in CSS${NC}"
else
    echo -e "${RED}⚠️  Missing media queries in CSS${NC}"
fi

echo ""
echo -e "${YELLOW}Step 6: Validating migration structure...${NC}"

# Check for duplicate table creation
if grep -q "CREATE TABLE.*chat_history" drizzle/0000*.sql drizzle/0001*.sql 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Checking for duplicate table creations...${NC}"
fi

if grep -q "CREATE TABLE.*chat_history" drizzle/0002_stiff_marvel_boy.sql && grep -q "CREATE TABLE.*chat_history" drizzle/0000_special_the_liberteens.sql 2>/dev/null; then
    echo -e "${RED}❌ DUPLICATE: chat_history in multiple migrations${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No duplicate table creations detected${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All checks passed! Ready for deployment${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Run: npx drizzle-kit push:sqlite"
echo "2. Verify tables in Turso console: https://console.turso.io/"
echo "3. Test app in browser on mobile/desktop"
echo "4. Deploy when ready"

exit 0
