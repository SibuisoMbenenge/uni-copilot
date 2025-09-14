/**
 * University Co-Pilot Backend Server - Enhanced AI Version
 * Main Express application with full AI integration
 */
//server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Import services - UPDATED IMPORTS
const PDFContextSearchService = require('./services/searchService'); // Your enhanced search service
const EnhancedUniversityProcessor = require('./services/pdfProcessor'); // Your enhanced PDF processor
const ComparisonService = require('./services/comparisonService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services with proper error handling
let searchService;
let pdfProcessor;
let comparisonService;

try {
    console.log('🔧 Initializing PDF-Context SearchService...');
    searchService = new PDFContextSearchService();
    console.log('✅ PDF-Context SearchService initialized');
} catch (error) {
    console.error('❌ Failed to initialize PDF-Context SearchService:', error.message);
    searchService = null;
}

try {
    console.log('🔧 Initializing Enhanced PDF Processor...');
    pdfProcessor = new EnhancedUniversityProcessor();
    console.log('✅ Enhanced PDF Processor initialized');
} catch (error) {
    console.error('❌ Failed to initialize Enhanced PDF Processor:', error.message);
    pdfProcessor = null;
}

try {
    comparisonService = new ComparisonService();
    console.log('✅ ComparisonService initialized');
} catch (error) {
    console.error('❌ Failed to initialize ComparisonService:', error.message);
    comparisonService = null;
}

// Auto-initialize PDFs function
async function initializePDFs() {
    try {
        if (pdfProcessor && pdfProcessor.processAllPDFs) {
            console.log('🚀 Starting enhanced PDF processing with full AI capabilities...');
            const result = await pdfProcessor.processAllPDFs();
            console.log(`✅ Processed ${result.structuredCount} universities and ${result.aiDocCount} AI-enhanced document chunks`);
            
            // Test the enhanced AI search functionality
            console.log('🧪 Testing Enhanced AI Search...');
            await pdfProcessor.testAISearch('What are the admission requirements for computer science programs?');
        }
    } catch (error) {
        console.error('❌ Failed to process PDFs on startup:', error.message);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'University Co-Pilot API with Enhanced AI',
        services: {
            searchService: !!searchService,
            pdfProcessor: !!pdfProcessor,
            comparisonService: !!comparisonService
        }
    });
});

// Enhanced AI Ask endpoint
app.post('/api/ask', async (req, res) => {
    try {
        const { question } = req.body;
        
        // Validate input
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Question is required and must be a non-empty string'
            });
        }
        
        // Check if question is too long
        if (question.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Question is too long. Please keep it under 1000 characters.'
            });
        }
        
        console.log('AI question received:', question);
        
        // Check if search service is available
        if (!searchService) {
            console.log('SearchService unavailable, providing fallback response');
            return res.json({
                success: true,
                data: {
                    answer: `I understand you're asking about "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}". Currently, our AI search service is initializing. For the most accurate information about South African universities, I recommend checking official university websites or contacting their admissions offices directly.`,
                    sources: [{
                        fileName: 'Fallback Response',
                        universityName: 'General Information',
                        relevantContent: 'Please check official university websites for current information.'
                    }],
                    searchType: 'fallback'
                }
            });
        }
        
        // Perform enhanced AI search with timeout
        const searchPromise = searchService.searchWithAI(question.trim(), { top: 5 });
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
        );
        
        const aiResult = await Promise.race([searchPromise, timeoutPromise]);
        
        // Enhanced response format with additional metadata
        const response = {
            success: true,
            data: {
                answer: aiResult.answer || 'I apologize, but I could not generate a response at this time.',
                sources: aiResult.sources || [],
                searchType: aiResult.searchType || 'unknown',
                metadata: {
                    documentsSearched: aiResult.documentsSearched || 0,
                    relevantDocuments: aiResult.relevantDocuments || 0,
                    searchSuccess: aiResult.success || false
                }
            }
        };
        
        console.log('Enhanced AI search completed successfully');
        res.json(response);
        
    } catch (error) {
        console.error('Error in /api/ask route:', error);
        
        // Determine error type and provide appropriate response
        let errorMessage = 'An error occurred while processing your question.';
        let statusCode = 500;
        
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            errorMessage = 'The request timed out. Please try again.';
            statusCode = 408;
        } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Unable to connect to AI services. Please try again later.';
            statusCode = 503;
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
            errorMessage = 'Service temporarily unavailable due to high demand. Please try again later.';
            statusCode = 429;
        }
        
        // Return error in the expected format
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Enhanced Search endpoint with AI capabilities
app.post('/api/search', async (req, res) => {
    try {
        const { 
            query = '*', 
            filters = {}, 
            pagination = { page: 1, limit: 20 },
            useAI = true // Default to TRUE for enhanced AI search
        } = req.body;
        
        const page = Math.max(1, parseInt(pagination.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 20));
        const skip = (page - 1) * limit;
        
        console.log('Enhanced search request:', { query, filters, pagination: { page, limit }, useAI });
        
        if (!searchService) {
            console.log('SearchService unavailable, returning empty results');
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page: page,
                    limit: limit,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                },
                message: 'Search service is currently initializing. Please try again in a moment.'
            });
        }
        
        let searchResults;
        let aiResponse = null;
        
        // Use enhanced AI search by default
        if (useAI && query && query !== '*' && query.length > 2) {
            try {
                console.log('Using enhanced AI-powered search...');
                const aiSearchResult = await searchService.searchWithAI(query, { top: limit + skip });
                
                // Transform AI results to API format
                searchResults = aiSearchResult.sources.map((source, index) => ({
                    id: source.fileName || `ai_${Date.now()}_${index}`,
                    universityName: source.universityName || 'Unknown University',
                    fileName: source.fileName,
                    location: 'South Africa',
                    province: 'Various',
                    universityType: 'Traditional',
                    apsScoreRequired: 30,
                    tuitionFeesAnnual: 50000,
                    content: source.relevantContent,
                    summary: source.relevantContent.substring(0, 200) + '...',
                    establishmentYear: 2000,
                    studentPopulation: 25000,
                    applicationDeadline: "30 September",
                    nsfasAccredited: true,
                    accommodationAvailable: true,
                    bursariesAvailable: true,
                    bachelorPassRequired: false,
                    languageMedium: "English",
                    // Enhanced metadata
                    searchScore: source.relevanceScore || 1,
                    documentType: 'pdf-context'
                }));
                
                aiResponse = aiSearchResult.answer;
                
            } catch (aiError) {
                console.error('AI search failed, falling back to regular search:', aiError);
                searchResults = await searchService.search(query, filters, limit + skip);
            }
        } else {
            // Use regular search
            searchResults = await searchService.search(query, filters, limit + skip);
        }
        
        // Apply enhanced filtering
        if (Object.keys(filters).length > 0) {
            searchResults = searchResults.filter(university => {
                if (filters.minAPS && university.apsScoreRequired < filters.minAPS) return false;
                if (filters.maxAPS && university.apsScoreRequired > filters.maxAPS) return false;
                if (filters.province && university.province !== filters.province) return false;
                if (filters.universityType && university.universityType !== filters.universityType) return false;
                if (filters.maxTuitionFees && university.tuitionFeesAnnual > filters.maxTuitionFees) return false;
                if (filters.languageMedium && university.languageMedium !== filters.languageMedium) return false;
                if (filters.nsfasAccredited === true && !university.nsfasAccredited) return false;
                if (filters.accommodationAvailable === true && !university.accommodationAvailable) return false;
                if (filters.bachelorPassRequired === true && !university.bachelorPassRequired) return false;
                
                return true;
            });
        }
        
        // Apply sorting with enhanced options
        const sortBy = filters.sortBy || 'searchScore';
        const sortOrder = filters.sortOrder || 'desc';
        
        searchResults.sort((a, b) => {
            let aVal, bVal;
            
            switch (sortBy) {
                case 'searchScore':
                    aVal = a.searchScore || 0;
                    bVal = b.searchScore || 0;
                    break;
                case 'universityName':
                    aVal = (a.universityName || '').toLowerCase();
                    bVal = (b.universityName || '').toLowerCase();
                    break;
                case 'apsScoreRequired':
                    aVal = a.apsScoreRequired || 0;
                    bVal = b.apsScoreRequired || 0;
                    break;
                case 'tuitionFeesAnnual':
                    aVal = a.tuitionFeesAnnual || 0;
                    bVal = b.tuitionFeesAnnual || 0;
                    break;
                default:
                    aVal = a.universityName || '';
                    bVal = b.universityName || '';
            }
            
            if (sortOrder === 'desc') {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            } else {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            }
        });
        
        // Apply pagination
        const totalResults = searchResults.length;
        const paginatedResults = searchResults.slice(skip, skip + limit);
        const totalPages = Math.ceil(totalResults / limit);
        
        const response = {
            success: true,
            data: paginatedResults,
            pagination: {
                page: page,
                limit: limit,
                total: totalResults,
                totalPages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            meta: {
                searchQuery: query,
                filtersApplied: Object.keys(filters).length > 0,
                sortBy: sortBy,
                sortOrder: sortOrder,
                aiEnabled: useAI,
                searchType: aiResponse ? 'enhanced-ai' : 'traditional',
                processingTime: Date.now() // Could track actual processing time
            },
            aiAnswer: aiResponse
        };
        
        console.log('Enhanced search response:', { 
            totalResults, 
            returnedResults: paginatedResults.length, 
            page, 
            totalPages,
            aiEnabled: !!aiResponse
        });
        
        res.json(response);
        
    } catch (error) {
        console.error('Enhanced search error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Enhanced PDF upload with better integration
app.post('/api/upload-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        if (!pdfProcessor) {
            return res.status(503).json({
                success: false,
                error: 'Enhanced PDF processing service is currently unavailable'
            });
        }

        console.log(`Processing uploaded PDF: ${req.file.originalname}`);

        // Process PDF with enhanced processor
        const extractedText = await pdfProcessor.processPDF(req.file.path);
        
        // Add to enhanced search service
        if (searchService) {
            const result = await searchService.addPDFDocument(req.file.originalname, extractedText);
            console.log(`Added PDF to search index: ${result.fileName} (${result.wordCount} words)`);
        }
        
        // Clean up uploaded file
        try {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path);
        } catch (cleanupError) {
            console.log(`Warning: Could not clean up temporary file: ${cleanupError.message}`);
        }
        
        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                extractedLength: extractedText.length,
                message: 'PDF uploaded and processed with enhanced AI capabilities',
                processingType: 'enhanced-ai'
            }
        });
    } catch (error) {
        console.error('Enhanced PDF upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// All other endpoints remain the same but with enhanced error messages
app.get('/api/universities', async (req, res) => {
    try {
        if (!searchService) {
            return res.status(503).json({
                success: false,
                error: 'Enhanced search service is currently unavailable'
            });
        }
        
        const { page = 1, limit = 50 } = req.query;
        const universities = await searchService.search('*', {}, parseInt(limit));
        
        res.json({
            success: true,
            data: universities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: universities.length,
                totalPages: Math.ceil(universities.length / parseInt(limit))
            },
            searchType: 'enhanced-ai'
        });
    } catch (error) {
        console.error('Get all universities error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/universities/:id', async (req, res) => {
    try {
        if (!searchService) {
            return res.status(503).json({
                success: false,
                error: 'Enhanced search service is currently unavailable'
            });
        }
        
        const universities = await searchService.search('*', {}, 100);
        const university = universities.find(u => u.id === req.params.id);
        
        if (!university) {
            return res.status(404).json({
                success: false,
                error: 'University not found'
            });
        }
        
        res.json({
            success: true,
            data: university,
            searchType: 'enhanced-ai'
        });
    } catch (error) {
        console.error('Get university error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/compare', async (req, res) => {
    try {
        const { universityIds } = req.body;
        
        if (!universityIds || universityIds.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Please select at least 2 universities to compare'
            });
        }
        
        if (!comparisonService) {
            return res.status(503).json({
                success: false,
                error: 'Comparison service is currently unavailable'
            });
        }
        
        const comparison = await comparisonService.compare(universityIds);

        //console.log('Comparison result:', comparison);
        
        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/profile', async (req, res) => {
    try {
        const profile = req.body;
        
        if (!profile.gpa || profile.gpa < 0 || profile.gpa > 4.0) {
            return res.status(400).json({
                success: false,
                error: 'Valid GPA (0.0-4.0) is required'
            });
        }
        
        const fs = require('fs').promises;
        const dataDir = path.join(__dirname, '../data');
        
        try {
            await fs.mkdir(dataDir, { recursive: true });
        } catch (err) {
            // Directory might already exist
        }
        
        await fs.writeFile(
            path.join(dataDir, 'student_profile.json'),
            JSON.stringify(profile, null, 2)
        );
        
        res.json({
            success: true,
            data: profile,
            message: 'Profile saved successfully'
        });
    } catch (error) {
        console.error('Profile save error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/pdfs', async (req, res) => {
    try {
        if (!searchService) {
            return res.status(503).json({ success: false, error: 'Enhanced search service unavailable' });
        }

        const summary = searchService.getPDFSummary();
        res.json({ 
            success: true, 
            data: summary,
            searchType: 'enhanced-ai'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/pdfs/:fileName', async (req, res) => {
    try {
        if (!searchService) {
            return res.status(503).json({ success: false, error: 'Enhanced search service unavailable' });
        }

        const removed = await searchService.removePDFDocument(req.params.fileName);
        
        if (removed) {
            res.json({ success: true, message: 'PDF document removed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'PDF document not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/profile', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const profilePath = path.join(__dirname, '../data/student_profile.json');
        
        try {
            const data = await fs.readFile(profilePath, 'utf8');
            const profile = JSON.parse(data);
            
            res.json({
                success: true,
                data: profile
            });
        } catch (err) {
            res.json({
                success: true,
                data: null,
                message: 'No profile found'
            });
        }
    } catch (error) {
        console.error('Profile get error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/suggestions', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.json({
                success: true,
                suggestions: []
            });
        }
        
        if (!searchService) {
            return res.json({
                success: true,
                suggestions: []
            });
        }
        
        const suggestions = await searchService.getSuggestions(q);
        
        res.json({
            success: true,
            suggestions: suggestions,
            searchType: 'enhanced-ai'
        });
    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/initialize', async (req, res) => {
    try {
        if (!searchService) {
            return res.status(503).json({
                success: false,
                error: 'Enhanced search service is currently unavailable'
            });
        }
        
        const summary = searchService.getPDFSummary();
        
        res.json({
            success: true,
            data: {
                universitiesLoaded: summary.totalDocuments,
                dataVersion: '2.0.0-enhanced',
                lastUpdated: new Date().toISOString(),
                enhancedFeatures: ['ai-search', 'pdf-context', 'chunked-documents']
            },
            message: 'Enhanced AI system initialized successfully'
        });
    } catch (error) {
        console.error('Initialize error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error in enhanced AI system',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Enhanced server startup
app.listen(PORT, async () => {
    console.log('🚀 University Co-Pilot Backend Server with Enhanced AI');
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log('📝 Available endpoints:');
    console.log('   POST /api/ask - Enhanced AI-powered questions');
    console.log('   POST /api/search - Enhanced AI search');
    console.log('   GET  /api/universities - Get all universities');
    console.log('   GET  /api/universities/:id - Get specific university');
    console.log('   POST /api/compare - Compare universities');
    console.log('   POST /api/upload-pdf - Upload & process PDFs with AI');
    console.log('   POST /api/profile - Save student profile');
    console.log('   GET  /api/profile - Get student profile');
    console.log('   GET  /health - Health check');
    console.log('   GET  /api/pdfs - PDF management');
    
    console.log('\n🔧 Enhanced Service Status:');
    console.log('   PDF-Context SearchService:', searchService ? '✅ Ready' : '❌ Failed');
    console.log('   Enhanced PDFProcessor:', pdfProcessor ? '✅ Ready' : '❌ Failed');
    console.log('   ComparisonService:', comparisonService ? '✅ Ready' : '❌ Failed');
    
    if (!searchService) {
        console.log('\n⚠️  Enhanced SearchService failed to initialize. Check your environment variables:');
        console.log('   AZURE_OPENAI_ENDPOINT');
        console.log('   AZURE_OPENAI_API_KEY');
        console.log('   AZURE_OPENAI_DEPLOYMENT_NAME');
        console.log('   The server will run with fallback responses.');
    } else {
        // Auto-process PDFs after server starts
        console.log('\n🤖 Initializing Enhanced AI Processing...');
        await initializePDFs();
    }
});