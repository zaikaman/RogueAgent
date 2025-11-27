/**
 * Test script to verify Z-Image-Turbo image generation via Gradio.
 * 
 * Usage:
 *   cd backend
 *   npx ts-node scripts/test-zimage.ts
 * 
 * Optional: Set HF_TOKEN in .env for your own Hugging Face quota.
 * The service works without a token using public quota.
 * 
 * This test also uploads the generated image to Supabase storage.
 */

import 'dotenv/config';
import { zImageService } from '../src/services/zimage.service';

const TEST_PROMPT = 'A futuristic cyberpunk trading dashboard with glowing neon charts, cryptocurrency symbols floating in holographic displays, dark background with teal and purple accents';

async function testZImageGeneration(): Promise<void> {
  console.log('🎨 Z-Image-Turbo Test Script');
  console.log('============================\n');

  const hfToken = process.env.HF_TOKEN;
  
  if (hfToken) {
    console.log('✅ HF_TOKEN found - using personal quota');
  } else {
    console.log('ℹ️  HF_TOKEN not set - using public quota (may have rate limits)');
  }

  console.log(`\n📝 Test Prompt:\n"${TEST_PROMPT}"\n`);

  try {
    console.log('🖼️  Generating image and uploading to storage...');
    const startTime = Date.now();
    
    const imageUrl = await zImageService.generateImage(TEST_PROMPT);
    
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total time: ${totalTime}ms\n`);

    if (imageUrl) {
      console.log('🎉 SUCCESS! Image generated and stored:');
      console.log(`   ${imageUrl}\n`);
      
      if (imageUrl.includes('supabase')) {
        console.log('✅ Image saved to Supabase storage (permanent URL)');
      } else {
        console.log('⚠️  Using temporary URL (storage upload may have failed)');
      }
    } else {
      console.log('❌ Failed to generate image');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Error during image generation:');
    console.error(`   Message: ${error.message}`);
    process.exit(1);
  }

  console.log('\n✅ Test completed successfully!');
  process.exit(0);
}

testZImageGeneration();
