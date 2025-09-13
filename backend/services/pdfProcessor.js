/**
 * Enhanced PDF Processor for AI-Powered Search
 * Processes PDFs for both structured data extraction AND AI contextual search
 */

const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const {BlobServiceClient} = require('@azure/storage-blob');
const SearchService = require('./searchService');

class EnhancedUniversityProcessor {
constructor() {
    this.searchService = new SearchService();
    this.dataDir = path.join(__dirname, '../data'); // still kept as fallback
    this.processedDir = path.join(__dirname, '../processed');
    this.chunkSize = 2000;
    this.chunkOverlap = 200;

    // Azure Blob storage
    const storageConn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'university-pdfs';

    if (!storageConn) {
      console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING not set — will attempt to read local data folder.');
      this.containerClient = null;
    } else {
      const blobServiceClient = BlobServiceClient.fromConnectionString(storageConn);
      this.containerClient = blobServiceClient.getContainerClient(containerName);
    }
}

    async processAllPDFs() {
        try {
            console.log('📚 Starting enhanced PDF processing...');
            
            // Initialize the search index
            await this.searchService.createIndex();
            
            // Define PDF files with their corresponding university info
            const pdfMappings = [
                {
                    file: '2026-ufs-prospectus.pdf',
                    university: 'University of the Free State',
                    province: 'Free State',
                    city: 'Bloemfontein',
                    type: 'Traditional'
                },
                {
                    file: 'stellies Prospectus.pdf',
                    university: 'Stellenbosch University',
                    province: 'Western Cape',
                    city: 'Stellenbosch',
                    type: 'Traditional'
                },
                {
                    file: 'stellies pt2 International Curriculum.pdf',
                    university: 'Stellenbosch University',
                    province: 'Western Cape',
                    city: 'Stellenbosch',
                    type: 'Traditional',
                    documentType: 'international_curriculum',
                    isInternational: true
                },
                {
                    file: 'uct ug-prospectus-2026-april.pdf',
                    university: 'University of Cape Town',
                    province: 'Western Cape',
                    city: 'Cape Town',
                    type: 'Traditional'
                },
                {
                    file: 'UKZN Undergrad2025-Web-latest.pdf',
                    university: 'University of KwaZulu-Natal',
                    province: 'KwaZulu-Natal',
                    city: 'Durban',
                    type: 'Traditional'
                },
                {
                    file: 'UP_ug-prospectus-2026_nsc-ieb_deg-dip.pdf',
                    university: 'University of Pretoria',
                    province: 'Gauteng',
                    city: 'Pretoria',
                    type: 'Traditional'
                },
                {
                    file: 'wits 2026 Guide for Undergrad Applicants.pdf',
                    university: 'University of the Witwatersrand',
                    province: 'Gauteng',
                    city: 'Johannesburg',
                    type: 'Traditional'
                }
            ];

            const universities = [];
            const aiDocuments = [];
            
            // Process each PDF for both structured data and AI search
            for (const mapping of pdfMappings) {
                console.log(`\n📄 Processing: ${mapping.file}`);
                const filePath = path.join(this.dataDir, mapping.file);
                
                try {
                    // Check if file exists
                    await fs.access(filePath);
                    
                    // Extract structured university data (your existing logic)
                    const structuredData = await this.extractStructuredData(filePath, mapping);
                    if (structuredData) {
                        universities.push(structuredData);
                        console.log(`✅ Extracted structured data: ${structuredData.universityName}`);
                    }
                    
                    // Process for AI search (chunked content with embeddings)
                    const aiDocs = await this.processForAISearch(filePath, mapping);
                    aiDocuments.push(...aiDocs);
                    console.log(`🤖 Created ${aiDocs.length} AI document chunks`);
                    
                } catch (error) {
                    console.error(`❌ Error processing ${mapping.file}:`, error.message);
                }
            }
            
            // Ensure processed directory exists
            await fs.mkdir(this.processedDir, { recursive: true });
            
            // Save structured data
            const structuredOutputPath = path.join(this.processedDir, 'universities_structured.json');
            await fs.writeFile(
                structuredOutputPath,
                JSON.stringify(universities, null, 2)
            );
            
            // Save AI documents for reference
            const aiOutputPath = path.join(this.processedDir, 'ai_documents.json');
            await fs.writeFile(
                aiOutputPath,
                JSON.stringify(aiDocuments, null, 2)
            );
            
            console.log(`\n📊 Processing Summary:`);
            console.log(`   Structured Universities: ${universities.length}`);
            console.log(`   AI Document Chunks: ${aiDocuments.length}`);
            console.log(`💾 Saved structured data to: ${structuredOutputPath}`);
            console.log(`💾 Saved AI documents to: ${aiOutputPath}`);
            
            // Upload both types to Azure Search
            console.log('\n🔄 Uploading to Azure Search...');
            await this.uploadToSearch(universities, aiDocuments);
            
            console.log('\n✨ Processing complete!');
            return { 
                structuredCount: universities.length, 
                aiDocCount: aiDocuments.length,
                universities,
                aiDocuments 
            };
            
        } catch (error) {
            console.error('Processing error:', error);
            throw error;
        }
    }
    async getPdfBuffer(filePath, mapping) {
        let pdfBuffer = null;

        // Try blob storage first
        if (this.containerClient) {
            try {
                pdfBuffer = await this.downloadBlobToBuffer(mapping.file);
                console.log(`   📤 Downloaded ${mapping.file} from Azure Blob Storage`);
            } catch (err) {
                console.warn(`   ⚠️ Could not download ${mapping.file} from blob: ${err.message}`);
            }
        }

        // Fallback to local data folder
        if (!pdfBuffer) {
            pdfBuffer = await fs.readFile(filePath);
            console.log(`   📁 Read ${mapping.file} from local folder`);
        }

        return pdfBuffer;
    }

    /**
     * Extract structured data using your existing logic
     */
    async extractStructuredData(filePath, mapping) {
        try {
            const dataBuffer = await this.getPdfBuffer(filePath, mapping);
            const data = await pdf(dataBuffer);
            const text = data.text;
            return this.extractUniversityInfo(text, mapping);
        } catch (error) {
            console.error(`Error extracting structured data from ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Process PDF for AI search - create chunks with embeddings
     */
    async processForAISearch(filePath, mapping) {
        try {
            const dataBuffer = await this.getPdfBuffer(filePath, mapping);
            const data = await pdf(dataBuffer);
            const fullText = data.text;

            const cleanText = this.cleanText(fullText);
            const chunks = this.splitIntoChunks(cleanText, this.chunkSize, this.chunkOverlap);

            console.log(`   📝 Split into ${chunks.length} chunks`);

            const documents = [];

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (chunk.length < 100) continue;

                const doc = {
                    id: `${mapping.university.toLowerCase().replace(/\s+/g, '_')}_chunk_${i}_${Date.now()}`,
                    fileName: mapping.file,
                    universityName: mapping.university,
                    province: mapping.province,
                    city: mapping.city,
                    documentType: mapping.documentType || 'prospectus',
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    content: chunk,
                    summary: this.generateChunkSummary(chunk, mapping.university),
                    keyPhrases: this.extractBasicKeyPhrases(chunk),
                    extractedEntities: this.extractBasicEntities(chunk, mapping.university),
                    uploadDate: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    contentVector: null // fill later with embeddings
                };

                documents.push(doc);
            }

            return documents;
        } catch (error) {
            console.error(`Error processing ${filePath} for AI search:`, error.message);
            return [];
        }
    }

    /**
     * Clean and normalize text
     */
    cleanText(text) {
        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove page numbers and common PDF artifacts
            .replace(/Page \d+/gi, '')
            .replace(/^\d+\s*$/gm, '')
            // Remove excessive dots/dashes
            .replace(/\.{3,}/g, '...')
            .replace(/-{3,}/g, '---')
            // Clean up common PDF extraction issues
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .trim();
    }

    /**
     * Split text into chunks with overlap
     */
    splitIntoChunks(text, chunkSize, overlap) {
        const chunks = [];
        let start = 0;
        
        while (start < text.length) {
            let end = start + chunkSize;
            
            // Try to break at sentence boundary
            if (end < text.length) {
                const sentenceEnd = text.lastIndexOf('.', end);
                const newlineEnd = text.lastIndexOf('\n', end);
                const breakPoint = Math.max(sentenceEnd, newlineEnd);
                
                if (breakPoint > start + chunkSize * 0.5) {
                    end = breakPoint + 1;
                }
            }
            
            const chunk = text.slice(start, end).trim();
            if (chunk.length > 50) { // Only add substantial chunks
                chunks.push(chunk);
            }
            
            start = Math.max(start + 1, end - overlap);
        }
        
        return chunks;
    }

    /**
     * Generate a summary for each chunk
     */
    generateChunkSummary(chunk, universityName) {
        const firstSentence = chunk.split('.')[0];
        
        // Try to identify what type of content this chunk contains
        const lowerChunk = chunk.toLowerCase();
        let contentType = 'General information';
        
        if (lowerChunk.includes('admission') || lowerChunk.includes('application')) {
            contentType = 'Admission requirements';
        } else if (lowerChunk.includes('fee') || lowerChunk.includes('cost')) {
            contentType = 'Fees and costs';
        } else if (lowerChunk.includes('program') || lowerChunk.includes('course') || lowerChunk.includes('degree')) {
            contentType = 'Academic programs';
        } else if (lowerChunk.includes('accommodation') || lowerChunk.includes('residence')) {
            contentType = 'Accommodation information';
        } else if (lowerChunk.includes('bursary') || lowerChunk.includes('financial aid')) {
            contentType = 'Financial aid information';
        } else if (lowerChunk.includes('faculty') || lowerChunk.includes('department')) {
            contentType = 'Faculty information';
        }
        
        return `${contentType} for ${universityName}: ${firstSentence.substring(0, 150)}...`;
    }

    /**
     * Extract basic key phrases from chunk
     */
    extractBasicKeyPhrases(chunk) {
        const words = chunk.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        // Get most frequent words as key phrases
        const keyPhrases = Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word)
            .filter(word => !['and', 'the', 'for', 'are', 'you', 'will', 'can', 'may', 'must', 'have', 'this', 'that', 'with', 'from'].includes(word));
        
        return keyPhrases.slice(0, 5);
    }

    /**
     * Extract basic entities from chunk
     */
    extractBasicEntities(chunk, universityName) {
        const entities = [universityName];
        
        // Extract common entity patterns
        const patterns = {
            degrees: /(?:bachelor|master|phd|diploma|certificate)[^\w]*(?:of|in|degree)?\s*([a-z\s]+)/gi,
            subjects: /(?:mathematics|science|english|physics|chemistry|biology|accounting|economics|history|geography)/gi,
            locations: /(?:cape town|johannesburg|durban|pretoria|bloemfontein|port elizabeth|stellenbosch)/gi,
            programs: /(?:engineering|medicine|law|commerce|business|arts|humanities|education|agriculture)/gi
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = chunk.match(pattern) || [];
            matches.forEach(match => {
                const cleaned = match.trim().toLowerCase();
                if (cleaned && !entities.includes(cleaned)) {
                    entities.push(cleaned);
                }
            });
        }
        
        return entities.slice(0, 8);
    }

    /**
     * Upload both structured and AI documents to Azure Search
     */
    async uploadToSearch(universities, aiDocuments) {
        let structuredSuccess = 0;
        let aiSuccess = 0;
        let failures = 0;

        console.log('📤 Uploading structured university data...');
        for (const uni of universities) {
            try {
                await this.searchService.addUniversity(uni);
                console.log(`   ✅ ${uni.universityName}`);
                structuredSuccess++;
            } catch (error) {
                console.error(`   ❌ Failed: ${uni.universityName} - ${error.message}`);
                failures++;
            }
        }

        console.log('\n📤 Uploading AI document chunks...');
        // Upload AI documents in batches to avoid overwhelming the service
        const batchSize = 5;
        for (let i = 0; i < aiDocuments.length; i += batchSize) {
            const batch = aiDocuments.slice(i, i + batchSize);
            
            for (const doc of batch) {
                try {
                    // Generate embeddings for the document content
                    console.log(`   🔄 Generating embeddings for chunk ${doc.chunkIndex + 1}/${doc.totalChunks} of ${doc.universityName}`);
                    doc.contentVector = await this.searchService.generateEmbeddings(doc.content);
                    
                    // Upload to search index
                    await this.searchService.uploadDocument(doc);
                    aiSuccess++;
                    
                } catch (error) {
                    console.error(`   ❌ Failed AI doc: ${doc.id} - ${error.message}`);
                    failures++;
                }
            }
            
            // Small delay between batches
            if (i + batchSize < aiDocuments.length) {
                await this.delay(1000);
            }
        }

        console.log(`\n📊 Upload Summary:`);
        console.log(`   ✅ Structured Universities: ${structuredSuccess}`);
        console.log(`   ✅ AI Document Chunks: ${aiSuccess}`);
        console.log(`   ❌ Failures: ${failures}`);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test the AI search functionality
     */
    async testAISearch(query = "What are the engineering admission requirements?") {
        try {
            console.log(`\n🔍 Testing AI search with query: "${query}"`);
            
            const result = await this.searchService.searchWithAI(query);
            
            console.log('\n🤖 AI Response:');
            console.log('='.repeat(60));
            console.log(result.answer);
            
            console.log('\n📚 Sources Used:');
            console.log('='.repeat(60));
            result.sources.forEach((source, index) => {
                console.log(`${index + 1}. ${source.fileName}`);
                console.log(`   University: ${source.universityName}`);
                console.log(`   Content: ${source.relevantContent}\n`);
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ AI search test failed:', error);
            return null;
        }
    }

    // Keep all your existing extraction methods
    extractUniversityInfo(text, mapping) {
        const { university, province, city, type, isInternational } = mapping;
        
        return {
            id: `${university.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
            universityName: university,
            province: province,
            city: city,
            location: `${city}, ${province}`,
            universityType: type,
            apsScoreRequired: this.extractAPSScore(text),
            applicationDeadline: this.extractDeadline(text),
            bachelorPassRequired: this.checkBachelorPass(text),
            matricRequirements: this.extractMatricRequirements(text),
            subjectRequirements: this.extractSubjectRequirements(text),
            tuitionFeesAnnual: this.extractTuitionFees(text),
            accommodationAvailable: this.checkAccommodation(text),
            nsfasAccredited: this.checkNSFAS(text),
            bursariesAvailable: this.checkBursaries(text),
            programs: this.extractPrograms(text),
            faculties: this.extractFaculties(text),
            languageMedium: this.extractLanguageMedium(text),
            studentPopulation: this.extractStudentPopulation(text),
            establishmentYear: this.getEstablishmentYear(university),
            description: this.generateDescription(university, text),
        };
    }

    // Keep all your existing extraction methods exactly as they are
    extractAPSScore(text) {
        const patterns = [
            /APS\s*[:=]\s*(\d+)/i,
            /APS\s+(?:score\s+)?(?:of\s+)?(\d+)/i,
            /Admission\s+Point\s+Score\s*[:=]\s*(\d+)/i,
            /minimum\s+APS\s+(?:of\s+)?(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }
        return 30;
    }

    extractDeadline(text) {
        const patterns = [
            /Applications?\s+close[sd]?\s*[:=]\s*([^\n]+)/i,
            /Closing\s+date\s*[:=]\s*([^\n]+)/i,
            /Deadline\s*[:=]\s*([^\n]+)/i,
            /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const dateStr = match[1].trim();
                if (dateStr.toLowerCase().includes('september')) {
                    return '2024-09-30';
                } else if (dateStr.toLowerCase().includes('october')) {
                    return '2024-10-31';
                }
            }
        }
        return '2024-09-30';
    }

    checkBachelorPass(text) {
        const lowerText = text.toLowerCase();
        return lowerText.includes("bachelor's pass") || 
               lowerText.includes("bachelor pass") ||
               lowerText.includes("bachelors pass");
    }

    extractMatricRequirements(text) {
        if (text.toLowerCase().includes("bachelor's pass") || 
            text.toLowerCase().includes("bachelor pass")) {
            return "National Senior Certificate with Bachelor's Pass";
        }
        if (text.toLowerCase().includes("diploma pass")) {
            return "National Senior Certificate with Diploma Pass";
        }
        if (text.toLowerCase().includes("higher certificate")) {
            return "National Senior Certificate with Higher Certificate Pass";
        }
        return "National Senior Certificate";
    }

    extractSubjectRequirements(text) {
        const subjects = [];
        const subjectPatterns = [
            'Mathematics', 'Mathematical Literacy', 'Physical Sciences',
            'Life Sciences', 'English', 'Afrikaans', 'Accounting',
            'Business Studies', 'Economics', 'Geography', 'History',
            'Computer Applications Technology', 'Information Technology',
            'Engineering Graphics and Design', 'Agricultural Sciences'
        ];

        for (const subject of subjectPatterns) {
            if (text.includes(subject)) {
                subjects.push(subject);
            }
        }

        if (!subjects.includes('English')) {
            subjects.push('English');
        }

        return subjects.slice(0, 6);
    }

    extractTuitionFees(text) {
        const patterns = [
            /R\s*(\d+[\s,]*\d*)\s*(?:per\s+)?(?:year|annual|pa)/i,
            /Tuition\s*[:=]\s*R?\s*(\d+[\s,]*\d*)/i,
            /Annual\s+fees?\s*[:=]\s*R?\s*(\d+[\s,]*\d*)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const amount = match[1].replace(/[\s,]/g, '');
                return parseInt(amount);
            }
        }
        return 55000;
    }

    checkAccommodation(text) {
        const lowerText = text.toLowerCase();
        return lowerText.includes('accommodation') || 
               lowerText.includes('residence') ||
               lowerText.includes('res ') ||
               lowerText.includes('housing') ||
               lowerText.includes('hostel');
    }

    checkNSFAS(text) {
        return text.toLowerCase().includes('nsfas');
    }

    checkBursaries(text) {
        const lowerText = text.toLowerCase();
        return lowerText.includes('bursary') || 
               lowerText.includes('bursaries') ||
               lowerText.includes('financial aid') ||
               lowerText.includes('financial assistance') ||
               lowerText.includes('funding');
    }

    extractPrograms(text) {
        const programs = [];
        const programKeywords = [
            'Engineering', 'Medicine', 'Health Sciences', 'Commerce', 'Business',
            'Law', 'Science', 'Education', 'Humanities', 'Arts', 'Social Sciences',
            'Computer Science', 'Information Technology', 'Architecture',
            'Agriculture', 'Veterinary Science', 'Pharmacy', 'Dentistry',
            'Nursing', 'Psychology', 'Accounting', 'Economics', 'Marketing',
            'Finance', 'Management', 'Political Science', 'Sociology',
            'Environmental Science', 'Biotechnology', 'Chemistry', 'Physics',
            'Mathematics', 'Statistics', 'Actuarial Science'
        ];

        for (const program of programKeywords) {
            if (text.includes(program)) {
                programs.push(program);
            }
        }

        return programs.slice(0, 15);
    }

    extractFaculties(text) {
        const faculties = [];
        const facultyPatterns = [
            /Faculty of ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
        ];

        for (const pattern of facultyPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (!faculties.includes(match[1])) {
                    faculties.push(match[1]);
                }
            }
        }

        return faculties.slice(0, 10);
    }

    extractLanguageMedium(text) {
        const languages = [];
        
        if (text.toLowerCase().includes('english')) {
            languages.push('English');
        }
        if (text.toLowerCase().includes('afrikaans')) {
            languages.push('Afrikaans');
        }
        if (text.toLowerCase().includes('dual medium')) {
            return ['English', 'Afrikaans'];
        }
        
        return languages.length > 0 ? languages : ['English'];
    }

    extractStudentPopulation(text) {
        const patterns = [
            /(\d+[\s,]*\d*)\s+students?/i,
            /student\s+(?:population|body)\s*[:=]\s*(\d+[\s,]*\d*)/i,
            /enrollment\s*[:=]\s*(\d+[\s,]*\d*)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const number = match[1].replace(/[\s,]/g, '');
                return parseInt(number);
            }
        }

        return null;
    }

    getEstablishmentYear(universityName) {
        const years = {
            'University of Cape Town': 1829,
            'Stellenbosch University': 1918,
            'University of the Witwatersrand': 1896,
            'University of Pretoria': 1908,
            'University of KwaZulu-Natal': 2004,
            'University of the Free State': 1904
        };

        return years[universityName] || null;
    }

    generateDescription(universityName, text) {
        const descriptions = {
            'University of Cape Town': 'Africa\'s leading university, consistently ranked as the top university in Africa with world-class research facilities and academic programs.',
            'Stellenbosch University': 'Historic university known for excellence in agriculture, engineering, medicine, and wine studies, with strong research output.',
            'University of the Witwatersrand': 'Leading research-intensive university in South Africa, renowned for mining engineering, health sciences, and business education.',
            'University of Pretoria': 'One of South Africa\'s largest universities, famous for veterinary science, engineering, and innovative research programs.',
            'University of KwaZulu-Natal': 'Formed through merger, known for medicine, agriculture, and strong community engagement in KwaZulu-Natal.',
            'University of the Free State': 'Multicultural institution offering quality education across diverse fields with strong agricultural and health programs.'
        };

        return descriptions[universityName] || `${universityName} is a leading institution of higher learning in South Africa.`;
    }
}

// Run the processor if called directly
if (require.main === module) {
    const processor = new EnhancedUniversityProcessor();
    
    // Process all PDFs
    processor.processAllPDFs()
        .then(async result => {
            console.log('✅ Processing completed successfully');
            
            // Test the AI search functionality
            console.log('\n🧪 Testing AI Search...');
            await processor.testAISearch('What are the admission requirements for computer science at UCT?');
            await processor.testAISearch('Tell me about accommodation at Stellenbosch University');
            
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Processing failed:', error);
            process.exit(1);
        });
}

module.exports = EnhancedUniversityProcessor;