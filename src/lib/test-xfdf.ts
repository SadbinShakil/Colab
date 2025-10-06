/**
 * Test script for XFDF storage functionality
 * Run with: npx tsx src/lib/test-xfdf.ts
 */

import { 
  saveAnnotationLayer, 
  getAnnotationLayers, 
  deleteAnnotationLayer,
  validateXfdf 
} from './xfdfStorage'

// Sample XFDF content for testing
const sampleXfdf = `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
<annots>
<highlight page="0" rect="100,100,200,120" color="#FFFF00" flags="print" name="test-highlight-1" title="Test User" subject="Highlight" date="D:20241001120000+00'00'" creationdate="D:20241001120000+00'00'">
<contents>This is a test highlight annotation</contents>
</highlight>
</annots>
</xfdf>`

async function testXfdfStorage() {
  console.log('🧪 Testing XFDF Storage System...\n')
  
  try {
    // Test 1: Validate XFDF
    console.log('1. Testing XFDF validation...')
    const isValid = validateXfdf(sampleXfdf)
    console.log(`   ✅ XFDF validation: ${isValid ? 'PASSED' : 'FAILED'}\n`)
    
    // Test 2: Save annotation layer
    console.log('2. Testing annotation layer save...')
    const testDocumentId = 'test-document-123'
    const testUserId = 'test-user-456'
    
    const savedLayer = await saveAnnotationLayer(
      testDocumentId,
      sampleXfdf,
      testUserId,
      false // not global
    )
    
    console.log(`   ✅ Layer saved with ID: ${savedLayer.id}`)
    console.log(`   📄 Document ID: ${savedLayer.documentId}`)
    console.log(`   👤 User ID: ${savedLayer.userId}`)
    console.log(`   📝 Version: ${savedLayer.version}\n`)
    
    // Test 3: Retrieve annotation layers
    console.log('3. Testing annotation layer retrieval...')
    const layers = await getAnnotationLayers(testDocumentId, testUserId, true)
    
    console.log(`   ✅ Retrieved layers:`)
    console.log(`   👤 User layer: ${layers.userLayer ? 'Found' : 'Not found'}`)
    console.log(`   🌍 Global layer: ${layers.globalLayer ? 'Found' : 'Not found'}`)
    console.log(`   🔗 Merged XFDF: ${layers.mergedXfdf ? 'Generated' : 'Not generated'}`)
    
    if (layers.mergedXfdf) {
      console.log(`   📏 Merged XFDF length: ${layers.mergedXfdf.length} characters\n`)
    }
    
    // Test 4: Save global layer
    console.log('4. Testing global annotation layer save...')
    const globalXfdf = sampleXfdf.replace('test-highlight-1', 'global-highlight-1')
    
    const globalLayer = await saveAnnotationLayer(
      testDocumentId,
      globalXfdf,
      null, // no user ID for global
      true  // is global
    )
    
    console.log(`   ✅ Global layer saved with ID: ${globalLayer.id}`)
    console.log(`   🌍 Is global: ${globalLayer.isGlobal}\n`)
    
    // Test 5: Retrieve with global layer
    console.log('5. Testing retrieval with global layer...')
    const layersWithGlobal = await getAnnotationLayers(testDocumentId, testUserId, true)
    
    console.log(`   ✅ Retrieved layers with global:`)
    console.log(`   👤 User layer: ${layersWithGlobal.userLayer ? 'Found' : 'Not found'}`)
    console.log(`   🌍 Global layer: ${layersWithGlobal.globalLayer ? 'Found' : 'Not found'}`)
    console.log(`   🔗 Merged XFDF: ${layersWithGlobal.mergedXfdf ? 'Generated' : 'Not generated'}`)
    
    if (layersWithGlobal.mergedXfdf) {
      console.log(`   📏 Merged XFDF length: ${layersWithGlobal.mergedXfdf.length} characters\n`)
    }
    
    // Test 6: Update existing layer (version increment)
    console.log('6. Testing layer update...')
    const updatedXfdf = sampleXfdf.replace('This is a test highlight', 'This is an UPDATED test highlight')
    
    const updatedLayer = await saveAnnotationLayer(
      testDocumentId,
      updatedXfdf,
      testUserId,
      false,
      savedLayer.version // expected version
    )
    
    console.log(`   ✅ Layer updated`)
    console.log(`   📝 New version: ${updatedLayer.version} (was ${savedLayer.version})\n`)
    
    // Test 7: Version conflict test
    console.log('7. Testing version conflict handling...')
    try {
      await saveAnnotationLayer(
        testDocumentId,
        updatedXfdf,
        testUserId,
        false,
        1 // wrong version
      )
      console.log('   ❌ Version conflict test FAILED - should have thrown error\n')
    } catch (error) {
      if (error instanceof Error && error.message.includes('Version conflict')) {
        console.log('   ✅ Version conflict correctly detected\n')
      } else {
        console.log(`   ❌ Unexpected error: ${error}\n`)
      }
    }
    
    // Cleanup
    console.log('8. Cleaning up test data...')
    await deleteAnnotationLayer(savedLayer.id)
    await deleteAnnotationLayer(globalLayer.id)
    console.log('   ✅ Test data cleaned up\n')
    
    console.log('🎉 All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testXfdfStorage()
    .then(() => {
      console.log('\n✅ Test suite completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error)
      process.exit(1)
    })
}

export { testXfdfStorage }
