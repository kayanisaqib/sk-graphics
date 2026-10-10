/**
 * SK GRAPHICS — Auto-Publish Script
 * Reads content_pipeline.json, finds the next scheduled item,
 * adds it to gallery.json, updates sitemap.xml, and marks it published.
 * 
 * Run: node scripts/publish_next.js
 * Used by: .github/workflows/publish-content.yml
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GALLERY_PATH = path.join(ROOT, 'gallery.json');
const PIPELINE_PATH = path.join(ROOT, 'content_pipeline.json');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');

function main() {
    // Load pipeline
    if (!fs.existsSync(PIPELINE_PATH)) {
        console.log('⏭️  No content_pipeline.json found. Nothing to publish.');
        return;
    }

    const pipeline = JSON.parse(fs.readFileSync(PIPELINE_PATH, 'utf-8'));
    const now = new Date();

    // Find next unpublished item whose scheduled date has passed
    const nextItem = pipeline.find(item => {
        if (item.published) return false;
        const schedDate = new Date(item.scheduledDate);
        return schedDate <= now;
    });

    if (!nextItem) {
        console.log('⏭️  No items ready to publish yet. Next scheduled items:');
        const upcoming = pipeline.filter(i => !i.published).slice(0, 3);
        upcoming.forEach(i => console.log(`   📅 ${i.title} → ${i.scheduledDate}`));
        return;
    }

    console.log(`🚀 Publishing: ${nextItem.title}`);

    // Load gallery
    const gallery = JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf-8'));

    // Build gallery entry
    const galleryEntry = {
        title: nextItem.title,
        client: nextItem.client || 'Production Engine',
        category: nextItem.category,
        assetUrl: nextItem.assetUrl,
        type: nextItem.type || 'interactive',
        description: nextItem.description,
        isNew: true
    };

    // Remove "isNew" flag from any previously-new items (only latest batch is "new")
    gallery.forEach(item => {
        if (item.isNew && !nextItem.keepNewFlags) {
            // Keep existing new flags for this publish cycle
        }
    });

    // Add to the beginning of the gallery
    gallery.unshift(galleryEntry);

    // Save gallery
    fs.writeFileSync(GALLERY_PATH, JSON.stringify(gallery, null, 2), 'utf-8');
    console.log(`✅ Added to gallery.json (now ${gallery.length} items)`);

    // Update sitemap
    if (nextItem.assetUrl && nextItem.assetUrl.endsWith('.html')) {
        const filename = nextItem.assetUrl.replace('./', '');
        const sitemapEntry = `  <url>
    <loc>https://skgraphics.site/${filename}</loc>
    <lastmod>${now.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;

        let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf-8');
        
        // Insert before closing </urlset>
        if (!sitemap.includes(filename)) {
            sitemap = sitemap.replace('</urlset>', sitemapEntry + '\n</urlset>');
            fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
            console.log(`✅ Added ${filename} to sitemap.xml`);
        }
    }

    // Mark as published
    nextItem.published = true;
    nextItem.publishedAt = now.toISOString();
    fs.writeFileSync(PIPELINE_PATH, JSON.stringify(pipeline, null, 2), 'utf-8');
    console.log(`✅ Marked as published in content_pipeline.json`);

    // Summary
    const remaining = pipeline.filter(i => !i.published).length;
    console.log(`\n📊 Pipeline Status: ${remaining} items remaining`);
}

main();
