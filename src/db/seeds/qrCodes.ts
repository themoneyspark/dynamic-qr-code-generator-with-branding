import { db } from '@/db';
import { qrCodes } from '@/db/schema';

async function main() {
    const sampleQrCodes = [
        {
            projectId: 6,
            destinationUrl: 'https://example.com/analytics-test',
            shortCode: 'analytics-test',
            customizationConfig: {
                color: '#4F46E5',
                logo: null,
                size: 300,
                errorCorrection: 'M'
            },
            utmParams: {
                source: 'qr-code',
                medium: 'analytics-test',
                campaign: 'dashboard-testing'
            },
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        }
    ];

    await db.insert(qrCodes).values(sampleQrCodes);
    
    console.log('✅ QR Codes seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});