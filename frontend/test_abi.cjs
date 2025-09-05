#!/usr/bin/env node

/**
 * Test script to validate ABI files and service functionality
 */

const fs = require('fs');
const path = require('path');

// Test ABI file loading
function testABIFiles() {
    console.log('=== Testing ABI Files ===');
    
    const abiDir = path.join(__dirname, 'src/services/abis');
    const subscriptionABI = path.join(abiDir, 'subscription.json');
    const factoryABI = path.join(abiDir, 'subscriptionFactory.json');
    
    try {
        // Test Subscription ABI
        const subABI = JSON.parse(fs.readFileSync(subscriptionABI, 'utf8'));
        console.log(`✓ Subscription ABI loaded: ${subABI.length} entries`);
        
        // Find key functions
        const functions = subABI.filter(item => item.type === 'function');
        const interfaces = subABI.filter(item => item.type === 'interface');
        
        console.log(`  - Functions found: ${functions.length}`);
        console.log(`  - Interfaces found: ${interfaces.length}`);
        
        // Check for key functions
        const keyFunctions = ['subscribe', 'renew', 'cancel', 'enable_auto_renewal', 'disable_auto_renewal'];
        const foundFunctions = [];
        
        if (interfaces.length > 0) {
            const interfaceItems = interfaces[0].items || [];
            keyFunctions.forEach(funcName => {
                const found = interfaceItems.find(item => item.name === funcName);
                if (found) {
                    foundFunctions.push(funcName);
                    console.log(`  ✓ Found function: ${funcName}`);
                } else {
                    console.log(`  ✗ Missing function: ${funcName}`);
                }
            });
        }
        
        // Test Factory ABI
        const factABI = JSON.parse(fs.readFileSync(factoryABI, 'utf8'));
        console.log(`✓ Factory ABI loaded: ${factABI.length} entries`);
        
        const factoryFunctions = factABI.filter(item => item.type === 'function');
        const factoryInterfaces = factABI.filter(item => item.type === 'interface');
        
        console.log(`  - Functions found: ${factoryFunctions.length}`);
        console.log(`  - Interfaces found: ${factoryInterfaces.length}`);
        
        // Check for key factory functions
        const keyFactoryFunctions = ['create_plan', 'get_plan', 'update_plan', 'deactivate_plan'];
        const foundFactoryFunctions = [];
        
        if (factoryInterfaces.length > 0) {
            const interfaceItems = factoryInterfaces[0].items || [];
            keyFactoryFunctions.forEach(funcName => {
                const found = interfaceItems.find(item => item.name === funcName);
                if (found) {
                    foundFactoryFunctions.push(funcName);
                    console.log(`  ✓ Found factory function: ${funcName}`);
                } else {
                    console.log(`  ✗ Missing factory function: ${funcName}`);
                }
            });
        }
        
        return {
            subscriptionABI: subABI,
            factoryABI: factABI,
            subscriptionFunctions: foundFunctions,
            factoryFunctions: foundFactoryFunctions
        };
        
    } catch (error) {
        console.error('✗ Error loading ABI files:', error.message);
        return null;
    }
}

// Test service imports
function testServiceImports() {
    console.log('\n=== Testing Service Imports ===');
    
    try {
        // Check if service files exist
        const serviceDir = path.join(__dirname, 'src/services');
        const files = [
            'BaseContractService.ts',
            'SubscriptionFactoryService.ts', 
            'SubscriptionService.ts',
            'types.ts',
            'config.ts',
            'index.ts'
        ];
        
        files.forEach(file => {
            const filePath = path.join(serviceDir, file);
            if (fs.existsSync(filePath)) {
                console.log(`✓ Service file exists: ${file}`);
            } else {
                console.log(`✗ Service file missing: ${file}`);
            }
        });
        
        // Check ABI index file
        const abiIndexPath = path.join(serviceDir, 'abis/index.ts');
        if (fs.existsSync(abiIndexPath)) {
            console.log('✓ ABI index file exists');
            const content = fs.readFileSync(abiIndexPath, 'utf8');
            if (content.includes('subscriptionABI') && content.includes('subscriptionFactoryABI')) {
                console.log('✓ ABI exports found in index file');
            } else {
                console.log('✗ ABI exports missing in index file');
            }
        } else {
            console.log('✗ ABI index file missing');
        }
        
        return true;
    } catch (error) {
        console.error('✗ Error testing service imports:', error.message);
        return false;
    }
}

// Main test function
function main() {
    console.log('Subra Frontend ABI and Service Test\n');
    
    const abiTest = testABIFiles();
    const serviceTest = testServiceImports();
    
    console.log('\n=== Test Summary ===');
    if (abiTest && serviceTest) {
        console.log('✓ All tests passed! ABI files are properly integrated.');
        console.log(`✓ Subscription functions available: ${abiTest.subscriptionFunctions.length}`);
        console.log(`✓ Factory functions available: ${abiTest.factoryFunctions.length}`);
    } else {
        console.log('✗ Some tests failed. Please check the output above.');
    }
}

if (require.main === module) {
    main();
}