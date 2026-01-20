/**
 * Phase 3 Verification Script
 * 
 * Verifies the implementation of:
 * 1. Widget Block Schema
 * 2. WidgetBlockComponent
 * 3. WidgetPicker
 * 4. SlashMenuItems & Hooks
 * 5. WidgetConfigPanel
 * 6. Editor Test Page
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
    // Block Schema
    'src/modules/editor/blocks/types.ts',
    'src/modules/editor/blocks/widgetBlockSchema.ts',
    'src/modules/editor/blocks/index.ts',

    // Widget Block Component
    'src/modules/editor/blocks/WidgetBlockComponent.tsx',

    // Picker
    'src/modules/editor/components/WidgetPicker.tsx',

    // Slash Menu & Config
    'src/modules/editor/components/SlashMenuItems.tsx',
    'src/modules/editor/components/WidgetConfigPanel.tsx',
    'src/modules/editor/components/index.ts',

    // Hooks
    'src/modules/editor/hooks/useWidgetSuggestions.ts',
    'src/modules/editor/hooks/index.ts',

    // Test Page
    'src/app/(dashboard)/editor-test/page.tsx',
    'src/app/(dashboard)/editor-test/EditorTestClient.tsx',
];

const REQUIRED_CONTENT = {
    'src/modules/editor/blocks/index.ts': ['WidgetBlockComponent'],
    'src/modules/editor/components/index.ts': ['WidgetConfigPanel', 'WidgetPicker', 'getWidgetSlashMenuItems'],
    'src/modules/editor/hooks/index.ts': ['useWidgetSuggestions'],
};

function verifyPhase3() {
    console.log('🔍 Starting Phase 3 Verification...\n');
    let errors = 0;

    // 1. Check Files Existence
    console.log('Checking File Existence:');
    REQUIRED_FILES.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            console.log(`  ✅ Found: ${file}`);
        } else {
            console.error(`  ❌ MISSING: ${file}`);
            errors++;
        }
    });

    // 2. Check Exports
    console.log('\nChecking Key Exports:');
    Object.entries(REQUIRED_CONTENT).forEach(([file, distinctTokens]) => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            distinctTokens.forEach(token => {
                if (content.includes(token)) {
                    console.log(`  ✅ Found "${token}" in ${path.basename(file)}`);
                } else {
                    console.error(`  ❌ MISSING "${token}" in ${path.basename(file)}`);
                    errors++;
                }
            });
        }
    });

    console.log('\n----------------------------------------');
    if (errors === 0) {
        console.log('🎉 Phase 3 Verification PASSED!');
        console.log('All widget insertion components are in place.');
        console.log('You can now test at: http://localhost:3000/editor-test');
    } else {
        console.error(`💥 Phase 3 Verification FAILED with ${errors} errors.`);
    }
}

verifyPhase3();
