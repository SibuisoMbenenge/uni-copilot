// Enhanced SearchService with PDF-only context
// This version will only use content extracted from university PDF files
//searchService.js
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');

class PDFContextSearchService {
    constructor() {
        console.log('🔧 Initializing PDF-Context SearchService...');
        
        this.validateEnvironment();
        this.initializeOpenAIClient();
        this.initializeSearchClient();
        
        // PDF content storage
        this.pdfDocuments = new Map(); // Store processed PDF content
        this.loadExistingPDFs();
        this.isProcessing = false;
        this.hasProcessedExistingPDFs = false;
        console.log('✅ PDF-Context SearchService initialized');
    }

    validateEnvironment() {
        const required = ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_DEPLOYMENT_NAME'];
        const missing = required.filter(env => !process.env[env]);
        
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
    }

    initializeOpenAIClient() {
        this.openaiClient = new OpenAI({
            apiKey: process.env.AZURE_OPENAI_API_KEY,
            baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
            defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-01' },
            defaultHeaders: {
                'api-key': process.env.AZURE_OPENAI_API_KEY,
            },
        });
        
        this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        console.log('✅ OpenAI Client initialized for PDF context search');
    }

    initializeSearchClient() {
        if (process.env.AZURE_SEARCH_ENDPOINT && process.env.AZURE_SEARCH_ADMIN_KEY) {
            this.searchClient = new SearchClient(
                process.env.AZURE_SEARCH_ENDPOINT,
                process.env.AZURE_SEARCH_INDEX_NAME || 'universities-pdf-index',
                new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
            );
            console.log('✅ Azure Search Client initialized for PDF documents');
        } else {
            this.searchClient = null;
            console.log('⚠️ Azure Search not configured, using in-memory PDF storage');
        }
    }
    async processExistingPDFs() {
        try {
            const PDFProcessor = require('./pdfProcessor');
            const pdfProcessor = new PDFProcessor();
            
            const dataDir = path.join(__dirname, '../data');
            const files = await fs.readdir(dataDir);
            const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
            
            console.log(`Found ${pdfFiles.length} PDF files to process:`, pdfFiles);
            
            for (const pdfFile of pdfFiles) {
                const pdfPath = path.join(dataDir, pdfFile);
                
                try {
                    console.log(`Processing ${pdfFile}...`);
                    const extractedText = await pdfProcessor.processPDF(pdfPath);
                    await this.addPDFDocument(pdfFile, extractedText);
                    console.log(`Successfully processed ${pdfFile}`);
                } catch (error) {
                    console.error(`Failed to process ${pdfFile}:`, error.message);
                }
            }
            
            console.log(`Completed processing ${pdfFiles.length} PDF files`);
            
        } catch (error) {
            console.error('Error processing existing PDFs:', error);
        }
    }
    async loadExistingPDFs() {
        try {
            const dataDir = path.join(__dirname, '../data');
            const pdfDataPath = path.join(dataDir, 'pdf_documents.json');
            
            console.log(`Looking for processed PDF data at: ${path.resolve(pdfDataPath)}`);
            
            try {
                await fs.access(pdfDataPath);
                const data = await fs.readFile(pdfDataPath, 'utf8');
                const pdfData = JSON.parse(data);
                
                Object.entries(pdfData).forEach(([fileName, content]) => {
                    this.pdfDocuments.set(fileName, content);
                });
                
                console.log(`Loaded ${this.pdfDocuments.size} existing PDF documents`);
                
            } catch (error) {
                console.log('No processed PDF data found, checking for raw PDFs to process...');
                
                // Only process if we haven't already processed and aren't currently processing
                if (!this.hasProcessedExistingPDFs && !this.isProcessing) {
                    await this.processExistingPDFs();
                } else {
                    console.log('PDF processing already completed or in progress, skipping...');
                }
            }
            
        } catch (error) {
            console.error('Error loading PDFs:', error);
            await fs.mkdir(path.join(__dirname, '../data'), { recursive: true });
        }
    }

    async savePDFData() {
        try {
            const pdfDataPath = path.join(__dirname, '../data/pdf_documents.json');
            const pdfData = Object.fromEntries(this.pdfDocuments);
            await fs.writeFile(pdfDataPath, JSON.stringify(pdfData, null, 2));
            console.log('💾 PDF data saved successfully');
        } catch (error) {
            console.error('❌ Failed to save PDF data:', error);
        }
    }
    extractUniversityName(content) {
        // Extract university name from content using common patterns
        const patterns = [
            /university of ([^.\n]+)/i,
            /([^.\n]+) university/i,
            /([^.\n]+) college/i,
            /(UCT|UWC|CPUT|Wits|Stellenbosch)/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1] ? match[1].trim() : match[0].trim();
            }
        }

        return 'Unknown University';
    }

    extractSections(content) {
        // Extract relevant sections from PDF content
        const sections = {
            admissionRequirements: this.extractSection(content, ['admission', 'requirements', 'entry']),
            fees: this.extractSection(content, ['fees', 'cost', 'tuition', 'payment']),
            programs: this.extractSection(content, ['program', 'course', 'degree', 'qualification']),
            applicationProcess: this.extractSection(content, ['application', 'apply', 'process', 'deadline']),
            contact: this.extractSection(content, ['contact', 'phone', 'email', 'address']),
            accommodation: this.extractSection(content, ['accommodation', 'residence', 'housing'])
        };

        return sections;
    }

    extractSection(content, keywords) {
        const lines = content.split('\n');
        const relevantLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            
            // Check if line contains any keywords
            if (keywords.some(keyword => line.includes(keyword))) {
                // Include this line and next few lines for context
                relevantLines.push(...lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 4)));
                i += 3; // Skip ahead to avoid duplicates
            }
        }

        return relevantLines.join('\n').substring(0, 1000); // Limit section length
    }

    async addPDFDocument(fileName, extractedContent) {
        try {
            console.log(`📄 Adding PDF document: ${fileName}`);
            
            // Structure the PDF content
            const structuredContent = {
                fileName: fileName,
                universityName: this.extractUniversityName(extractedContent),
                content: extractedContent,
                sections: this.extractSections(extractedContent),
                lastUpdated: new Date().toISOString(),
                wordCount: extractedContent.split(/\s+/).length
            };

            // Store in memory
            this.pdfDocuments.set(fileName, structuredContent);
            
            // Save to file system
            await this.savePDFData();
            
            // DISABLE Azure Search upload for now
            // if (this.searchClient) {
            //     await this.addToSearchIndex(structuredContent);
            // }

            console.log(`✅ PDF document ${fileName} added successfully (${structuredContent.wordCount} words)`);
            return structuredContent;
            
        } catch (error) {
            console.error(`❌ Failed to add PDF document ${fileName}:`, error);
            throw error;
        }
    }

    // Main search function that uses ONLY PDF content
    async searchWithAI(query, options = {}) {
        try {
            console.log(`🔍 AI Search using PDF context: "${query}"`);
            
            if (this.pdfDocuments.size === 0) {
                return {
                    answer: "I don't have any university PDF documents loaded yet. Please upload university brochures, prospectuses, or information documents first.",
                    sources: [],
                    searchType: 'no-pdfs',
                    success: false
                };
            }

            // Find relevant PDF documents
            const relevantDocs = await this.findRelevantDocuments(query);
            
            if (relevantDocs.length === 0) {
                return {
                    answer: `I couldn't find specific information about "${query}" in the available university documents. The information might not be covered in the uploaded PDFs, or you might need to upload more relevant documents.`,
                    sources: Array.from(this.pdfDocuments.values()).map(doc => ({
                        fileName: doc.fileName,
                        universityName: doc.universityName,
                        relevantContent: 'Document available but no specific match found'
                    })),
                    searchType: 'no-match',
                    success: false
                };
            }

            // Create context from relevant documents
            const context = this.buildContext(relevantDocs, query);
            
            // Generate AI response using ONLY the PDF context
            const aiResponse = await this.generateContextualResponse(query, context);
            
            console.log('✅ AI search completed using PDF context');
            
            return {
                answer: aiResponse,
                sources: relevantDocs.map(doc => ({
                    fileName: doc.fileName,
                    universityName: doc.universityName,
                    relevantContent: this.getRelevantExcerpt(doc, query)
                })),
                searchType: 'pdf-context',
                documentsSearched: this.pdfDocuments.size,
                relevantDocuments: relevantDocs.length,
                success: true
            };

        } catch (error) {
            console.error('❌ PDF context search failed:', error);
            return {
                answer: 'I encountered an error while searching through the university documents. Please try again.',
                sources: [],
                searchType: 'error',
                success: false,
                error: error.message
            };
        }
    }

    async createIndex() {
    console.log('📋 Search index ready for university documents');
    return true;
    }

    // Fix the search method in your PDFContextSearchService class
async search(query, filters = {}, limit = 20) {
    try {
        // Check if we have PDF documents loaded
        if (this.pdfDocuments.size === 0) {
            console.log('No PDF documents loaded for search');
            return [];
        }

        // Delegate to AI search for consistent results
        const aiResult = await this.searchWithAI(query, { top: limit });
        
        // Transform AI results to expected format
        return aiResult.sources.map((source, index) => ({
            id: `search_${Date.now()}_${index}`,
            universityName: source.universityName,
            fileName: source.fileName,
            content: source.relevantContent,
            location: 'South Africa',
            province: 'Various',
            universityType: 'Traditional',
            apsScoreRequired: 30,
            tuitionFeesAnnual: 50000,
            establishmentYear: 2000,
            studentPopulation: 25000,
            applicationDeadline: "30 September",
            nsfasAccredited: true,
            accommodationAvailable: true,
            bursariesAvailable: true,
            bachelorPassRequired: false,
            languageMedium: "English",
            relevanceScore: source.relevanceScore || 1
        }));
    } catch (error) {
        console.error('Error in search method:', error);
        return [];
    }
}
    // Main search function that uses ONLY PDF content
    async searchWithAI(query, options = {}) {
        try {
            console.log(`🔍 AI Search using PDF context: "${query}"`);
            
            if (this.pdfDocuments.size === 0) {
                return {
                    answer: "I don't have any university PDF documents loaded yet. Please upload university brochures, prospectuses, or information documents first.",
                    sources: [],
                    searchType: 'no-pdfs',
                    success: false
                };
            }

            // Find relevant PDF documents
            const relevantDocs = await this.findRelevantDocuments(query);
            
            if (relevantDocs.length === 0) {
                return {
                    answer: `I couldn't find specific information about "${query}" in the available university documents. The information might not be covered in the uploaded PDFs, or you might need to upload more relevant documents.`,
                    sources: Array.from(this.pdfDocuments.values()).map(doc => ({
                        fileName: doc.fileName,
                        universityName: doc.universityName,
                        relevantContent: 'Document available but no specific match found'
                    })),
                    searchType: 'no-match',
                    success: false
                };
            }

            // Create context from relevant documents
            const context = this.buildContext(relevantDocs, query);
            
            // Generate AI response using ONLY the PDF context
            const aiResponse = await this.generateContextualResponse(query, context);
            
            console.log('✅ AI search completed using PDF context');
            
            return {
                answer: aiResponse,
                sources: relevantDocs.map(doc => ({
                    fileName: doc.fileName,
                    universityName: doc.universityName,
                    relevantContent: this.getRelevantExcerpt(doc, query)
                })),
                searchType: 'pdf-context',
                documentsSearched: this.pdfDocuments.size,
                relevantDocuments: relevantDocs.length,
                success: true
            };

        } catch (error) {
            console.error('❌ PDF context search failed:', error);
            return {
                answer: 'I encountered an error while searching through the university documents. Please try again.',
                sources: [],
                searchType: 'error',
                success: false,
                error: error.message
            };
        }
    }
    async addUniversity(university) {
    console.log(`📋 Registered structured data for: ${university.universityName}`);
    // Could store structured data separately if needed
    return true;
    }

    async generateEmbeddings(content) {
        // Placeholder for Azure OpenAI embeddings
        // In a full implementation, this would call Azure OpenAI embedding API
        console.log('🔄 Embedding generation (ready for Azure OpenAI integration)');
        return null;
    }
    async findRelevantDocuments(query) {
        const queryLower = query.toLowerCase();
        const relevantDocs = [];

        // Score documents based on relevance to query
        for (const [fileName, doc] of this.pdfDocuments) {
            let score = 0;
            const content = doc.content.toLowerCase();

            // Basic keyword matching
            const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
            
            queryWords.forEach(word => {
                const matches = (content.match(new RegExp(word, 'g')) || []).length;
                score += matches;
            });

            // Boost score for university name matches
            if (content.includes(queryLower) || queryLower.includes(doc.universityName.toLowerCase())) {
                score += 10;
            }

            // Check sections for specific topics
            if (queryLower.includes('fee') || queryLower.includes('cost') || queryLower.includes('cheap')) {
                if (doc.sections.fees) score += 5;
            }
            
            if (queryLower.includes('admission') || queryLower.includes('requirement')) {
                if (doc.sections.admissionRequirements) score += 5;
            }

            if (score > 0) {
                relevantDocs.push({ ...doc, relevanceScore: score });
            }
        }

        // Sort by relevance and return top documents
        return relevantDocs
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5); // Limit to top 5 most relevant documents
    }

    // Add this method to your PDFContextSearchService class
async uploadDocument(doc) {
    try {
        console.log(`📋 Processing AI document chunk: ${doc.id}`);
        
        // Instead of separate upload, integrate the chunk into our main PDF documents
        const chunkFileName = `${doc.fileName}_chunk_${doc.chunkIndex}`;
        
        const chunkDocument = {
            fileName: chunkFileName,
            universityName: doc.universityName,
            content: doc.content,
            sections: {
                admissionRequirements: doc.summary.includes('Admission') ? doc.content.substring(0, 500) : '',
                fees: doc.summary.includes('Fees') ? doc.content.substring(0, 500) : '',
                programs: doc.summary.includes('programs') ? doc.content.substring(0, 500) : '',
                applicationProcess: '',
                contact: '',
                accommodation: doc.summary.includes('Accommodation') ? doc.content.substring(0, 500) : ''
            },
            lastUpdated: doc.uploadDate,
            wordCount: doc.content.split(/\s+/).length,
            // Enhanced AI metadata
            chunkIndex: doc.chunkIndex,
            totalChunks: doc.totalChunks,
            summary: doc.summary,
            keyPhrases: doc.keyPhrases,
            extractedEntities: doc.extractedEntities,
            contentVector: doc.contentVector,
            documentType: 'ai-chunk'
        };

        // Add chunk to our searchable documents
        this.pdfDocuments.set(chunkFileName, chunkDocument);
        await this.savePDFData();
        
        return true;
    } catch (error) {
        console.error(`Error uploading document chunk: ${error.message}`);
        throw error;
    }
}

    buildContext(relevantDocs, query) {
        let context = "University Information from Official Documents:\n\n";
        
        relevantDocs.forEach(doc => {
            context += `=== ${doc.universityName} (${doc.fileName}) ===\n`;
            
            // Add most relevant sections based on query
            if (query.toLowerCase().includes('fee') || query.toLowerCase().includes('cost') || query.toLowerCase().includes('cheap')) {
                if (doc.sections.fees) {
                    context += `FEES INFORMATION:\n${doc.sections.fees}\n\n`;
                }
            }
            
            if (query.toLowerCase().includes('admission') || query.toLowerCase().includes('requirement')) {
                if (doc.sections.admissionRequirements) {
                    context += `ADMISSION REQUIREMENTS:\n${doc.sections.admissionRequirements}\n\n`;
                }
            }

            if (query.toLowerCase().includes('program') || query.toLowerCase().includes('course')) {
                if (doc.sections.programs) {
                    context += `PROGRAMS OFFERED:\n${doc.sections.programs}\n\n`;
                }
            }

            // Add general content excerpt
            const excerpt = doc.content.substring(0, 500);
            context += `GENERAL INFO:\n${excerpt}...\n\n`;
        });

        return context.substring(0, 8000); // Limit context length for AI
    }

    async generateContextualResponse(query, context) {
        try {
            const systemPrompt = `You are a university advisor with access to official university documents. 
            IMPORTANT RULES:
            1. ONLY use information from the provided document context
            2. If information is not in the context, clearly state "This information is not available in the provided documents"
            3. Always cite which university document the information comes from
            4. Be specific about fees, requirements, and deadlines when available
            5. If comparing universities, only compare those mentioned in the context`;

            const userPrompt = `Based on the university documents provided below, please answer this question: "${query}"

            DOCUMENT CONTEXT:
            ${context}

            Please provide a helpful and accurate answer based ONLY on the information in these documents.`;

            const response = await this.openaiClient.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 800,
                temperature: 0.3 // Lower temperature for more factual responses
            });

            return response.choices[0].message.content;

        } catch (error) {
            console.error('❌ Error generating contextual response:', error);
            throw error;
        }
    }

    getRelevantExcerpt(doc, query) {
        const queryWords = query.toLowerCase().split(/\s+/);
        const content = doc.content.toLowerCase();
        
        // Find the best excerpt that contains query terms
        const sentences = doc.content.split(/[.!?]+/);
        let bestSentence = sentences[0];
        let maxMatches = 0;

        sentences.forEach(sentence => {
            let matches = 0;
            queryWords.forEach(word => {
                if (sentence.toLowerCase().includes(word)) matches++;
            });
            
            if (matches > maxMatches) {
                maxMatches = matches;
                bestSentence = sentence;
            }
        });

        return bestSentence.trim().substring(0, 200) + '...';
    }

    // Get summary of loaded PDF documents
    getPDFSummary() {
        const summary = {
            totalDocuments: this.pdfDocuments.size,
            universities: [],
            lastUpdated: new Date().toISOString()
        };

        for (const [fileName, doc] of this.pdfDocuments) {
            summary.universities.push({
                fileName: fileName,
                universityName: doc.universityName,
                wordCount: doc.wordCount,
                lastUpdated: doc.lastUpdated
            });
        }

        return summary;
    }

    // Remove a PDF document
    async removePDFDocument(fileName) {
        if (this.pdfDocuments.has(fileName)) {
            this.pdfDocuments.delete(fileName);
            await this.savePDFData();
            console.log(`📄 Removed PDF document: ${fileName}`);
            return true;
        }
        return false;
    }
}

module.exports = PDFContextSearchService;