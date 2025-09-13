/**
 * Azure AI Search Service - PDF-based AI Agent for South African Universities
 * Handles PDF indexing, search operations, and AI-powered responses
 */

const { SearchClient, SearchIndexClient } = require('@azure/search-documents');
const { AzureKeyCredential } = require('@azure/core-auth');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DocumentAnalysisClient } = require('@azure/ai-form-recognizer');

// Use OpenAI library with Azure configuration instead of @azure/openai
const { OpenAI } = require('openai');

class SearchService {
    constructor() {
        // Validate credentials first
        this.validateCredentials();
        
        // Azure Search credentials
        this.searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
        this.searchApiKey = process.env.AZURE_SEARCH_ADMIN_KEY;
        this.indexName = process.env.AZURE_SEARCH_INDEX_NAME || 'universities';
        
        // Azure Storage credentials (for PDF files)
        this.storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.containerName = 'university-pdfs';
        
        // Azure OpenAI credentials
        this.openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
        this.openaiApiKey = process.env.AZURE_OPENAI_API_KEY;
        this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';
        
        // Azure Form Recognizer credentials
        this.formRecognizerEndpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
        this.formRecognizerApiKey = process.env.AZURE_FORM_RECOGNIZER_API_KEY;
        
        // Feature flags
        this.supportsVectorSearch = true; // Will be set during index creation
        
        // Initialize clients
        this.searchClient = new SearchClient(
            this.searchEndpoint,
            this.indexName,
            new AzureKeyCredential(this.searchApiKey)
        );
        
        this.indexClient = new SearchIndexClient(
            this.searchEndpoint,
            new AzureKeyCredential(this.searchApiKey)
        );
        
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
            this.storageConnectionString
        );
        
        // Initialize Form Recognizer client if credentials are provided
        if (this.formRecognizerEndpoint && this.formRecognizerApiKey) {
            this.documentAnalysisClient = new DocumentAnalysisClient(
                this.formRecognizerEndpoint,
                new AzureKeyCredential(this.formRecognizerApiKey)
            );
        }
        
        // Initialize OpenAI client for Azure OpenAI - FIXED VERSION
        this.openaiClient = new OpenAI({
            apiKey: this.openaiApiKey,
            baseURL: `${this.openaiEndpoint}/openai/deployments/${this.deploymentName}`,
            defaultQuery: { 'api-version': '2024-02-01' },
            defaultHeaders: {
                'api-key': this.openaiApiKey,
            }
        });
        
        console.log('✅ Enhanced Azure Search Service initialized');
    }
    
    validateCredentials() {
        const required = [
            'AZURE_SEARCH_ENDPOINT',
            'AZURE_SEARCH_ADMIN_KEY',
            'AZURE_STORAGE_CONNECTION_STRING',
            'AZURE_OPENAI_ENDPOINT',
            'AZURE_OPENAI_API_KEY'
        ];
        
        // Form Recognizer is optional but recommended
        const optional = [
            'AZURE_FORM_RECOGNIZER_ENDPOINT',
            'AZURE_FORM_RECOGNIZER_API_KEY'
        ];
        
        const missing = required.filter(key => !process.env[key] || process.env[key].trim() === '');
        if (missing.length > 0) {
            throw new Error(`Missing or empty environment variables: ${missing.join(', ')}`);
        }
        
        const missingOptional = optional.filter(key => !process.env[key] || process.env[key].trim() === '');
        if (missingOptional.length > 0) {
            console.log(`⚠️  Optional services not configured: ${missingOptional.join(', ')}`);
            console.log('PDF extraction will use fallback method instead of Azure Form Recognizer');
        }
        
        console.log('✅ All required environment variables are present');
    }
    
    /**
     * Create or update the search index for PDF documents
     */
    async createIndex() {
        try {
            // Check if vector search is supported by trying a vector-enabled index first
            const vectorIndexDefinition = {
                name: this.indexName,
                fields: [
                    { name: "id", type: "Edm.String", key: true, searchable: false, filterable: true },
                    { name: "fileName", type: "Edm.String", searchable: true, filterable: true, sortable: true },
                    { name: "universityName", type: "Edm.String", searchable: true, filterable: true, facetable: true },
                    { name: "documentType", type: "Edm.String", filterable: true, facetable: true },
                    { name: "content", type: "Edm.String", searchable: true, analyzer: "en.microsoft" },
                    { name: "summary", type: "Edm.String", searchable: true },
                    { name: "extractedEntities", type: "Collection(Edm.String)", searchable: true, filterable: true },
                    { name: "keyPhrases", type: "Collection(Edm.String)", searchable: true, filterable: true },
                    { name: "uploadDate", type: "Edm.DateTimeOffset", filterable: true, sortable: true },
                    { name: "lastModified", type: "Edm.DateTimeOffset", filterable: true, sortable: true },
                    { name: "contentVector", type: "Collection(Edm.Single)", searchable: true, dimensions: 1536, vectorSearchProfile: "vector-profile" }
                ],
                vectorSearch: {
                    algorithms: [
                        {
                            name: "vector-algorithm",
                            kind: "hnsw",
                            hnswParameters: {
                                metric: "cosine",
                                m: 4,
                                efConstruction: 400,
                                efSearch: 500
                            }
                        }
                    ],
                    profiles: [
                        {
                            name: "vector-profile",
                            algorithmConfigurationName: "vector-algorithm"
                        }
                    ]
                },
                semantic: {
                    configurations: [
                        {
                            name: "semantic-config",
                            prioritizedFields: {
                                titleField: { fieldName: "fileName" },
                                prioritizedContentFields: [
                                    { fieldName: "content" },
                                    { fieldName: "summary" }
                                ],
                                prioritizedKeywordsFields: [
                                    { fieldName: "keyPhrases" },
                                    { fieldName: "extractedEntities" }
                                ]
                            }
                        }
                    ]
                }
            };

            try {
                await this.indexClient.createOrUpdateIndex(vectorIndexDefinition);
                console.log('✅ Vector search index created/updated successfully');
                this.supportsVectorSearch = true;
            } catch (vectorError) {
                console.log('⚠️  Vector search not supported, creating basic index...');
                
                // Fallback to basic index without vector search
                const basicIndexDefinition = {
                    name: this.indexName,
                    fields: [
                        { name: "id", type: "Edm.String", key: true, searchable: false, filterable: true },
                        { name: "fileName", type: "Edm.String", searchable: true, filterable: true, sortable: true },
                        { name: "universityName", type: "Edm.String", searchable: true, filterable: true, facetable: true },
                        { name: "documentType", type: "Edm.String", filterable: true, facetable: true },
                        { name: "content", type: "Edm.String", searchable: true, analyzer: "en.microsoft" },
                        { name: "summary", type: "Edm.String", searchable: true },
                        { name: "extractedEntities", type: "Collection(Edm.String)", searchable: true, filterable: true },
                        { name: "keyPhrases", type: "Collection(Edm.String)", searchable: true, filterable: true },
                        { name: "uploadDate", type: "Edm.DateTimeOffset", filterable: true, sortable: true },
                        { name: "lastModified", type: "Edm.DateTimeOffset", filterable: true, sortable: true }
                    ]
                };
                
                await this.indexClient.createOrUpdateIndex(basicIndexDefinition);
                console.log('✅ Basic search index created/updated successfully');
                this.supportsVectorSearch = false;
            }
        } catch (error) {
            console.error('❌ Error creating index:', error);
            throw error;
        }
    }
    
    /**
     * Upload PDF to Azure Storage and process it
     */
    async uploadPDF(pdfBuffer, fileName, metadata = {}) {
        try {
            // Upload to blob storage
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            await containerClient.createIfNotExists({ access: 'blob' });
            
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            await blockBlobClient.upload(pdfBuffer, pdfBuffer.length, {
                blobHTTPHeaders: { blobContentType: 'application/pdf' },
                metadata: metadata
            });
            
            console.log(`✅ PDF uploaded: ${fileName}`);
            
            // Process the PDF and index it
            await this.processPDFAndIndex(fileName, metadata);
            
            return { success: true, fileName, url: blockBlobClient.url };
        } catch (error) {
            console.error('❌ Error uploading PDF:', error);
            throw error;
        }
    }
    
    /**
     * Process PDF using Azure Cognitive Services and index the content
     */
    async processPDFAndIndex(fileName, metadata) {
        try {
            // Here you would typically use Azure Form Recognizer or Document Intelligence
            // For now, we'll simulate the extracted content
            const extractedContent = await this.extractPDFContent(fileName);
            
            // Generate embeddings for the content
            const contentVector = await this.generateEmbeddings(extractedContent.text);
            
            // Extract key phrases and entities (you can use Azure Text Analytics)
            const keyPhrases = await this.extractKeyPhrases(extractedContent.text);
            const entities = await this.extractEntities(extractedContent.text);
            
            // Create search document
            const document = {
                id: this.generateDocumentId(fileName),
                fileName: fileName,
                universityName: metadata.universityName || this.extractUniversityName(extractedContent.text),
                documentType: metadata.documentType || 'prospectus',
                content: extractedContent.text,
                summary: extractedContent.summary,
                extractedEntities: entities,
                keyPhrases: keyPhrases,
                uploadDate: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            
            // Add vector if supported
            if (this.supportsVectorSearch) {
                document.contentVector = contentVector;
            }
            
            // Upload to search index
            const result = await this.searchClient.uploadDocuments([document]);
            
            if (result.results[0].succeeded) {
                console.log(`✅ Document indexed: ${fileName}`);
            } else {
                throw new Error(`Failed to index document: ${fileName}`);
            }
            
            return document;
        } catch (error) {
            console.error('❌ Error processing PDF:', error);
            throw error;
        }
    }
    
    /**
     * Extract content from PDF using Azure Form Recognizer or fallback method
     */
    async extractPDFContent(fileName) {
        try {
            console.log(`📄 Extracting content from: ${fileName}`);
            
            // Get the PDF from blob storage
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            
            // Check if blob exists
            const exists = await blockBlobClient.exists();
            if (!exists) {
                throw new Error(`PDF file ${fileName} not found in blob storage`);
            }
            
            // Try Azure Form Recognizer first if available
            if (this.documentAnalysisClient) {
                return await this.extractWithFormRecognizer(blockBlobClient);
            } else {
                // Fallback to basic extraction
                return await this.extractWithFallbackMethod(blockBlobClient, fileName);
            }
            
        } catch (error) {
            console.error(`❌ Error extracting PDF content from ${fileName}:`, error);
            
            // Return basic fallback content
            return {
                text: `Failed to extract content from ${fileName}. Please check the file format and try again.`,
                summary: `Content extraction failed for ${fileName}`,
                pages: 0,
                tables: [],
                keyValuePairs: {}
            };
        }
    }
    
    /**
     * Extract PDF content using Azure Form Recognizer (Document Intelligence)
     */
    async extractWithFormRecognizer(blockBlobClient) {
        try {
            console.log('🤖 Using Azure Form Recognizer for PDF extraction');
            
            // Get the blob URL for Form Recognizer
            const blobUrl = blockBlobClient.url;
            
            // Use the prebuilt-read model for general document reading
            const poller = await this.documentAnalysisClient.beginAnalyzeDocumentFromUrl(
                "prebuilt-read", // You can also use "prebuilt-document" or "prebuilt-layout"
                blobUrl
            );
            
            // Wait for the analysis to complete
            const result = await poller.pollUntilDone();
            
            if (!result || !result.content) {
                throw new Error('No content extracted from document');
            }
            
            // Extract text content
            const fullText = result.content;
            
            // Extract tables if available
            const tables = [];
            if (result.tables) {
                for (const table of result.tables) {
                    const tableData = {
                        rowCount: table.rowCount,
                        columnCount: table.columnCount,
                        cells: table.cells.map(cell => ({
                            content: cell.content,
                            rowIndex: cell.rowIndex,
                            columnIndex: cell.columnIndex
                        }))
                    };
                    tables.push(tableData);
                }
            }
            
            // Extract key-value pairs if available
            const keyValuePairs = {};
            if (result.keyValuePairs) {
                for (const kvp of result.keyValuePairs) {
                    if (kvp.key && kvp.value) {
                        keyValuePairs[kvp.key.content] = kvp.value.content;
                    }
                }
            }
            
            // Generate a summary using the extracted content
            const summary = await this.generateDocumentSummary(fullText);
            
            console.log(`✅ Form Recognizer extracted ${fullText.length} characters from PDF`);
            
            return {
                text: fullText,
                summary: summary,
                pages: result.pages ? result.pages.length : 1,
                tables: tables,
                keyValuePairs: keyValuePairs,
                extractionMethod: 'Azure Form Recognizer'
            };
            
        } catch (error) {
            console.error('❌ Form Recognizer extraction failed:', error);
            throw error;
        }
    }
    
    /**
     * Fallback PDF extraction method using pdf-parse library
     */
    async extractWithFallbackMethod(blockBlobClient, fileName) {
        try {
            console.log('📚 Using fallback method for PDF extraction');
            
            // Download the PDF buffer
            const downloadResponse = await blockBlobClient.download(0);
            const pdfBuffer = await this.streamToBuffer(downloadResponse.readableStreamBody);
            
            // Try to use pdf-parse if available
            try {
                const pdf = require('pdf-parse');
                const data = await pdf(pdfBuffer);
                
                const summary = await this.generateDocumentSummary(data.text);
                
                console.log(`✅ Fallback method extracted ${data.text.length} characters from PDF`);
                
                return {
                    text: data.text,
                    summary: summary,
                    pages: data.numpages,
                    tables: [], // Tables not extracted in fallback method
                    keyValuePairs: {},
                    extractionMethod: 'pdf-parse fallback'
                };
                
            } catch (pdfParseError) {
                console.log('pdf-parse not available, using basic extraction');
                
                // Very basic extraction - just return filename and basic info
                const basicText = `Document: ${fileName}\nThis PDF document could not be fully processed. Please ensure pdf-parse is installed or configure Azure Form Recognizer for better extraction.`;
                
                return {
                    text: basicText,
                    summary: `Basic information for ${fileName}`,
                    pages: 1,
                    tables: [],
                    keyValuePairs: {},
                    extractionMethod: 'basic fallback'
                };
            }
            
        } catch (error) {
            console.error('❌ Fallback extraction failed:', error);
            throw error;
        }
    }
    
    /**
     * Generate a summary of the document content using OpenAI
     */
    async generateDocumentSummary(text) {
        try {
            // Truncate text if it's too long for the API
            const maxLength = 8000; // Leave room for prompt and response
            const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            
            const response = await this.openaiClient.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that creates concise summaries of university documents. Focus on key information like programs, requirements, deadlines, and important details.'
                    },
                    {
                        role: 'user',
                        content: `Please provide a concise summary of this document content:\n\n${truncatedText}`
                    }
                ],
                max_tokens: 200,
                temperature: 0.3
            });
            
            return response.choices[0].message.content;
        } catch (error) {
            console.error('❌ Error generating document summary:', error);
            // Return a basic summary if AI generation fails
            const words = text.split(' ').slice(0, 50).join(' ');
            return `Document summary: ${words}...`;
        }
    }
    
    /**
     * Helper function to convert stream to buffer
     */
    async streamToBuffer(readableStream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            readableStream.on('data', (data) => {
                chunks.push(data instanceof Buffer ? data : Buffer.from(data));
            });
            readableStream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            readableStream.on('error', reject);
        });
    }
    
    /**
     * Generate embeddings using Azure OpenAI
     */
    async generateEmbeddings(text) {
        try {
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text
            });
            
            return response.data[0].embedding;
        } catch (error) {
            console.error('❌ Error generating embeddings:', error);
            // Return empty vector if embedding generation fails
            return new Array(1536).fill(0);
        }
    }
    
    /**
     * Extract key phrases (implement with Azure Text Analytics)
     */
    async extractKeyPhrases(text) {
        // Placeholder implementation
        // Use Azure Text Analytics API for real key phrase extraction
        const phrases = text.split(' ')
            .filter(word => word.length > 5)
            .slice(0, 10);
        
        return phrases;
    }
    
    /**
     * Extract entities (implement with Azure Text Analytics)
     */
    async extractEntities(text) {
        // Placeholder implementation
        // Use Azure Text Analytics API for real entity extraction
        const entities = ['University', 'South Africa', 'Bachelor', 'Degree'];
        return entities;
    }
    
    /**
     * AI-powered search with context from PDFs
     */
    async searchWithAI(userQuery, options = {}) {
        try {
            let searchResults;
            
            if (this.supportsVectorSearch) {
                // Generate embedding for the user query
                const queryVector = await this.generateEmbeddings(userQuery);
                
                // Perform hybrid search (text + vector)
                const searchOptions = {
                    top: options.top || 5,
                    select: ['fileName', 'universityName', 'content', 'summary', 'keyPhrases'],
                    vectors: [{
                        value: queryVector,
                        kNearestNeighborsCount: 3,
                        fields: 'contentVector'
                    }],
                    queryType: 'semantic',
                    semanticSearchOptions: {
                        configurationName: 'semantic-config',
                        query: userQuery
                    }
                };
                
                searchResults = await this.searchClient.search(userQuery, searchOptions);
            } else {
                // Fallback to text-only search
                const searchOptions = {
                    top: options.top || 5,
                    select: ['fileName', 'universityName', 'content', 'summary', 'keyPhrases'],
                    queryType: 'simple'
                };
                
                searchResults = await this.searchClient.search(userQuery, searchOptions);
            }
            
            // Collect relevant documents
            const relevantDocs = [];
            for await (const result of searchResults.results) {
                relevantDocs.push(result.document);
            }
            
            // Generate AI response using the context
            const aiResponse = await this.generateAIResponse(userQuery, relevantDocs);
            
            return {
                answer: aiResponse,
                sources: relevantDocs.map(doc => ({
                    fileName: doc.fileName,
                    universityName: doc.universityName,
                    relevantContent: doc.content.substring(0, 200) + '...'
                })),
                searchType: this.supportsVectorSearch ? 'hybrid' : 'text-only'
            };
        } catch (error) {
            console.error('❌ AI search error:', error);
            throw error;
        }
    }
    
    /**
     * Generate AI response using OpenAI with retrieved context
     */
    async generateAIResponse(userQuery, relevantDocs) {
        try {
            const context = relevantDocs.map(doc => 
                `Document: ${doc.fileName} (${doc.universityName})\nContent: ${doc.content}`
            ).join('\n\n---\n\n');
            
            const systemPrompt = `You are a helpful assistant for South African university information. 
            Use the provided context from university documents to answer questions accurately.
            If the information is not in the provided context, say so clearly.
            Focus on being helpful, accurate, and specific to South African universities.`;
            
            const userPrompt = `Context from university documents:
            ${context}
            
            User Question: ${userQuery}
            
            Please provide a comprehensive answer based on the context provided.`;
            
            const response = await this.openaiClient.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 800,
                temperature: 0.3
            });
            
            return response.choices[0].message.content;
        } catch (error) {
            console.error('❌ Error generating AI response:', error);
            return 'I apologize, but I encountered an error while generating a response. Please try again.';
        }
    }
        getSampleUniversities(filters = {}, limit = 20) {
        const sampleData = [
            {
                id: "uct_001",
                universityName: "University of Cape Town",
                location: "Cape Town",
                province: "Western Cape",
                universityType: "Traditional",
                apsScoreRequired: 42,
                tuitionFeesAnnual: 65000,
                establishmentYear: 1829,
                studentPopulation: 29000,
                applicationDeadline: "30 September",
                nsfasAccredited: true,
                accommodationAvailable: true,
                bursariesAvailable: true,
                bachelorPassRequired: true,
                languageMedium: "English",
                content: "University of Cape Town prospectus content...",
                summary: "Leading research university in South Africa"
            },
            {
                id: "wits_001",
                universityName: "University of the Witwatersrand",
                location: "Johannesburg",
                province: "Gauteng",
                universityType: "Traditional",
                apsScoreRequired: 40,
                tuitionFeesAnnual: 58000,
                establishmentYear: 1922,
                studentPopulation: 38000,
                applicationDeadline: "30 September",
                nsfasAccredited: true,
                accommodationAvailable: true,
                bursariesAvailable: true,
                bachelorPassRequired: true,
                languageMedium: "English"
            },
            {
                id: "stellenbosch_001",
                universityName: "Stellenbosch University",
                location: "Stellenbosch",
                province: "Western Cape",
                universityType: "Traditional",
                apsScoreRequired: 38,
                tuitionFeesAnnual: 52000,
                establishmentYear: 1918,
                studentPopulation: 32000,
                applicationDeadline: "30 September",
                nsfasAccredited: true,
                accommodationAvailable: true,
                bursariesAvailable: true,
                bachelorPassRequired: true,
                languageMedium: "Dual Medium"
            },
            {
                id: "up_001",
                universityName: "University of Pretoria",
                location: "Pretoria",
                province: "Gauteng",
                universityType: "Traditional",
                apsScoreRequired: 36,
                tuitionFeesAnnual: 55000,
                establishmentYear: 1908,
                studentPopulation: 56000,
                applicationDeadline: "31 August",
                nsfasAccredited: true,
                accommodationAvailable: true,
                bursariesAvailable: true,
                bachelorPassRequired: false,
                languageMedium: "English"
            },
            {
                id: "cput_001",
                universityName: "Cape Peninsula University of Technology",
                location: "Cape Town",
                province: "Western Cape",
                universityType: "University of Technology",
                apsScoreRequired: 24,
                tuitionFeesAnnual: 35000,
                establishmentYear: 2005,
                studentPopulation: 32000,
                applicationDeadline: "30 September",
                nsfasAccredited: true,
                accommodationAvailable: true,
                bursariesAvailable: true,
                bachelorPassRequired: false,
                languageMedium: "English"
            }
        ];
        
        // Apply filters to sample data
        let filteredData = sampleData;
        
        // Apply filters
        if (filters.minAPS) {
            filteredData = filteredData.filter(uni => uni.apsScoreRequired >= filters.minAPS);
        }
        if (filters.maxAPS) {
            filteredData = filteredData.filter(uni => uni.apsScoreRequired <= filters.maxAPS);
        }
        if (filters.province) {
            filteredData = filteredData.filter(uni => uni.province === filters.province);
        }
        if (filters.universityType) {
            filteredData = filteredData.filter(uni => uni.universityType === filters.universityType);
        }
        if (filters.maxTuitionFees) {
            filteredData = filteredData.filter(uni => uni.tuitionFeesAnnual <= filters.maxTuitionFees);
        }
        if (filters.languageMedium) {
            filteredData = filteredData.filter(uni => uni.languageMedium === filters.languageMedium);
        }
        if (filters.nsfasAccredited === true) {
            filteredData = filteredData.filter(uni => uni.nsfasAccredited === true);
        }
        if (filters.accommodationAvailable === true) {
            filteredData = filteredData.filter(uni => uni.accommodationAvailable === true);
        }
        if (filters.bachelorPassRequired === true) {
            filteredData = filteredData.filter(uni => uni.bachelorPassRequired === true);
        }
        
        return filteredData.slice(0, limit);
    }
    /**
     * Simple text search (fallback)
     */
    async search(query, filters = {}, top = 20) {
        try {
            console.log('SearchService.search called with:', { query, filters, top });
            
            // Build search options
            const searchOptions = {
                top: Math.min(top, 100), // Limit max results
                includeTotalCount: true,
                select: [
                    'id', 'fileName', 'universityName', 'documentType',
                    'content', 'summary', 'keyPhrases', 'uploadDate',
                    'location', 'province', 'universityType',
                    'apsScoreRequired', 'tuitionFeesAnnual', 'establishmentYear',
                    'studentPopulation', 'applicationDeadline', 'nsfasAccredited',
                    'accommodationAvailable', 'bursariesAvailable', 'bachelorPassRequired',
                    'languageMedium'
                ]
            };
            
            // Build filter string for Azure Search
            const filterConditions = [];
            
            // APS Score Range
            if (filters.minAPS !== undefined && filters.minAPS !== null) {
                filterConditions.push(`apsScoreRequired ge ${filters.minAPS}`);
            }
            if (filters.maxAPS !== undefined && filters.maxAPS !== null) {
                filterConditions.push(`apsScoreRequired le ${filters.maxAPS}`);
            }
            
            // Province filter
            if (filters.province) {
                filterConditions.push(`province eq '${filters.province.replace(/'/g, "''")}'`);
            }
            
            // University type filter
            if (filters.universityType) {
                filterConditions.push(`universityType eq '${filters.universityType.replace(/'/g, "''")}'`);
            }
            
            // Maximum tuition fees
            if (filters.maxTuitionFees !== undefined && filters.maxTuitionFees !== null) {
                filterConditions.push(`tuitionFeesAnnual le ${filters.maxTuitionFees}`);
            }
            
            // Language medium
            if (filters.languageMedium) {
                filterConditions.push(`languageMedium eq '${filters.languageMedium.replace(/'/g, "''")}'`);
            }
            
            // Boolean filters
            if (filters.nsfasAccredited === true) {
                filterConditions.push(`nsfasAccredited eq true`);
            }
            
            if (filters.accommodationAvailable === true) {
                filterConditions.push(`accommodationAvailable eq true`);
            }
            
            if (filters.bachelorPassRequired === true) {
                filterConditions.push(`bachelorPassRequired eq true`);
            }
            
            // Apply filters to search options
            if (filterConditions.length > 0) {
                searchOptions.filter = filterConditions.join(' and ');
                console.log('Applied filters:', searchOptions.filter);
            }
            
            // Perform the search
            let searchResults;
            try {
                searchResults = await this.searchClient.search(query === '*' ? '' : query, searchOptions);
            } catch (searchError) {
                console.error('Azure Search error:', searchError);
                
                // Fallback: try search without filters if filtered search fails
                if (searchOptions.filter) {
                    console.log('Retrying search without filters...');
                    delete searchOptions.filter;
                    searchResults = await this.searchClient.search(query === '*' ? '' : query, searchOptions);
                } else {
                    throw searchError;
                }
            }
            
            // Collect results
            const results = [];
            for await (const result of searchResults.results) {
                // Ensure all expected fields are present
                const university = {
                    id: result.document.id || `temp_${Date.now()}_${Math.random()}`,
                    universityName: result.document.universityName || result.document.fileName || 'Unknown University',
                    location: result.document.location || 'Not specified',
                    province: result.document.province || 'Not specified',
                    universityType: result.document.universityType || 'Traditional',
                    apsScoreRequired: result.document.apsScoreRequired,
                    tuitionFeesAnnual: result.document.tuitionFeesAnnual,
                    establishmentYear: result.document.establishmentYear,
                    studentPopulation: result.document.studentPopulation,
                    applicationDeadline: result.document.applicationDeadline,
                    nsfasAccredited: result.document.nsfasAccredited || false,
                    accommodationAvailable: result.document.accommodationAvailable || false,
                    bursariesAvailable: result.document.bursariesAvailable || false,
                    bachelorPassRequired: result.document.bachelorPassRequired || false,
                    languageMedium: result.document.languageMedium || 'English',
                    // Keep original document fields
                    content: result.document.content,
                    summary: result.document.summary,
                    keyPhrases: result.document.keyPhrases || [],
                    uploadDate: result.document.uploadDate
                };
                
                results.push(university);
            }
            
            console.log(`Search completed: ${results.length} results found`);
            return results;
            
        } catch (error) {
            console.error('Search service error:', error);
            
            // Return sample data for development if search fails
            if (process.env.NODE_ENV === 'development') {
                console.log('Returning sample data for development...');
                return this.getSampleUniversities(filters, top);
            }
            
            throw error;
        }
    }
    /**
     * Utility methods
     */
    generateDocumentId(fileName) {
        return fileName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    }
    
    extractUniversityName(text) {
        // Simple extraction - improve with NLP
        const universities = [
            'University of Cape Town', 'University of the Witwatersrand',
            'Stellenbosch University', 'University of Pretoria',
            'University of KwaZulu-Natal', 'Rhodes University'
        ];
        
        for (const uni of universities) {
            if (text.includes(uni)) {
                return uni;
            }
        }
        
        return 'Unknown University';
    }

    async getById(id) {
        try {
            console.log('SearchService.getById called with:', id);
            
            // Temporarily use sample data until Azure Search is populated
            const sampleData = this.getSampleUniversities();
            const result = sampleData.find(university => university.id === id);
            
            console.log(`Found result for ${id}:`, result ? 'Yes' : 'No');
            return result || null;
            
        } catch (error) {
            console.error(`SearchService.getById error for ID ${id}:`, error);
            throw error;
        }
    }
    /**
     * Get all indexed documents
     */
    async getAllDocuments() {
        return this.search('*', {}, 100);
    }
    
    /**
     * Delete a document from the index
     */
    async deleteDocument(documentId) {
        try {
            const result = await this.searchClient.deleteDocuments([{ id: documentId }]);
            return result.results[0].succeeded;
        } catch (error) {
            console.error('❌ Delete document error:', error);
            throw error;
        }
    }
    
    /**
     * Upload a single document (for AI chunks)
     */
    async uploadDocument(document) {
        try {
            const result = await this.searchClient.uploadDocuments([document]);
            return result.results[0].succeeded;
        } catch (error) {
            console.error('❌ Upload document error:', error);
            throw error;
        }
    }

    /**
     * Add university (for structured data) - keeping backward compatibility
     */
    async addUniversity(universityData) {
        try {
            // Ensure ID exists
            if (!universityData.id) {
                universityData.id = this.generateDocumentId(universityData.universityName);
            }
            
            const result = await this.searchClient.uploadDocuments([universityData]);
            return result.results[0].succeeded;
        } catch (error) {
            console.error('❌ Add university error:', error);
            throw error;
        }
    }

    /**
     * Get suggestions based on user input
     */
    async getSuggestions(query) {
        try {
            const suggestions = await this.searchClient.suggest(query, 'sg', {
                top: 5,
                select: ['fileName', 'universityName']
            });
            
            return suggestions.results.map(s => ({
                text: s.text,
                document: s.document
            }));
        } catch (error) {
            console.error('❌ Suggestions error:', error);
            return [];
        }
    }
}

module.exports = SearchService;