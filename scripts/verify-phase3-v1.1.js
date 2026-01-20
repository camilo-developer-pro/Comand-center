const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const NC = '\x1b[0m';

console.log("==========================================");
console.log("Command Center ERP V1.1 - Phase 3 Verification");
console.log("Widget Insertion UX");
console.log("==========================================");
console.log("");

let ERRORS = 0;

function check_file(file) {
    if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
        console.log(`  ${GREEN}✅${NC} ${file}`);
        return true;
    } else {
        console.log(`  ${RED}❌${NC} ${file} ${RED}MISSING${NC}`);
        ERRORS++;
        return false;
    }
}

function check_dir(dir) {
    if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
        console.log(`  ${GREEN}✅${NC} ${dir}/`);
        return true;
    } else {
        console.log(`  ${RED}❌${NC} ${dir}/ ${RED}MISSING${NC}`);
        ERRORS++;
        return false;
    }
}

console.log("📁 Checking Blocks Module...");
check_dir("src/modules/editor/blocks");
check_file("src/modules/editor/blocks/types.ts");
check_file("src/modules/editor/blocks/widgetBlockSchema.ts");
check_file("src/modules/editor/blocks/WidgetBlockComponent.tsx");
check_file("src/modules/editor/blocks/index.ts");
console.log("");

console.log("📄 Checking Editor Components...");
check_file("src/modules/editor/components/WidgetPicker.tsx");
check_file("src/modules/editor/components/WidgetConfigPanel.tsx");
check_file("src/modules/editor/components/SlashMenuItems.tsx");
check_file("src/modules/editor/components/CommandCenterEditor.tsx");
check_file("src/modules/editor/components/index.ts");
console.log("");

console.log("📄 Checking Editor Hooks...");
check_dir("src/modules/editor/hooks");
check_file("src/modules/editor/hooks/useWidgetSuggestions.ts");
check_file("src/modules/editor/hooks/index.ts");
console.log("");

console.log("📄 Checking Shared Hooks...");
check_dir("src/lib/hooks");
check_file("src/lib/hooks/useDebounce.ts");
check_file("src/lib/hooks/index.ts");
console.log("");

console.log("📄 Checking Test Page...");
check_dir("src/app/(dashboard)/editor-test");
check_file("src/app/(dashboard)/editor-test/page.tsx");
check_file("src/app/(dashboard)/editor-test/EditorTestClient.tsx");
console.log("");

console.log("📄 Checking Registry Update...");
check_file("src/modules/editor/registry.tsx");
console.log("");

console.log("==========================================");
if (ERRORS === 0) {
    console.log(`${GREEN}✅ Phase 3 Verification PASSED${NC}`);
    console.log("All files are in place.");
} else {
    console.log(`${RED}❌ Phase 3 Verification FAILED${NC}`);
    console.log(`${ERRORS} error(s) found. Please review the output above.`);
}
console.log("==========================================");

process.exit(ERRORS ? 1 : 0);
